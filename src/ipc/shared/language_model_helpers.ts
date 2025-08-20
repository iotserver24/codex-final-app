import { db } from "@/db";
import {
  language_model_providers as languageModelProvidersSchema,
  language_models as languageModelsSchema,
} from "@/db/schema";
import type { LanguageModelProvider, LanguageModel } from "@/ipc/ipc_types";
import { eq } from "drizzle-orm";

export const PROVIDERS_THAT_SUPPORT_THINKING: (keyof typeof MODEL_OPTIONS)[] = [
  "google",
  "auto",
];

export interface ModelOption {
  name: string;
  displayName: string;
  description: string;
  temperature?: number;
  tag?: string;
  maxOutputTokens?: number;
  contextWindow?: number;
}

export const MODEL_OPTIONS: Record<string, ModelOption[]> = {
  openai: [
    // https://platform.openai.com/docs/models/gpt-5
    {
      name: "gpt-5",
      displayName: "GPT 5",
      description: "OpenAI's flagship model",
      // Technically it's 128k but OpenAI errors if you set max_tokens instead of max_completion_tokens
      maxOutputTokens: undefined,
      contextWindow: 400_000,
      // Requires temperature to be default value (1)
      temperature: 1,
    },
    // https://platform.openai.com/docs/models/gpt-5-mini
    {
      name: "gpt-5-mini",
      displayName: "GPT 5 Mini",
      description: "OpenAI's lightweight, but intelligent model",
      // Technically it's 128k but OpenAI errors if you set max_tokens instead of max_completion_tokens
      maxOutputTokens: undefined,
      contextWindow: 400_000,
      // Requires temperature to be default value (1)
      temperature: 1,
    },
    // https://platform.openai.com/docs/models/gpt-5-nano
    {
      name: "gpt-5-nano",
      displayName: "GPT 5 Nano",
      description: "Fastest, most cost-efficient version of GPT-5",
      // Technically it's 128k but OpenAI errors if you set max_tokens instead of max_completion_tokens
      maxOutputTokens: undefined,
      contextWindow: 400_000,
      // Requires temperature to be default value (1)
      temperature: 1,
    },
    // https://platform.openai.com/docs/models/gpt-4.1
    {
      name: "gpt-4.1",
      displayName: "GPT 4.1",
      description: "OpenAI's flagship model",
      maxOutputTokens: 32_768,
      contextWindow: 1_047_576,
      temperature: 0,
    },
    // https://platform.openai.com/docs/models/gpt-4.1-mini
    {
      name: "gpt-4.1-mini",
      displayName: "GPT 4.1 Mini",
      description: "OpenAI's lightweight, but intelligent model",
      maxOutputTokens: 32_768,
      contextWindow: 1_047_576,
      temperature: 0,
    },
    // https://platform.openai.com/docs/models/gpt-4.1-nano
    {
      name: "gpt-4.1-nano",
      displayName: "GPT 4.1 Nano",
      description: "OpenAI's most lightweight model",
      maxOutputTokens: 32_768,
      contextWindow: 1_047_576,
    },
    // https://platform.openai.com/docs/models/o3-mini
    {
      name: "o3-mini",
      displayName: "o3 mini",
      description: "Reasoning model",
      // See o4-mini comment below for why we set this to 32k
      maxOutputTokens: 32_000,
      contextWindow: 200_000,
      temperature: 0,
    },
    // https://platform.openai.com/docs/models/o4-mini
    {
      name: "o4-mini",
      displayName: "o4 mini",
      description: "Reasoning model",
      // Technically the max output tokens is 100k, *however* if the user has a lot of input tokens,
      // then setting a high max output token will cause the request to fail because
      // the max output tokens is *included* in the context window limit.
      maxOutputTokens: 32_000,
      contextWindow: 200_000,
      temperature: 0,
    },
  ],
  // https://docs.anthropic.com/en/docs/about-claude/models/all-models#model-comparison-table
  anthropic: [
    {
      name: "claude-sonnet-4-20250514",
      displayName: "Claude 4 Sonnet",
      description: "Excellent coder",
      // See comment below for Claude 3.7 Sonnet for why we set this to 16k
      maxOutputTokens: 16_000,
      contextWindow: 200_000,
      temperature: 0,
    },
    {
      name: "claude-3-7-sonnet-latest",
      displayName: "Claude 3.7 Sonnet",
      description: "Excellent coder",
      // Technically the max output tokens is 64k, *however* if the user has a lot of input tokens,
      // then setting a high max output token will cause the request to fail because
      // the max output tokens is *included* in the context window limit, see:
      // https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking#max-tokens-and-context-window-size-with-extended-thinking
      maxOutputTokens: 16_000,
      contextWindow: 200_000,
      temperature: 0,
    },
    {
      name: "claude-3-5-sonnet-20241022",
      displayName: "Claude 3.5 Sonnet",
      description: "Good coder, excellent at following instructions",
      maxOutputTokens: 8_000,
      contextWindow: 200_000,
      temperature: 0,
    },
    {
      name: "claude-3-5-haiku-20241022",
      displayName: "Claude 3.5 Haiku",
      description: "Lightweight coder",
      maxOutputTokens: 8_000,
      contextWindow: 200_000,
      temperature: 0,
    },
  ],
  google: [
    // https://ai.google.dev/gemini-api/docs/models#gemini-2.5-pro-preview-03-25
    {
      name: "gemini-2.5-pro",
      displayName: "Gemini 2.5 Pro",
      description: "Google's Gemini 2.5 Pro model",
      // See Flash 2.5 comment below (go 1 below just to be safe, even though it seems OK now).
      maxOutputTokens: 65_536 - 1,
      // Gemini context window = input token + output token
      contextWindow: 1_048_576,
      temperature: 0,
    },
    // https://ai.google.dev/gemini-api/docs/models#gemini-2.5-flash-preview
    {
      name: "gemini-2.5-flash",
      displayName: "Gemini 2.5 Flash",
      description: "Google's Gemini 2.5 Flash model (free tier available)",
      // Weirdly for Vertex AI, the output token limit is *exclusive* of the stated limit.
      maxOutputTokens: 65_536 - 1,
      // Gemini context window = input token + output token
      contextWindow: 1_048_576,
      temperature: 0,
    },
  ],
  openrouter: [
    {
      name: "qwen/qwen3-coder",
      displayName: "Qwen3 Coder",
      description: "Qwen's best coding model",
      maxOutputTokens: 32_000,
      contextWindow: 262_000,
      temperature: 0,
    },
    // https://openrouter.ai/deepseek/deepseek-chat-v3-0324:free
    {
      name: "deepseek/deepseek-chat-v3-0324:free",
      displayName: "DeepSeek v3 (free)",
      description: "Use for free (data may be used for training)",
      maxOutputTokens: 32_000,
      contextWindow: 128_000,
      temperature: 0,
    },
    // https://openrouter.ai/moonshotai/kimi-k2
    {
      name: "moonshotai/kimi-k2",
      displayName: "Kimi K2",
      description: "Powerful cost-effective model",
      maxOutputTokens: 32_000,
      contextWindow: 131_000,
      temperature: 0,
    },
    {
      name: "deepseek/deepseek-r1-0528",
      displayName: "DeepSeek R1",
      description: "Good reasoning model with excellent price for performance",
      maxOutputTokens: 32_000,
      contextWindow: 128_000,
      temperature: 0,
    },
  ],
  auto: [
    {
      name: "auto",
      displayName: "Auto",
      description: "Automatically selects the best model",
      tag: "Default",
      // These are below Gemini 2.5 Pro & Flash limits
      // which are the ones defaulted to for both regular auto
      // and smart auto.
      maxOutputTokens: 32_000,
      contextWindow: 1_000_000,
      temperature: 0,
    },
  ],
  codex: [
    {
      name: "claude",
      displayName: "Claude 3.5 Haiku",
      description: "Claude 3.5 Haiku (Bedrock)",
      maxOutputTokens: 8_000,
      contextWindow: 32_000,
    },
    {
      name: "deepseek-reasoning",
      displayName: "DeepSeek R1 0528",
      description: "DeepSeek R1 0528 (Bedrock)",
      tag: "Reasoning",
      maxOutputTokens: 10_000,
      contextWindow: 100_000,
    },
    {
      name: "gemini",
      displayName: "Gemini 2.5 Flash Lite",
      description: "Gemini 2.5 Flash Lite (api.navy)",
      maxOutputTokens: 8_000,
      contextWindow: 32_000,
    },
    {
      name: "glm",
      displayName: "GLM-4 9B Chat",
      description: "GLM-4 9B Chat (Intelligence.io)",
      maxOutputTokens: 8_000,
      contextWindow: 32_000,
    },
    {
      name: "gpt-5-nano",
      displayName: "GPT-5 Nano",
      description: "OpenAI GPT-5 Nano",
      maxOutputTokens: 16_000,
      contextWindow: 64_000,
    },
    {
      name: "llama-fast-roblox",
      displayName: "Llama 3.2 1B",
      description: "Llama 3.2 1B",
      maxOutputTokens: 4_000,
      contextWindow: 16_000,
    },
    {
      name: "llama-roblox",
      displayName: "Llama 3.1 8B Instruct",
      description: "Llama 3.1 8B Instruct (Nebius)",
      maxOutputTokens: 8_000,
      contextWindow: 32_000,
    },
    {
      name: "llamascout",
      displayName: "Llama 4 Scout 17B",
      description: "Llama 4 Scout 17B",
      maxOutputTokens: 8_000,
      contextWindow: 32_000,
    },
    {
      name: "mistral",
      displayName: "Mistral Small 3.1 24B",
      description: "Mistral Small 3.1 24B",
      maxOutputTokens: 16_000,
      contextWindow: 64_000,
    },
    {
      name: "mistral-nemo-roblox",
      displayName: "Mistral Nemo Instruct 2407",
      description: "Mistral Nemo Instruct 2407 (Nebius)",
      maxOutputTokens: 8_000,
      contextWindow: 32_000,
    },
    {
      name: "mistral-roblox",
      displayName: "Mistral Small 3.1 24B",
      description: "Mistral Small 3.1 24B",
      maxOutputTokens: 16_000,
      contextWindow: 64_000,
    },
    {
      name: "nova-fast",
      displayName: "Amazon Nova Micro",
      description: "Amazon Nova Micro (Bedrock)",
      maxOutputTokens: 8_000,
      contextWindow: 32_000,
    },
    {
      name: "openai",
      displayName: "GPT-4.1 Nano",
      description: "OpenAI GPT-4.1 Nano",
      maxOutputTokens: 16_000,
      contextWindow: 64_000,
    },
    // openai-audio intentionally omitted/ignored
    {
      name: "openai-fast",
      displayName: "GPT-4.1 Nano (Fast)",
      description: "OpenAI GPT-4.1 Nano",
      maxOutputTokens: 16_000,
      contextWindow: 64_000,
    },
    {
      name: "openai-large",
      displayName: "GPT-4.1",
      description: "OpenAI GPT-4.1",
      tag: "Premium",
      maxOutputTokens: 32_000,
      contextWindow: 128_000,
    },
    {
      name: "openai-reasoning",
      displayName: "OpenAI o3",
      description: "OpenAI o3 (api.navy)",
      tag: "Reasoning",
      maxOutputTokens: 8_000,
      contextWindow: 32_000,
    },
    {
      name: "openai-roblox",
      displayName: "GPT-4.1 Nano (Roblox)",
      description: "OpenAI GPT-4.1 Nano",
      maxOutputTokens: 16_000,
      contextWindow: 64_000,
    },
    {
      name: "qwen-coder",
      displayName: "Qwen 2.5 Coder 32B",
      description: "Qwen 2.5 Coder 32B",
      tag: "Coding",
      maxOutputTokens: 16_000,
      contextWindow: 64_000,
    },
    {
      name: "roblox-rp",
      displayName: "Roblox RP Multi-Model",
      description: "Roblox RP Multi-Model (Random Bedrock Selection)",
      maxOutputTokens: 8_000,
      contextWindow: 32_000,
    },
    {
      name: "bidara",
      displayName: "BIDARA",
      description:
        "BIDARA (Biomimetic Designer and Research Assistant by NASA)",
      tag: "Community",
      maxOutputTokens: 8_000,
      contextWindow: 32_000,
    },
    {
      name: "elixposearch",
      displayName: "Elixpo Search",
      description: "Elixpo Search",
      tag: "Community",
      maxOutputTokens: 8_000,
      contextWindow: 32_000,
    },
    {
      name: "evil",
      displayName: "Evil",
      description: "Evil",
      tag: "Community",
      maxOutputTokens: 8_000,
      contextWindow: 32_000,
    },
    {
      name: "hypnosis-tracy",
      displayName: "Hypnosis Tracy",
      description: "Hypnosis Tracy",
      tag: "Community",
      maxOutputTokens: 8_000,
      contextWindow: 32_000,
    },
    {
      name: "midijourney",
      displayName: "MIDIjourney",
      description: "MIDIjourney",
      tag: "Community",
      maxOutputTokens: 8_000,
      contextWindow: 32_000,
    },
    {
      name: "mirexa",
      displayName: "Mirexa AI Companion",
      description: "Mirexa AI Companion",
      tag: "Community",
      maxOutputTokens: 8_000,
      contextWindow: 32_000,
    },
    {
      name: "rtist",
      displayName: "Rtist",
      description: "Rtist",
      tag: "Community",
      maxOutputTokens: 8_000,
      contextWindow: 32_000,
    },
    {
      name: "sur",
      displayName: "Sur AI Assistant",
      description: "Sur AI Assistant",
      tag: "Community",
      maxOutputTokens: 8_000,
      contextWindow: 32_000,
    },
    {
      name: "unity",
      displayName: "Unity Unrestricted Agent",
      description: "Unity Unrestricted Agent",
      tag: "Community",
      maxOutputTokens: 8_000,
      contextWindow: 32_000,
    },
  ],
  // designer provider removed
};

