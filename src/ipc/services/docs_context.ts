import { DocsEmbeddingService } from "./docs_embedding";
import { db } from "../../db";
import { docsSources } from "../../db/schema";
import { eq } from "drizzle-orm";
import log from "electron-log";

export interface DocsContextResult {
  relevantChunks: Array<{
    content: string;
    url: string;
    title: string;
    chunkType: "text" | "code";
    language?: string;
    similarity: number;
  }>;
  contextText: string;
  sourcesUsed: string[];
}

export class DocsContextService {
  private embeddingService: DocsEmbeddingService;

  constructor() {
    this.embeddingService = new DocsEmbeddingService();
  }

  /**
   * Get relevant documentation context for a user query
   */
  async getRelevantContext(
    query: string,
    options: {
      maxChunks?: number;
      minSimilarity?: number;
      includeCodeBlocks?: boolean;
      preferredSources?: number[];
    } = {},
  ): Promise<DocsContextResult> {
    const {
      maxChunks = 8,
      minSimilarity = 0.7,
      includeCodeBlocks = true,
      preferredSources = [],
    } = options;

    try {
      // Get all available sources
      const sources = await db.query.docsSources.findMany({
        where: eq(docsSources.status, "completed"),
      });

      if (sources.length === 0) {
        return {
          relevantChunks: [],
          contextText: "",
          sourcesUsed: [],
        };
      }

      // Search across all sources or preferred sources
      const searchPromises = (
        preferredSources.length > 0
          ? preferredSources
          : sources.map((s) => s.id)
      ).map((sourceId) =>
        this.embeddingService.searchSimilarChunks(
          query,
          sourceId,
          maxChunks * 2,
        ),
      );

      const searchResults = await Promise.all(searchPromises);

      // Flatten and filter results
      let allChunks = searchResults
        .flat()
        .filter((chunk) => chunk.similarity >= minSimilarity)
        .map((chunk) => ({
          ...chunk,
          chunkType: chunk.chunkType as "text" | "code",
        }));

      // Filter by content type if needed
      if (!includeCodeBlocks) {
        allChunks = allChunks.filter((chunk) => chunk.chunkType !== "code");
      }

      // Sort by similarity and take top chunks
      allChunks.sort((a, b) => b.similarity - a.similarity);
      const topChunks = allChunks.slice(0, maxChunks);

      // Build context text
      const contextText = this.buildContextText(topChunks);

      // Get unique sources used
      const sourcesUsed = [
        ...new Set(
          topChunks.map(
            (chunk) =>
              sources.find((s) => s.url === new URL(chunk.url).origin)?.title ||
              new URL(chunk.url).hostname,
          ),
        ),
      ];

      return {
        relevantChunks: topChunks,
        contextText,
        sourcesUsed,
      };
    } catch (error) {
      log.error("Error getting docs context:", error);
      return {
        relevantChunks: [],
        contextText: "",
        sourcesUsed: [],
      };
    }
  }

  /**
   * Build formatted context text for the AI
   */
  private buildContextText(
    chunks: Array<{
      content: string;
      url: string;
      title: string;
      chunkType: "text" | "code";
      language?: string;
      similarity: number;
    }>,
  ): string {
    if (chunks.length === 0) {
      return "";
    }

    const sections = chunks.map((chunk, index) => {
      const header = `## Documentation Context ${index + 1}`;
      const source = `**Source:** ${chunk.title} - ${chunk.url}`;
      const similarity = `**Relevance:** ${Math.round(chunk.similarity * 100)}%`;

      let content = chunk.content;
      if (chunk.chunkType === "code" && chunk.language) {
        content = `\`\`\`${chunk.language}\n${content}\n\`\`\``;
      }

      return [header, source, similarity, "", content].join("\n");
    });

    return [
      "# Relevant Documentation",
      "",
      "The following documentation excerpts are relevant to your question:",
      "",
      ...sections,
    ].join("\n");
  }

  /**
   * Check if any docs sources are available and have embeddings
   */
  async isDocsContextAvailable(): Promise<boolean> {
    try {
      const sources = await db.query.docsSources.findMany({
        where: eq(docsSources.status, "completed"),
      });

      if (sources.length === 0) {
        return false;
      }

      // Check if at least one source has embeddings
      for (const source of sources) {
        const chunks = await db.query.docsChunks.findMany({
          where: (chunks, { isNotNull }) => isNotNull(chunks.embedding),
          with: {
            page: true,
          },
          limit: 1,
        });

        // Filter chunks that belong to this source
        const sourceChunks = chunks.filter(
          (chunk) => chunk.page.sourceId === source.id,
        );
        if (sourceChunks.length > 0) {
          return true;
        }
      }

      return false;
    } catch (error) {
      log.error("Error checking docs availability:", error);
      return false;
    }
  }

  /**
   * Get a summary of available documentation sources
   */
  async getAvailableSourcesSummary(): Promise<string> {
    try {
      const sources = await db.query.docsSources.findMany({
        where: eq(docsSources.status, "completed"),
      });

      if (sources.length === 0) {
        return "No documentation sources are currently indexed.";
      }

      const summaries = sources.map((source) => {
        const title = source.title || new URL(source.url).hostname;
        const pages = source.crawledPages || 0;
        return `- **${title}**: ${pages} pages indexed from ${source.url}`;
      });

      return [
        "## Available Documentation Sources",
        "",
        ...summaries,
        "",
        "You can reference any of these documentation sources in your responses.",
      ].join("\n");
    } catch (error) {
      log.error("Error getting sources summary:", error);
      return "";
    }
  }
}
