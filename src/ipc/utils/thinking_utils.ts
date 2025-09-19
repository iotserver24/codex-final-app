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

  // All providers now support thinking - apply thinking config to everyone
  const budgetTokens = getThinkingBudgetTokens(settings?.thinkingBudget);

  // Provider-specific configurations
  if (providerId === "openai") {
    return {
      reasoning_effort: "medium",
      thinking: {
        type: "enabled",
        include_thoughts: true,
        budget_tokens: budgetTokens,
      },
    };
  }

  // Default thinking configuration for all other providers
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
