import { db } from "../../db";
import { docsChunks } from "../../db/schema";
import { eq, isNull } from "drizzle-orm";
import log from "electron-log";
import { readSettings } from "../../main/settings";

export interface EmbeddingProvider {
  generateEmbeddings(texts: string[]): Promise<number[][]>;
}

// OpenAI-compatible embedding provider
export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private apiKey: string;
  private apiUrl: string;
  private model: string;

  constructor(
    apiKey: string,
    apiUrl = "https://api.openai.com/v1",
    model = "text-embedding-3-small",
  ) {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
    this.model = model;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const response = await fetch(`${this.apiUrl}/embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          input: texts,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Embedding API error: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();
      return data.data.map((item: { embedding: number[] }) => item.embedding);
    } catch (error) {
      log.error("Error generating embeddings:", error);
      throw error;
    }
  }
}

// Pollinations does not provide embeddings API - removed broken implementation

export class DocsEmbeddingService {
  private provider: EmbeddingProvider;

  constructor(provider?: EmbeddingProvider) {
    if (provider) {
      this.provider = provider;
    } else {
      // Default to auto-configured provider
      this.provider = this.createDefaultProvider();
    }
  }

  private createDefaultProvider(): EmbeddingProvider {
    try {
      const settings = readSettings();

      // Try to use configured OpenAI key
      const openaiKey = settings.providerSettings?.openai?.apiKey?.value;
      if (openaiKey) {
        return new OpenAIEmbeddingProvider(openaiKey);
      }

      // Try to use Azure OpenAI if configured
      // const azureKey = settings.providerSettings?.azure?.apiKey?.value;
      // For now, skip Azure integration as the settings structure may differ
      // TODO: Update when Azure settings structure is confirmed

      // No fallback available - Pollinations doesn't provide embeddings
      log.error(
        "No OpenAI API key found and no free embeddings provider available",
      );
      throw new Error(
        "OpenAI API key is required for embeddings. Please configure your API key in settings.",
      );
    } catch (error) {
      log.warn("Error reading settings:", error);
      throw new Error(
        "OpenAI API key is required for embeddings. Please configure your API key in settings.",
      );
    }
  }

  async generateEmbeddingsForSource(sourceId: number): Promise<void> {
    try {
      log.info(`Starting embedding generation for source ${sourceId}`);

      // Get all chunks without embeddings that belong to this source
      const chunks = await db.query.docsChunks.findMany({
        where: isNull(docsChunks.embedding),
        with: {
          page: true,
        },
      });

      // Filter chunks that belong to this source
      const sourceChunks = chunks.filter(
        (chunk) => chunk.page.sourceId === sourceId,
      );

      if (sourceChunks.length === 0) {
        log.info("No chunks need embedding generation");
        return;
      }

      log.info(`Generating embeddings for ${sourceChunks.length} chunks`);

      // Process in batches to avoid rate limits
      const batchSize = 100;
      for (let i = 0; i < sourceChunks.length; i += batchSize) {
        const batch = sourceChunks.slice(i, i + batchSize);

        try {
          const texts = batch.map((chunk) => chunk.content);
          const embeddings = await this.provider.generateEmbeddings(texts);

          // Update chunks with embeddings
          for (let j = 0; j < batch.length; j++) {
            const chunk = batch[j];
            const embedding = embeddings[j];

            await db
              .update(docsChunks)
              .set({
                embedding: JSON.stringify(embedding),
              })
              .where(eq(docsChunks.id, chunk.id));
          }

          log.info(
            `Processed embedding batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(sourceChunks.length / batchSize)}`,
          );

          // Small delay to be respectful to API
          if (i + batchSize < sourceChunks.length) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        } catch (error) {
          log.error(
            `Error processing batch ${Math.floor(i / batchSize) + 1}:`,
            error,
          );
          // Continue with next batch even if one fails
        }
      }

      log.info(`Embedding generation completed for source ${sourceId}`);
    } catch (error) {
      log.error("Error in generateEmbeddingsForSource:", error);
      throw error;
    }
  }

  async regenerateEmbeddings(sourceId: number): Promise<void> {
    try {
      // Clear existing embeddings
      await db
        .update(docsChunks)
        .set({ embedding: null })
        .where(eq(docsChunks.pageId, sourceId));

      // Generate new embeddings
      await this.generateEmbeddingsForSource(sourceId);
    } catch (error) {
      log.error("Error regenerating embeddings:", error);
      throw error;
    }
  }

  // Search for similar chunks using cosine similarity
  async searchSimilarChunks(
    query: string,
    sourceId?: number,
    limit = 10,
  ): Promise<
    Array<{
      id: number;
      content: string;
      similarity: number;
      url: string;
      title: string;
      chunkType: string;
      language?: string;
    }>
  > {
    try {
      // Try vector search
      const [queryEmbedding] = await this.provider.generateEmbeddings([query]);

      const chunks = await db.query.docsChunks.findMany({
        where: (chunks, { isNotNull, and }) => and(isNotNull(chunks.embedding)),
        with: { page: { columns: { url: true, title: true, sourceId: true } } },
      });

      const filteredChunks = sourceId
        ? chunks.filter((chunk) => chunk.page.sourceId === sourceId)
        : chunks;

      const results = filteredChunks
        .map((chunk) => {
          if (!chunk.embedding) return null;
          try {
            const embedding = JSON.parse(chunk.embedding);
            const similarity = this.cosineSimilarity(queryEmbedding, embedding);
            return {
              id: chunk.id,
              content: chunk.content,
              similarity,
              url: chunk.page.url,
              title: chunk.page.title || "Untitled",
              chunkType: chunk.chunkType,
              language: chunk.language || undefined,
            };
          } catch {
            return null;
          }
        })
        .filter((r): r is NonNullable<typeof r> => r !== null)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      return results;
    } catch (error) {
      // Fallback: keyword search when embedding provider fails (e.g., 404)
      log.warn(
        "Embedding provider failed; falling back to keyword search:",
        error,
      );

      const chunks = await db.query.docsChunks.findMany({
        with: { page: { columns: { url: true, title: true, sourceId: true } } },
      });

      const filtered = sourceId
        ? chunks.filter((c) => c.page.sourceId === sourceId)
        : chunks;

      const q = query.toLowerCase();
      const terms = q.split(/\s+/).filter(Boolean);

      const scored = filtered
        .map((c) => {
          const text = c.content.toLowerCase();
          let score = 0;
          for (const t of terms) {
            if (!t) continue;
            // simple term frequency weight
            const matches = text.split(t).length - 1;
            score += matches;
          }
          // boost title match
          const title = (c.page.title || "").toLowerCase();
          for (const t of terms) if (title.includes(t)) score += 2;
          if (score <= 0) return null;
          return {
            id: c.id,
            content: c.content,
            similarity: Math.min(1, score / 10),
            url: c.page.url,
            title: c.page.title || "Untitled",
            chunkType: c.chunkType,
            language: c.language || undefined,
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      return scored;
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error("Vectors must have the same length");
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
