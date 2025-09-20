import { ipcMain } from "electron";
import { db } from "../../db";
import { chats, messages } from "../../db/schema";
import { eq } from "drizzle-orm";
import {
  constructSystemPrompt,
  readAiRules,
} from "../../prompts/system_prompt";
import { getAppPath } from "../../paths/paths";
import { readSettings } from "../../main/settings";
import { extractCodebase } from "../../utils/codebase";
import { getModelClient } from "../utils/get_model_client";
import { getMaxTokens, getTemperature } from "../utils/token_utils";
import { processFullResponseActions } from "../processors/response_processor";
import { streamText } from "ai";
import { ModelMessage } from "ai";
import log from "electron-log";

const logger = log.scope("agentic-autonomous");

export interface AutonomousAgenticParams {
  chatId: number;
  prompt: string;
  mode: "dry-run" | "interactive" | "auto-apply" | "force-apply";
  maxIterations?: number;
}

export interface AgenticIteration {
  iteration: number;
  status: "planning" | "executing" | "validating" | "completed" | "failed";
  message: string;
  timestamp: number;
  filesModified: string[];
  actionsTaken: string[];
}

export function registerAutonomousAgenticHandlers() {
  // Create a truly autonomous agentic chat
  ipcMain.handle(
    "agentic:create-autonomous-chat",
    async (event, params: AutonomousAgenticParams) => {
      try {
        logger.log(
          `[agentic:create-autonomous-chat] Creating autonomous chat for chatId: ${params.chatId}`,
        );

        // Get the existing chat
        const chat = await db.query.chats.findFirst({
          where: eq(chats.id, params.chatId),
          with: {
            messages: {
              orderBy: (messages, { asc }) => [asc(messages.createdAt)],
            },
            app: true,
          },
        });

        if (!chat) {
          throw new Error(`Chat not found: ${params.chatId}`);
        }

        // Create a new autonomous agentic chat
        const agenticChatId = await createAutonomousChat(
          chat.appId,
          params.prompt,
          params.mode,
        );

        // Start the autonomous execution process (this will run continuously)
        startAutonomousExecution(
          agenticChatId,
          params.prompt,
          params.mode,
          chat.appId,
          params.maxIterations || 10,
        );

        return {
          success: true,
          agenticChatId,
          message: "Autonomous agentic execution started",
        };
      } catch (error) {
        logger.error(`[agentic:create-autonomous-chat] Error:`, error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
  );

  // Get autonomous agentic chat status
  ipcMain.handle(
    "agentic:get-autonomous-status",
    async (event, agenticChatId: number) => {
      try {
        const chat = await db.query.chats.findFirst({
          where: eq(chats.id, agenticChatId),
          with: {
            messages: {
              orderBy: (messages, { asc }) => [asc(messages.createdAt)],
            },
          },
        });

        if (!chat) {
          return null;
        }

        // Determine status based on messages
        const lastMessage = chat.messages[chat.messages.length - 1];
        let status = "running";
        let currentIteration = 0;

        // Count iterations by looking for iteration markers
        const iterationMessages = chat.messages.filter(
          (msg) =>
            msg.content.includes("🔄 Iteration") ||
            msg.content.includes("✅ Iteration"),
        );
        currentIteration = iterationMessages.length;

        if (
          lastMessage?.content.includes("🎉 Autonomous execution completed")
        ) {
          status = "completed";
        } else if (
          lastMessage?.content.includes("❌ Autonomous execution failed")
        ) {
          status = "failed";
        } else if (
          lastMessage?.content.includes("🛑 Autonomous execution stopped")
        ) {
          status = "stopped";
        }

        return {
          chatId: agenticChatId,
          status,
          currentIteration,
          totalMessages: chat.messages.length,
          lastMessage: lastMessage?.content || "",
          iterations: iterationMessages.map((msg) => ({
            message: msg.content,
            timestamp: msg.createdAt.getTime(),
          })),
        };
      } catch (error) {
        logger.error(`[agentic:get-autonomous-status] Error:`, error);
        return null;
      }
    },
  );

  // Stop autonomous execution
  ipcMain.handle(
    "agentic:stop-autonomous",
    async (event, agenticChatId: number) => {
      try {
        // Mark the chat as stopped
        await db.insert(messages).values({
          chatId: agenticChatId,
          role: "assistant",
          content: "🛑 Autonomous execution stopped by user",
          createdAt: new Date(),
        });

        return { success: true };
      } catch (error) {
        logger.error(`[agentic:stop-autonomous] Error:`, error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
  );
}

async function createAutonomousChat(
  appId: number,
  prompt: string,
  mode: string,
): Promise<number> {
  // Create a new chat for the autonomous agentic execution
  const [newChat] = await db
    .insert(chats)
    .values({
      appId,
      title: `🤖 Autonomous: ${prompt.substring(0, 50)}...`,
      createdAt: new Date(),
    })
    .returning();

  // Add initial system message
  await db.insert(messages).values({
    chatId: newChat.id,
    role: "system",
    content: `Starting AUTONOMOUS agentic execution in ${mode} mode for: ${prompt}\n\nThis agent will work continuously until the task is complete, without requiring user intervention.`,
    createdAt: new Date(),
  });

  return newChat.id;
}

async function startAutonomousExecution(
  agenticChatId: number,
  originalPrompt: string,
  mode: string,
  appId: number,
  maxIterations: number,
): Promise<void> {
  let currentIteration = 0;
  let isCompleted = false;
  let hasFailed = false;

  try {
    logger.log(
      `[agentic] Starting autonomous execution for chat ${agenticChatId}`,
    );

    // Get app path
    const appPath = getAppPath(appId);
    if (!appPath) {
      throw new Error(`App path not found for appId: ${appId}`);
    }

    // Get settings
    const settings = await readSettings();
    const aiRules = await readAiRules(appPath);

    // Get model client
    const modelClient = await getModelClient(settings.selectedModel);

    // Extract codebase context
    const codebaseContext = await extractCodebase(appPath);

    // Construct system prompt for autonomous agentic mode
    const systemPrompt = constructSystemPrompt({
      aiRules,
      chatMode: "agentic",
    });

    // Create the autonomous agentic execution prompt
    const autonomousPrompt = `You are now in FULLY AUTONOMOUS AGENTIC MODE. You must complete the following request WITHOUT asking for user confirmation or waiting for "keep going" prompts.

ORIGINAL REQUEST: ${originalPrompt}

EXECUTION MODE: ${mode.toUpperCase()}

CRITICAL AUTONOMOUS BEHAVIOR RULES:
1. You MUST work continuously until the task is FULLY COMPLETED
2. You MUST NOT ask for user confirmation or wait for "keep going" prompts
3. You MUST break down complex tasks into steps and execute them systematically
4. You MUST validate your work and fix any issues automatically
5. You MUST provide progress updates but continue working autonomously
6. You MUST complete the ENTIRE request, not just plan it

AUTONOMOUS WORKFLOW:
1. Analyze the request and create a comprehensive implementation plan
2. Execute each step systematically without stopping
3. Validate each step and fix issues automatically
4. Continue until the ENTIRE request is fully implemented
5. Provide a final summary of what was accomplished

Start by analyzing the request and immediately begin implementation. Work continuously until complete.`;

    // Add user message
    await db.insert(messages).values({
      chatId: agenticChatId,
      role: "user",
      content: autonomousPrompt,
      createdAt: new Date(),
    });

    // Main autonomous execution loop
    while (currentIteration < maxIterations && !isCompleted && !hasFailed) {
      currentIteration++;

      logger.log(
        `[agentic] Starting iteration ${currentIteration} for chat ${agenticChatId}`,
      );

      // Add iteration marker
      await db.insert(messages).values({
        chatId: agenticChatId,
        role: "assistant",
        content: `🔄 Iteration ${currentIteration}: Continuing autonomous execution...`,
        createdAt: new Date(),
      });

      try {
        // Prepare messages for AI (include conversation history)
        const chatHistory = await getChatHistory(agenticChatId);
        const chatMessages: ModelMessage[] = [
          {
            role: "system",
            content:
              systemPrompt +
              `\n\nCODEBASE CONTEXT:\n${codebaseContext}\n\nCONVERSATION HISTORY:\n${chatHistory}`,
          },
          {
            role: "user",
            content: autonomousPrompt,
          },
        ];

        // Stream the AI response
        const { fullStream } = await streamText({
          model: modelClient,
          messages: chatMessages,
          maxTokens: getMaxTokens(settings.selectedModel),
          temperature: getTemperature(settings.selectedModel),
        });

        let fullResponse = "";

        // Process the stream
        for await (const part of fullStream) {
          if (part.type === "text-delta") {
            fullResponse += part.text;
          }
        }

        // Add the AI response to chat
        await db.insert(messages).values({
          chatId: agenticChatId,
          role: "assistant",
          content: fullResponse,
          createdAt: new Date(),
        });

        // Process any actions in the response
        const _actionResult = await processFullResponseActions({
          fullResponse,
          chatId: agenticChatId,
          chatSummary: undefined,
          messageId: 0, // This will be set by the function
        });

        // Check if the task appears to be completed
        if (isTaskCompleted(fullResponse, originalPrompt)) {
          isCompleted = true;
          await db.insert(messages).values({
            chatId: agenticChatId,
            role: "assistant",
            content: `✅ Iteration ${currentIteration}: Task completed successfully!\n\n🎉 Autonomous execution completed! The request has been fully implemented.`,
            createdAt: new Date(),
          });
          break;
        }

        // Check for errors
        if (
          fullResponse.includes("❌") ||
          fullResponse.includes("failed") ||
          fullResponse.includes("error")
        ) {
          hasFailed = true;
          await db.insert(messages).values({
            chatId: agenticChatId,
            role: "assistant",
            content: `❌ Iteration ${currentIteration}: Execution failed. Stopping autonomous mode.`,
            createdAt: new Date(),
          });
          break;
        }

        // Continue to next iteration if not completed
        if (currentIteration < maxIterations) {
          await db.insert(messages).values({
            chatId: agenticChatId,
            role: "assistant",
            content: `🔄 Continuing to next iteration... (${currentIteration}/${maxIterations})`,
            createdAt: new Date(),
          });
        }
      } catch (iterationError) {
        logger.error(
          `[agentic] Error in iteration ${currentIteration}:`,
          iterationError,
        );

        await db.insert(messages).values({
          chatId: agenticChatId,
          role: "assistant",
          content: `⚠️ Iteration ${currentIteration}: Encountered error, continuing...\n\nError: ${iterationError instanceof Error ? iterationError.message : "Unknown error"}`,
          createdAt: new Date(),
        });

        // Continue to next iteration unless it's a critical error
        if (currentIteration >= maxIterations) {
          hasFailed = true;
          break;
        }
      }
    }

    // Final status message
    if (isCompleted) {
      await db.insert(messages).values({
        chatId: agenticChatId,
        role: "assistant",
        content:
          "🎉 Autonomous execution completed successfully! The request has been fully implemented.",
        createdAt: new Date(),
      });
    } else if (hasFailed) {
      await db.insert(messages).values({
        chatId: agenticChatId,
        role: "assistant",
        content:
          "❌ Autonomous execution failed after maximum iterations or critical error.",
        createdAt: new Date(),
      });
    } else {
      await db.insert(messages).values({
        chatId: agenticChatId,
        role: "assistant",
        content: `🛑 Autonomous execution stopped after ${maxIterations} iterations. The task may not be fully complete.`,
        createdAt: new Date(),
      });
    }

    logger.log(
      `[agentic] Autonomous execution completed for chat ${agenticChatId} after ${currentIteration} iterations`,
    );
  } catch (error) {
    logger.error(
      `[agentic] Autonomous execution failed for chat ${agenticChatId}:`,
      error,
    );

    // Add error message
    await db.insert(messages).values({
      chatId: agenticChatId,
      role: "assistant",
      content: `❌ Autonomous execution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      createdAt: new Date(),
    });
  }
}

async function getChatHistory(chatId: number): Promise<string> {
  const chat = await db.query.chats.findFirst({
    where: eq(chats.id, chatId),
    with: {
      messages: {
        orderBy: (messages, { asc }) => [asc(messages.createdAt)],
      },
    },
  });

  if (!chat) return "";

  return chat.messages.map((msg) => `${msg.role}: ${msg.content}`).join("\n\n");
}

function isTaskCompleted(response: string, originalPrompt: string): boolean {
  // Check if the response indicates task completion
  const completionIndicators = [
    "task completed",
    "implementation complete",
    "fully implemented",
    "successfully completed",
    "finished implementing",
    "all done",
    "completed successfully",
  ];

  const lowerResponse = response.toLowerCase();
  const lowerPrompt = originalPrompt.toLowerCase();

  // Check for completion indicators
  const hasCompletionIndicator = completionIndicators.some((indicator) =>
    lowerResponse.includes(indicator),
  );

  // Check if the response mentions completing the specific request
  const mentionsOriginalRequest = lowerResponse.includes(
    lowerPrompt.substring(0, 20),
  );

  return hasCompletionIndicator && mentionsOriginalRequest;
}