export const PROVIDER_TO_ENV_VAR: Record<string, string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  google: "GEMINI_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
};

export const CLOUD_PROVIDERS: Record<
  string,
  {
    displayName: string;
    hasFreeTier?: boolean;
    websiteUrl?: string;
    gatewayPrefix: string;
  }
> = {
  openai: {
    displayName: "OpenAI",
    hasFreeTier: false,
    websiteUrl: "https://platform.openai.com/api-keys",
    gatewayPrefix: "",
  },
  anthropic: {
    displayName: "Anthropic",
    hasFreeTier: false,
    websiteUrl: "https://console.anthropic.com/settings/keys",
    gatewayPrefix: "anthropic/",
  },
  google: {
    displayName: "Google",
    hasFreeTier: true,
    websiteUrl: "https://aistudio.google.com/app/apikey",
    gatewayPrefix: "gemini/",
  },
  openrouter: {
    displayName: "OpenRouter",
    hasFreeTier: true,
    websiteUrl: "https://openrouter.ai/settings/keys",
    gatewayPrefix: "openrouter/",
  },
  auto: {
    displayName: "CodeX Auto",
    websiteUrl:
      "https://codex.anishkumar.tech/docs/guides/ai-models/pro-modes#smart-context",
    gatewayPrefix: "codex/",
  },
  codex: {
    displayName: "codeX",
    hasFreeTier: true,
    websiteUrl: "https://codex.anishkumar.tech",
    gatewayPrefix: "codex/",
  },
  designer: {
    displayName: "Designer",
    hasFreeTier: true,
    websiteUrl: "https://codex.anishkumar.tech",
    gatewayPrefix: "codex/",
  },
};

