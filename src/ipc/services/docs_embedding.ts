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
    apiUrl: string = "https://api.openai.com/v1",
    model: string = "text-embedding-3-small",
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
      return data.data.map((item: any) => item.embedding);
    } catch (error) {
      log.error("Error generating embeddings:", error);
      throw error;
    }
  }
}

// Pollinations embedding provider (free alternative)
export class PollinationsEmbeddingProvider implements EmbeddingProvider {
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const embeddings: number[][] = [];

      for (const text of texts) {
        const response = await fetch(
          "https://text.pollinations.ai/embeddings",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              input: text,
              model: "text-embedding-3-small",
            }),
          },
        );

        if (!response.ok) {
          throw new Error(
            `Pollinations API error: ${response.status} ${response.statusText}`,
          );
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

      // Fallback to Pollinations (free)
      log.info("No OpenAI API key found, using Pollinations for embeddings");
      return new PollinationsEmbeddingProvider();
    } catch (error) {
      log.warn("Error reading settings, using Pollinations:", error);
      return new PollinationsEmbeddingProvider();
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
    limit: number = 10,
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
      // Generate embedding for query
      const [queryEmbedding] = await this.provider.generateEmbeddings([query]);

      // Get all chunks with embeddings
      let chunksQuery = db.query.docsChunks.findMany({
        where: (chunks, { isNotNull, and }) => {
          const conditions = [isNotNull(chunks.embedding)];
          if (sourceId) {
            // We need to join with pages to filter by sourceId
            // For now, we'll get all chunks and filter in memory
          }
          return and(...conditions);
        },
        with: {
          page: {
            columns: {
              url: true,
              title: true,
              sourceId: true,
            },
          },
        },
      });

      const chunks = await chunksQuery;

      // Filter by sourceId if provided
      const filteredChunks = sourceId
        ? chunks.filter((chunk) => chunk.page.sourceId === sourceId)
        : chunks;

      // Calculate similarities
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
        .filter(
          (result): result is NonNullable<typeof result> => result !== null,
        )
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      return results;
    } catch (error) {
      log.error("Error searching similar chunks:", error);
      throw error;
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
