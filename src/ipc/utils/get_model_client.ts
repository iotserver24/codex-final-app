import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI as createGoogle } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createXai } from "@ai-sdk/xai";
import { createVertex as createGoogleVertex } from "@ai-sdk/google-vertex";
import { azure } from "@ai-sdk/azure";
import { LanguageModelV2 } from "@ai-sdk/provider";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import type {
  LargeLanguageModel,
  UserSettings,
  VertexProviderSetting,
} from "../../lib/schemas";
import { getEnvVar } from "./read_env";
import log from "electron-log";
import { FREE_OPENROUTER_MODEL_NAMES } from "../shared/language_model_constants";
import { getLanguageModelProviders } from "../shared/language_model_helpers";
import { LanguageModelProvider } from "../ipc_types";

import { FetchFunction } from "@ai-sdk/provider-utils";

import { LM_STUDIO_BASE_URL } from "./lm_studio_utils";
import { createOllamaProvider } from "./ollama_provider";
import { getOllamaApiUrl } from "../handlers/local_model_ollama_handler";
import { createFallback } from "./fallback_ai_model";

const _codexEngineUrl = process.env.CODEX_ENGINE_URL;
const _codexGatewayUrl = process.env.CODEX_GATEWAY_URL;

const AUTO_MODELS = [
  {
    provider: "google",
    name: "gemini-2.5-flash",
  },
  {
    provider: "openrouter",
    name: "qwen/qwen3-coder:free",
  },
  {
    provider: "anthropic",
    name: "claude-sonnet-4-20250514",
  },
  {
    provider: "openai",
    name: "gpt-4.1",
  },
];

export interface ModelClient {
  model: LanguageModelV2;
  builtinProviderId?: string;
}

const logger = log.scope("getModelClient");
export async function getModelClient(
  model: LargeLanguageModel,
  settings: UserSettings,
): Promise<{
  modelClient: ModelClient;
  isEngineEnabled?: boolean;
}> {
  const allProviders = await getLanguageModelProviders();

  const _codexApiKey = settings.providerSettings?.auto?.apiKey?.value;

  // --- Handle specific provider ---
  const providerConfig = allProviders.find((p) => p.id === model.provider);

  if (!providerConfig) {
    throw new Error(`Configuration not found for provider: ${model.provider}`);
  }

  // Handle codeX Pro override - now client-side only
  if (settings.enableCodexPro) {
    // CodeX Pro is now client-side and works with any provider
    const isEngineEnabled =
      settings.enableProSmartFilesContextMode ||
      settings.enableProLazyEditsMode;

    logger.info(
      `\x1b[1;97;44m Using client-side CodeX Pro for model: ${model.name}. engine_enabled=${isEngineEnabled} \x1b[0m`,
    );

    // Use the regular provider but with Pro features enabled
    const regularClientBundle = getRegularModelClient(
      model,
      settings,
      providerConfig,
    );

    if (isEngineEnabled) {
      logger.info(
        `\x1b[1;30;42m CodeX Pro features enabled: Smart Context & Lazy Edits \x1b[0m`,
      );
    }

    return {
      modelClient: regularClientBundle.modelClient,
      isEngineEnabled,
    };
  }
  // Handle 'auto' provider by trying each model in AUTO_MODELS until one works
  if (model.provider === "auto") {
    if (model.name === "free") {
      const openRouterProvider = allProviders.find(
        (p) => p.id === "openrouter",
      );
      if (!openRouterProvider) {
        throw new Error("OpenRouter provider not found");
      }
      return {
        modelClient: {
          model: createFallback({
            models: FREE_OPENROUTER_MODEL_NAMES.map(
              (name: string) =>
                getRegularModelClient(
                  { provider: "openrouter", name },
                  settings,
                  openRouterProvider,
                ).modelClient.model,
            ),
          }),
          builtinProviderId: "openrouter",
        },
        isEngineEnabled: false,
      };
    }
    for (const autoModel of AUTO_MODELS) {
      const providerInfo = allProviders.find(
        (p) => p.id === autoModel.provider,
      );
      const envVarName = providerInfo?.envVarName;

      const apiKey =
        settings.providerSettings?.[autoModel.provider]?.apiKey?.value ||
        (envVarName ? getEnvVar(envVarName) : undefined);

      if (apiKey) {
        logger.log(
          `Using provider: ${autoModel.provider} model: ${autoModel.name}`,
        );
        // Recursively call with the specific model found
        return await getModelClient(
          {
            provider: autoModel.provider,
            name: autoModel.name,
          },
          settings,
        );
      }
    }

    // No cloud API keys were found; fall back to free CodeX provider
    logger.warn(
      "No cloud API keys found for auto provider. Falling back to free CodeX provider.",
    );
    return await getModelClient(
      {
        provider: "codex",
        // Choose a sensible default free model (fast, lightweight)
        name: "openai-fast",
      },
      settings,
    );
  }
  const regularBundle = getRegularModelClient(model, settings, providerConfig);
  return { modelClient: regularBundle.modelClient };
}

