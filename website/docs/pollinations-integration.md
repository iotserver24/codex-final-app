---
id: pollinations-integration
title: Pollinations Integration (Usage Map)
sidebar_label: Pollinations Integration
---

This document maps where and how Pollinations AI is used in the codebase, to help you build a wrapper and maintain the integration.

## Overview

- **Services used**:
  - Text generation via OpenAI-compatible endpoint: `https://text.pollinations.ai/openai`
  - Model catalog: `https://text.pollinations.ai/models`
  - Embeddings: `https://text.pollinations.ai/embeddings`
  - Simple prompt endpoint: `https://text.pollinations.ai/{encodedPrompt}`
- **Provider key/name in app**: `codex` (treated as a cloud provider)
- **Auth**:
  - A hardcoded token is appended as `?token=...` and also sent as `Authorization: Bearer ...` for OpenAI-compatible calls.
  - Embeddings and simple prompt endpoints are used without auth.
- **Caching**:
  - Pollinations models are cached in-memory with a 1-hour TTL.

## Code Locations

### 1) Model Client (Chat/Completions)

- File: `src/ipc/utils/get_model_client.ts`
- Case: provider id `"codex"`
- What it does:
  - Creates an OpenAI-compatible client pointing to `https://text.pollinations.ai/openai`.
  - Injects a hardcoded token both as URL param `token` and `Authorization: Bearer` header via a custom `fetch`.
- Key snippet:

```428:466:src/ipc/utils/get_model_client.ts
    case "codex": {
      // Hardcoded token for Pollinations API
      const hardcodedToken = "uNoesre5jXDzjhiY";
      const fetchWithToken: FetchFunction = (url, options = {}) => {
        const urlStr = url.toString();
        const finalUrl = urlStr.includes("?")
          ? `${urlStr}&token=${hardcodedToken}`
          : `${urlStr}?token=${hardcodedToken}`;
        const headers = new Headers(options.headers);
        headers.set("Authorization", `Bearer ${hardcodedToken}`);
        return fetch(finalUrl, { ...options, headers });
      };
      const provider = createOpenAICompatible({
        name: "codex",
        baseURL: "https://text.pollinations.ai/openai",
        fetch: fetchWithToken,
      });
      return { modelClient: { model: provider(model.name), builtinProviderId: providerId }, backupModelClients: [] };
    }
```

### 2) Dynamic Model List (UI/Settings)

- Files:
  - `src/ipc/shared/language_model_constants.ts`
  - `src/ipc/shared/language_model_constants_fixed.ts`
  - `src/ipc/shared/pollinations_models.ts`
- What it does:
  - Fetches available models from `https://text.pollinations.ai/models`.
  - Converts response into internal `ModelOption` items.
  - Caches the results for ~1 hour.
- Key snippets:

```46:56:src/ipc/shared/language_model_constants.ts
export async function fetchPollinationsModels(): Promise<PollinationsModel[]> {
  try {
    const response = await fetch("https://text.pollinations.ai/models");
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching Pollinations models:", error);
    return [];
  }
}
```

```11:23:src/ipc/shared/pollinations_models.ts
export async function getPollinationsModels(): Promise<ModelOption[]> {
  const now = Date.now();
  try {
    const pollinationsModels = await fetchPollinationsModels();
    cachedModels = pollinationsModels.map(
      convertPollinationsModelToModelOption,
    );
    lastFetchedAt = now;
    return cachedModels;
  } catch (error) {
    console.error("Failed to fetch Pollinations models:", error);
    return cachedModels ?? [];
  }
}
```

- Usage:
  - `src/ipc/shared/language_model_helpers.ts` pulls from `getPollinationsModels()` when provider id is `codex` to populate model selections.

```137:158:src/ipc/shared/language_model_helpers.ts
if (provider.type === "cloud") {
  if (providerId === "codex") {
    try {
      const pollinationsModels = await getPollinationsModels();
      const codexModels: LanguageModel[] = pollinationsModels.map((model) => ({
        id: model.name,
        label: model.label,
        provider: providerId,
        supportsSystemMessages: model.supportsSystemMessages,
      }));
      cloudProvider.models.push(...codexModels);
    } catch (error) {
      console.error("Failed to fetch CodeX models from Pollinations API:", error);
    }
  }
}
```

### 3) Embeddings (Docs Indexing)

- File: `src/ipc/services/docs_embedding.ts`
- What it does:
  - Provides `PollinationsEmbeddingProvider` as a free fallback when no OpenAI key is configured.
  - Calls `POST https://text.pollinations.ai/embeddings` for each text.
  - Tries with body `{ input, model: "text-embedding-3-small" }`, and on failure retries without `model`.
- Key snippet:

```56:106:src/ipc/services/docs_embedding.ts
export class PollinationsEmbeddingProvider implements EmbeddingProvider {
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const embeddings: number[][] = [];
      for (const text of texts) {
        let response = await fetch("https://text.pollinations.ai/embeddings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: text, model: "text-embedding-3-small" }),
        });
        if (!response.ok) {
          const status = response.status;
          log.warn(`Pollinations with model failed (${status}). Retrying without model...`);
          response = await fetch("https://text.pollinations.ai/embeddings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ input: text }),
          });
        }
        if (!response.ok) {
          throw new Error(`Pollinations API error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        embeddings.push(data.embedding || data.data?.[0]?.embedding);
      }
      return embeddings;
    } catch (error) {
      log.error("Error generating embeddings with Pollinations:", error);
      throw error;
    }
  }
}
```

- Provider selection fallback:

```135:141:src/ipc/services/docs_embedding.ts
// Fallback to Pollinations (free)
log.info("No OpenAI API key found, using Pollinations for embeddings");
return new PollinationsEmbeddingProvider();
```

### 4) Simple Prompt GET Endpoint

- File: `src/ipc/handlers/language_model_handlers.ts`
- What it does:
  - For a specific utility, builds a URL `https://text.pollinations.ai/{encodeURIComponent(fullPrompt)}` and fetches the response directly.
- Key snippet:

```392:396:src/ipc/handlers/language_model_handlers.ts
const fullPrompt = `${instruction}\n${input}`;
const url = `https://text.pollinations.ai/${encodeURIComponent(fullPrompt)}`;
const res = await fetch(url);
```

## Error Handling

- Errors from Pollinations fetches are thrown and bubble to renderer via IPC, aligning with the app-wide pattern.
- Embeddings provider retries without `model` when the model parameter is not supported or returns non-OK.
- Model list failures return an empty array and log to console; UI should handle empty lists gracefully.

## Security Notes

- Token is currently hardcoded for the `codex` provider path and sent in both URL and `Authorization` header. If you are wrapping Pollinations, consider moving the token to a secure config path and not duplicating it.
- No token is used for `models`, `embeddings`, or simple prompt GETs.

## Wrapper Tips

- Reuse the OpenAI-compatible client pointed at `https://text.pollinations.ai/openai` for chat/completions. Ensure the token is attached via header; URL param may be optional depending on upstream requirements.
- For embeddings, support both request bodies and fallback without a `model` parameter.
- Cache models for at least ~1 hour to reduce latency and rate pressure.
- Surface clear errors from the main process so React Query can display them.
