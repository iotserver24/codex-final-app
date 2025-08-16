import { db } from "../../db";
import { chats } from "../../db/schema";
import { eq } from "drizzle-orm";
import {
  constructSystemPrompt,
  readAiRules,
} from "../../prompts/system_prompt";
import {
  SUPABASE_AVAILABLE_SYSTEM_PROMPT,
  SUPABASE_NOT_AVAILABLE_SYSTEM_PROMPT,
} from "../../prompts/supabase_prompt";
import { getAppPath } from "../../paths/paths";
import log from "electron-log";
import { extractCodebase } from "../../utils/codebase";
import { getSupabaseContext } from "../../supabase_admin/supabase_context";

import { TokenCountParams, TokenCountResult } from "../ipc_types";
import { estimateTokens, getContextWindow } from "../utils/token_utils";
import { createLoggedHandler } from "./safe_handle";
import { validateChatContext } from "../utils/context_paths_utils";
import { readSettings } from "../../main/settings";

const logger = log.scope("token_count_handlers");

const handle = createLoggedHandler(logger);

export function registerTokenCountHandlers() {
  handle(
    "chat:count-tokens",
    async (event, req: TokenCountParams): Promise<TokenCountResult> => {
      const chat = await db.query.chats.findFirst({
        where: eq(chats.id, req.chatId),
        with: {
          messages: {
            orderBy: (messages, { asc }) => [asc(messages.createdAt)],
          },
          app: true,
        },
      });

      if (!chat) {
        throw new Error(`Chat not found: ${req.chatId}`);
      }

      // Prepare message history for token counting
      const messageHistory = chat.messages
        .map((message) => message.content)
        .join("");
      const messageHistoryTokens = estimateTokens(messageHistory);

      // Count input tokens
      const inputTokens = estimateTokens(req.input);

      const settings = readSettings();
      // Count system prompt tokens
      let systemPrompt = constructSystemPrompt({
        aiRules: await readAiRules(getAppPath(chat.app.path)),
        chatMode: settings.selectedChatMode,
      });
      // Designer provider removed; no extra prompt prefix
      let supabaseContext = "";

      if (chat.app?.supabaseProjectId) {
        systemPrompt += "\n\n" + SUPABASE_AVAILABLE_SYSTEM_PROMPT;
        try {
          supabaseContext = await getSupabaseContext({
            supabaseProjectId: chat.app.supabaseProjectId,
          });
        } catch (error) {
          logger.warn(
            `Failed to get Supabase context for project ${chat.app.supabaseProjectId}:`,
            error,
          );
          // Fall back to not available prompt if Supabase context fails
          systemPrompt = systemPrompt.replace(
            SUPABASE_AVAILABLE_SYSTEM_PROMPT,
            SUPABASE_NOT_AVAILABLE_SYSTEM_PROMPT,
          );
        }
      } else if (
        // Neon projects don't need Supabase.
        !chat.app?.neonProjectId
      ) {
        systemPrompt += "\n\n" + SUPABASE_NOT_AVAILABLE_SYSTEM_PROMPT;
      }

      const systemPromptTokens = estimateTokens(systemPrompt + supabaseContext);

      // Extract codebase information if app is associated with the chat
      let codebaseInfo = "";
      let codebaseTokens = 0;

      if (chat.app) {
        const appPath = getAppPath(chat.app.path);
        codebaseInfo = (
          await extractCodebase({
            appPath,
            chatContext: validateChatContext(chat.app.chatContext),
          })
        ).formattedOutput;
        codebaseTokens = estimateTokens(codebaseInfo);
        logger.log(
          `Extracted codebase information from ${appPath}, tokens: ${codebaseTokens}`,
        );
      }

      // Calculate total tokens
      const totalTokens =
        messageHistoryTokens +
        inputTokens +
        systemPromptTokens +
        codebaseTokens;

      return {
        totalTokens,
        messageHistoryTokens,
        codebaseTokens,
        inputTokens,
        systemPromptTokens,
        contextWindow: await getContextWindow(),
      };
    },
  );
}