const LOCAL_PROVIDERS: Record<
  string,
  {
    displayName: string;
    hasFreeTier: boolean;
  }
> = {
  ollama: {
    displayName: "Ollama",
    hasFreeTier: true,
  },
  lmstudio: {
    displayName: "LM Studio",
    hasFreeTier: true,
  },
};

/**
 * Fetches language model providers from both the database (custom) and hardcoded constants (cloud),
 * merging them with custom providers taking precedence.
 * @returns A promise that resolves to an array of LanguageModelProvider objects.
 */
export async function getLanguageModelProviders(): Promise<
  LanguageModelProvider[]
> {
  // Fetch custom providers from the database
  const customProvidersDb = await db
    .select()
    .from(languageModelProvidersSchema);

  const customProvidersMap = new Map<string, LanguageModelProvider>();
  for (const cp of customProvidersDb) {
    customProvidersMap.set(cp.id, {
      id: cp.id,
      name: cp.name,
      apiBaseUrl: cp.api_base_url,
      envVarName: cp.env_var_name ?? undefined,
      type: "custom",
      // hasFreeTier, websiteUrl, gatewayPrefix are not in the custom DB schema
      // They will be undefined unless overridden by hardcoded values if IDs match
    });
  }

  // Get hardcoded cloud providers
  const hardcodedProviders: LanguageModelProvider[] = [];
  for (const providerKey in CLOUD_PROVIDERS) {
    if (Object.prototype.hasOwnProperty.call(CLOUD_PROVIDERS, providerKey)) {
      // Ensure providerKey is a key of PROVIDERS
      const key = providerKey as keyof typeof CLOUD_PROVIDERS;
      const providerDetails = CLOUD_PROVIDERS[key];
      if (providerDetails) {
        // Ensure providerDetails is not undefined
        hardcodedProviders.push({
          id: key,
          name: providerDetails.displayName,
          hasFreeTier: providerDetails.hasFreeTier,
          websiteUrl: providerDetails.websiteUrl,
          gatewayPrefix: providerDetails.gatewayPrefix,
          envVarName: PROVIDER_TO_ENV_VAR[key] ?? undefined,
          type: "cloud",
          // apiBaseUrl is not directly in PROVIDERS
        });
      }
    }
  }

  for (const providerKey in LOCAL_PROVIDERS) {
    if (Object.prototype.hasOwnProperty.call(LOCAL_PROVIDERS, providerKey)) {
      const key = providerKey as keyof typeof LOCAL_PROVIDERS;
      const providerDetails = LOCAL_PROVIDERS[key];
      hardcodedProviders.push({
        id: key,
        name: providerDetails.displayName,
        hasFreeTier: providerDetails.hasFreeTier,
        type: "local",
      });
    }
  }

  return [...hardcodedProviders, ...customProvidersMap.values()];
}

