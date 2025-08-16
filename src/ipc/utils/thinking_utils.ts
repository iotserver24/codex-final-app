import { PROVIDERS_THAT_SUPPORT_THINKING } from "../shared/language_model_helpers";
import type { UserSettings } from "../../lib/schemas";

function getThinkingBudgetTokens(
  thinkingBudget?: "low" | "medium" | "high",
): number {
  switch (thinkingBudget) {
    case "low":
      return 1_000;
    case "medium":
      return 4_000;
    case "high":
      return -1;
    default:
      return 4_000; // Default to medium
  }
}

export function getExtraProviderOptions(
  providerId: string | undefined,
  settings: UserSettings,
): Record<string, any> {
  if (!providerId) {
    return {};
  }

  // Enable thinking for agentic mode regardless of provider
  if (settings.selectedChatMode === "agentic") {
    const budgetTokens = getThinkingBudgetTokens(settings?.thinkingBudget);
    return {
      thinking: {
        type: "enabled",
        include_thoughts: true,
        // -1 means dynamic thinking where model determines.
        // budget_tokens: 128, // minimum for Gemini Pro is 128
        budget_tokens: budgetTokens,
      },
    };
  }

  // Enable thinking only if provider supports it explicitly
  if (PROVIDERS_THAT_SUPPORT_THINKING.includes(providerId)) {
    const budgetTokens = getThinkingBudgetTokens(settings?.thinkingBudget);
    return {
      thinking: {
        type: "enabled",
        include_thoughts: true,
        // -1 means dynamic thinking where model determines.
        // budget_tokens: 128, // minimum for Gemini Pro is 128
        budget_tokens: budgetTokens,
      },
    };
  }
  return {};
}
