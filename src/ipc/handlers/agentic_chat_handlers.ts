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

const logger = log.scope("agentic-chat");

export interface AgenticChatParams {
  chatId: number;
  prompt: string;
  mode: "dry-run" | "interactive" | "auto-apply" | "force-apply";
}

export function registerAgenticChatHandlers() {
  // Create a new agentic chat that will use the existing chat system
  ipcMain.handle(
    "agentic:create-chat",
    async (event, params: AgenticChatParams) => {
      try {
        logger.log(
          `[agentic:create-chat] Creating agentic chat for chatId: ${params.chatId}`,
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

        // Create a new agentic chat that will handle the autonomous execution
        const agenticChatId = await createAgenticChat(
          chat.appId,
          params.prompt,
          params.mode,
        );

        // Start the agentic execution process
        await startAgenticExecution(
          agenticChatId,
          params.prompt,
          params.mode,
          chat.appId,
        );

        return {
          success: true,
          agenticChatId,
          message: "Agentic execution started",
        };
      } catch (error) {
        logger.error(`[agentic:create-chat] Error:`, error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
  );

  // Get agentic chat status
  ipcMain.handle(
    "agentic:get-chat-status",
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

        if (lastMessage?.content.includes("🎉 Agentic execution completed")) {
          status = "completed";
        } else if (
          lastMessage?.content.includes("❌ Agentic execution failed")
        ) {
          status = "failed";
        }

        return {
          chatId: agenticChatId,
          status,
          messages: chat.messages,
          lastMessage: lastMessage?.content || "",
        };
      } catch (error) {
        logger.error(`[agentic:get-chat-status] Error:`, error);
        return null;
      }
    },
  );
}

async function createAgenticChat(
  appId: number,
  prompt: string,
  mode: string,
): Promise<number> {
  // Create a new chat for the agentic execution
  const [newChat] = await db
    .insert(chats)
    .values({
      appId,
      title: `Agentic: ${prompt.substring(0, 50)}...`,
      createdAt: new Date(),
    })
    .returning();

  // Add initial system message
  await db.insert(messages).values({
    chatId: newChat.id,
    role: "system",
    content: `Starting agentic execution in ${mode} mode for: ${prompt}`,
    createdAt: new Date(),
  });

  return newChat.id;
}

async function startAgenticExecution(
  agenticChatId: number,
  prompt: string,
  mode: string,
  appId: number,
): Promise<void> {
  try {
    logger.log(`[agentic] Starting execution for chat ${agenticChatId}`);

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

    // Construct system prompt for agentic mode
    const systemPrompt = constructSystemPrompt({
      aiRules,
      chatMode: "agentic",
    });

    // Create the agentic execution prompt
    const agenticPrompt = `You are now in AGENTIC MODE. Execute the following request autonomously:

${prompt}

EXECUTION MODE: ${mode.toUpperCase()}

As an autonomous agent, you should:
1. Break down the request into logical steps
2. Implement each step systematically
3. Validate your work as you go
4. Continue until the request is fully completed
5. Provide a final summary of what was accomplished

Start by analyzing the request and creating an implementation plan, then execute it step by step.`;

    // Add user message
    await db.insert(messages).values({
      chatId: agenticChatId,
      role: "user",
      content: agenticPrompt,
      createdAt: new Date(),
    });

    // Create assistant message placeholder
    const [assistantMessage] = await db
      .insert(messages)
      .values({
        chatId: agenticChatId,
        role: "assistant",
        content: "",
        createdAt: new Date(),
      })
      .returning();

    // Prepare messages for AI
    const chatMessages: ModelMessage[] = [
      {
        role: "system",
        content: systemPrompt + `\n\nCODEBASE CONTEXT:\n${codebaseContext}`,
      },
      {
        role: "user",
        content: agenticPrompt,
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

        // Update the assistant message in real-time
        await db
          .update(messages)
          .set({ content: fullResponse })
          .where(eq(messages.id, assistantMessage.id));
      }
    }

    // Process any actions in the response
    await processFullResponseActions({
      fullResponse,
      appPath,
      chatId: agenticChatId,
      mode: mode as any,
    });

    // Add completion message
    await db.insert(messages).values({
      chatId: agenticChatId,
      role: "assistant",
      content: "🎉 Agentic execution completed successfully!",
      createdAt: new Date(),
    });

    logger.log(`[agentic] Execution completed for chat ${agenticChatId}`);
  } catch (error) {
    logger.error(
      `[agentic] Execution failed for chat ${agenticChatId}:`,
      error,
    );

    // Add error message
    await db.insert(messages).values({
      chatId: agenticChatId,
      role: "assistant",
      content: `❌ Agentic execution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      createdAt: new Date(),
    });
  }
}