/**
 * Fetches language models for a specific provider.
 * @param obj An object containing the providerId.
 * @returns A promise that resolves to an array of LanguageModel objects.
 */
export async function getLanguageModels({
  providerId,
}: {
  providerId: string;
}): Promise<LanguageModel[]> {
  const allProviders = await getLanguageModelProviders();
  const provider = allProviders.find((p) => p.id === providerId);

  if (!provider) {
    console.warn(`Provider with ID "${providerId}" not found.`);
    return [];
  }

  // Get custom models from DB for all provider types
  let customModels: LanguageModel[] = [];

  try {
    const customModelsDb = await db
      .select({
        id: languageModelsSchema.id,
        displayName: languageModelsSchema.displayName,
        apiName: languageModelsSchema.apiName,
        description: languageModelsSchema.description,
        maxOutputTokens: languageModelsSchema.max_output_tokens,
        contextWindow: languageModelsSchema.context_window,
      })
      .from(languageModelsSchema)
      .where(
        isCustomProvider({ providerId })
          ? eq(languageModelsSchema.customProviderId, providerId)
          : eq(languageModelsSchema.builtinProviderId, providerId),
      );

    customModels = customModelsDb.map((model) => ({
      ...model,
      description: model.description ?? "",
      tag: undefined,
      maxOutputTokens: model.maxOutputTokens ?? undefined,
      contextWindow: model.contextWindow ?? undefined,
      type: "custom",
    }));
  } catch (error) {
    console.error(
      `Error fetching custom models for provider "${providerId}" from DB:`,
      error,
    );
    // Continue with empty custom models array
  }

  // If it's a cloud provider, also get the hardcoded models
  let hardcodedModels: LanguageModel[] = [];
  if (provider.type === "cloud") {
    // Special-case: fetch CodeX models dynamically from API
    if (providerId === "codex") {
      try {
        const remote = await fetchCodexModelsFromApi();
        if (remote.length > 0) {
          return [...remote, ...customModels];
        }
      } catch (error) {
        console.error("Failed to fetch CodeX models from API:", error);
        // fall back to hardcoded list below
      }
    }
    if (providerId in MODEL_OPTIONS) {
      const models = MODEL_OPTIONS[providerId] || [];
      hardcodedModels = models.map((model) => ({
        ...model,
        apiName: model.name,
        type: "cloud",
      }));
    } else {
      console.warn(
        `Provider "${providerId}" is cloud type but not found in MODEL_OPTIONS.`,
      );
    }
  }

  return [...hardcodedModels, ...customModels];
}