function getRegularModelClient(
  model: LargeLanguageModel,
  settings: UserSettings,
  providerConfig: LanguageModelProvider,
): {
  modelClient: ModelClient;
  backupModelClients: ModelClient[];
} {
  // Get API key for the specific provider
  const apiKey =
    settings.providerSettings?.[model.provider]?.apiKey?.value ||
    (providerConfig.envVarName
      ? getEnvVar(providerConfig.envVarName)
      : undefined);

  const providerId = providerConfig.id;
  // Create client based on provider ID or type
  switch (providerId) {
    case "openai": {
      const provider = createOpenAI({ apiKey });
      return {
        modelClient: {
          model: provider.responses(model.name),
          builtinProviderId: providerId,
        },
        backupModelClients: [],
      };
    }
    case "anthropic": {
      const provider = createAnthropic({ apiKey });
      return {
        modelClient: {
          model: provider(model.name),
          builtinProviderId: providerId,
        },
        backupModelClients: [],
      };
    }
    case "xai": {
      const provider = createXai({ apiKey });
      return {
        modelClient: {
          model: provider(model.name),
          builtinProviderId: providerId,
        },
        backupModelClients: [],
      };
    }
    case "google": {
      const provider = createGoogle({ apiKey });
      return {
        modelClient: {
          model: provider(model.name),
          builtinProviderId: providerId,
        },
        backupModelClients: [],
      };
    }
    case "vertex": {
      // Vertex uses Google service account credentials with project/location
      const vertexSettings = settings.providerSettings?.[
        model.provider
      ] as VertexProviderSetting;
      const project = vertexSettings?.projectId;
      const location = vertexSettings?.location;
      const serviceAccountKey = vertexSettings?.serviceAccountKey?.value;

      // Use a baseURL that does NOT pin to publishers/google so that
      // full publisher model IDs (e.g. publishers/deepseek-ai/models/...) work.
      const regionHost = `${location === "global" ? "" : `${location}-`}aiplatform.googleapis.com`;
      const baseURL = `https://${regionHost}/v1/projects/${project}/locations/${location}`;
      const provider = createGoogleVertex({
        project,
        location,
        baseURL,
        googleAuthOptions: serviceAccountKey
          ? {
              // Expecting the user to paste the full JSON of the service account key
              credentials: JSON.parse(serviceAccountKey),
            }
          : undefined,
      });
      return {
        modelClient: {
          // For built-in Google models on Vertex, the path must include
          // publishers/google/models/<model>. For partner MaaS models the
          // full publisher path is already included.
          model: provider(
            model.name.includes("/")
              ? model.name
              : `publishers/google/models/${model.name}`,
          ),
          builtinProviderId: providerId,
        },
        backupModelClients: [],
      };
    }
    case "openrouter": {
      const provider = createOpenRouter({ apiKey });
      return {
        modelClient: {
          model: provider(model.name),
          builtinProviderId: providerId,
        },
        backupModelClients: [],
      };
    }
    case "azure": {
      // Check if we're in e2e testing mode
      const testAzureBaseUrl = getEnvVar("TEST_AZURE_BASE_URL");

      if (testAzureBaseUrl) {
        // Use fake server for e2e testing
        logger.info(`Using test Azure base URL: ${testAzureBaseUrl}`);
        const provider = createOpenAICompatible({
          name: "azure-test",
          baseURL: testAzureBaseUrl,
          apiKey: "fake-api-key-for-testing",
        });
        return {
          modelClient: {
            model: provider(model.name),
            builtinProviderId: providerId,
          },
          backupModelClients: [],
        };
      }

      // Azure OpenAI requires both API key and resource name as env vars
      // We use environment variables for Azure configuration
      const resourceName = getEnvVar("AZURE_RESOURCE_NAME");
      const azureApiKey = getEnvVar("AZURE_API_KEY");

      if (!resourceName) {
        throw new Error(
          "Azure OpenAI resource name is required. Please set the AZURE_RESOURCE_NAME environment variable.",
        );
      }

      if (!azureApiKey) {
        throw new Error(
          "Azure OpenAI API key is required. Please set the AZURE_API_KEY environment variable.",
        );
      }

      // Use the default Azure provider with environment variables
      // The azure provider automatically picks up AZURE_RESOURCE_NAME and AZURE_API_KEY
      return {
        modelClient: {
          model: azure(model.name),
          builtinProviderId: providerId,
        },
        backupModelClients: [],
      };
    }
    case "ollama": {
      const provider = createOllamaProvider({ baseURL: getOllamaApiUrl() });
      return {
        modelClient: {
          model: provider(model.name),
          builtinProviderId: providerId,
        },
        backupModelClients: [],
      };
    }
    case "lmstudio": {
      // LM Studio uses OpenAI compatible API
      const baseURL = providerConfig.apiBaseUrl || LM_STUDIO_BASE_URL + "/v1";
      const provider = createOpenAICompatible({
        name: "lmstudio",
        baseURL,
      });
      return {
        modelClient: {
          model: provider(model.name),
        },
        backupModelClients: [],
      };
    }
    case "codex": {
      // Hardcoded token for Pollinations API
      const hardcodedToken = "uNoesre5jXDzjhiY";

      // Based on the error, we need to modify how we create the provider
      // Use custom fetch function to properly add the token
      const fetchWithToken: FetchFunction = (url, options = {}) => {
        // Convert URL to string if it's not already
        const urlStr = url.toString();

        // Ensure we're using the correct URL with token parameter
        const finalUrl = urlStr.includes("?")
          ? `${urlStr}&token=${hardcodedToken}`
          : `${urlStr}?token=${hardcodedToken}`;

        // Set Authorization header with Bearer token
        const headers = new Headers(options.headers);
        headers.set("Authorization", `Bearer ${hardcodedToken}`);

        // Return fetch with both token in URL and Authorization header
        return fetch(finalUrl, {
          ...options,
          headers,
        });
      };

      const provider = createOpenAICompatible({
        name: "codex",
        baseURL: "https://text.pollinations.ai/openai",
        fetch: fetchWithToken,
      });

      return {
        modelClient: {
          model: provider(model.name),
          builtinProviderId: providerId,
        },
        backupModelClients: [],
      };
    }
    case "bedrock": {
      // AWS Bedrock supports API key authentication using AWS_BEARER_TOKEN_BEDROCK
      // See: https://sdk.vercel.ai/providers/ai-sdk-providers/amazon-bedrock#api-key-authentication
      const provider = createAmazonBedrock({
        apiKey: apiKey,
        region: getEnvVar("AWS_REGION") || "us-east-1",
      });
      return {
        modelClient: {
          model: provider(model.name),
          builtinProviderId: providerId,
        },
        backupModelClients: [],
      };
    }
    default: {
      // Handle custom providers
      if (providerConfig.type === "custom") {
        if (!providerConfig.apiBaseUrl) {
          throw new Error(
            `Custom provider ${model.provider} is missing the API Base URL.`,
          );
        }
        // Assume custom providers are OpenAI compatible for now
        const provider = createOpenAICompatible({
          name: providerConfig.id,
          baseURL: providerConfig.apiBaseUrl,
          apiKey,
        });
        return {
          modelClient: {
            model: provider(model.name),
          },
          backupModelClients: [],
        };
      }
      // If it's not a known ID and not type 'custom', it's unsupported
      throw new Error(`Unsupported model provider: ${model.provider}`);
    }
  }
}