/**
 * Fetches all language models grouped by their provider IDs.
 * @returns A promise that resolves to a Record mapping provider IDs to arrays of LanguageModel objects.
 */
export async function getLanguageModelsByProviders(): Promise<
  Record<string, LanguageModel[]>
> {
  const providers = await getLanguageModelProviders();

  // Fetch all models concurrently
  const modelPromises = providers
    .filter((p) => p.type !== "local")
    .map(async (provider) => {
      const models = await getLanguageModels({ providerId: provider.id });
      return { providerId: provider.id, models };
    });

  // Wait for all requests to complete
  const results = await Promise.all(modelPromises);

  // Convert the array of results to a record
  const record: Record<string, LanguageModel[]> = {};
  for (const result of results) {
    record[result.providerId] = result.models;
  }

  return record;
}

export function isCustomProvider({ providerId }: { providerId: string }) {
  return providerId.startsWith(CUSTOM_PROVIDER_PREFIX);
}

export const CUSTOM_PROVIDER_PREFIX = "custom::";

// --- Helpers ---
async function fetchCodexModelsFromApi(): Promise<LanguageModel[]> {
  const url = "https://text.pollinations.ai/models";
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Fetch models failed: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as any[];
  if (!Array.isArray(data)) return [];

  const mapped: LanguageModel[] = data
    .filter((m) => typeof m?.name === "string")
    .map((m) => {
      const displayName: string = m.description || m.name;
      const tag: string | undefined = m.reasoning
        ? "Reasoning"
        : m.community
          ? "Community"
          : undefined;
      return {
        apiName: m.name as string,
        displayName,
        description: m.description || "",
        tag,
        maxOutputTokens: undefined,
        contextWindow: undefined,
        temperature: undefined,
        type: "cloud",
      } as LanguageModel;
    });
  // Filter out any models we do not want to expose (e.g., audio-only or disallowed)
  const BLOCKED_MODELS = new Set(["openai-audio"]);
  return mapped.filter((m) => !BLOCKED_MODELS.has(m.apiName));
}
