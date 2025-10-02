import { ipcMain } from "electron";
import { db } from "../../db";
import { docsSources, docsPages, docsChunks } from "../../db/schema";
import { eq, desc } from "drizzle-orm";
import { DocsCrawler } from "../services/docs_crawler";
import { DocsEmbeddingService } from "../services/docs_embedding";
import type {
  CreateDocsSourceParams,
  DocsSource,
  DocsPage,
  DocsChunk,
  DocsSearchParams,
  DocsSearchResult,
  DocsCrawlProgress,
  GenerateEmbeddingsParams,
  ReindexDocsParams,
} from "../ipc_types";
import log from "electron-log";
import { createLoggedHandler } from "./safe_handle";

const logger = log.scope("docs");
const handle = createLoggedHandler(logger);

// Store active crawlers to allow cancellation
const activeCrawlers = new Map<number, DocsCrawler>();

export function registerDocsHandlers() {
  logger.log("Registering docs IPC handlers...");

  // Create a new docs source and start crawling
  handle(
    "docs:create-source",
    async (
      _,
      params: CreateDocsSourceParams,
    ): Promise<{ sourceId: number }> => {
      try {
        log.info("Creating docs source for URL:", params.url);

        // Validate URL
        new URL(params.url);

        // Check if source already exists
        const existingSource = await db.query.docsSources.findFirst({
          where: eq(docsSources.url, params.url),
        });

        if (existingSource) {
          throw new Error(
            `Documentation source already exists for URL: ${params.url}`,
          );
        }

        // Create new source
        const [source] = await db
          .insert(docsSources)
          .values({
            url: params.url,
            title: params.title || new URL(params.url).hostname,
            status: "pending",
          })
          .returning();

        log.info(`Created docs source ${source.id} for ${params.url}`);

        // Start crawling in background
        const crawler = new DocsCrawler(
          params.url,
          source.id,
          params.options,
          (progress: DocsCrawlProgress) => {
            // Send progress updates to renderer
            ipcMain.emit("docs:crawl-progress", progress);
          },
        );

        activeCrawlers.set(source.id, crawler);

        // Start crawling (don't await - runs in background)
        crawler
          .crawl()
          .then(() => {
            activeCrawlers.delete(source.id);
            log.info(`Crawling completed for source ${source.id}`);
          })
          .catch((error) => {
            activeCrawlers.delete(source.id);
            log.error(`Crawling failed for source ${source.id}:`, error);
          });

        return { sourceId: source.id };
      } catch (error) {
        log.error("Error creating docs source:", error);
        throw new Error(
          `Failed to create docs source: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    },
  );

  // List all docs sources
  handle("docs:list-sources", async (): Promise<DocsSource[]> => {
    try {
      const sources = await db.query.docsSources.findMany({
        orderBy: [desc(docsSources.createdAt)],
      });

      return sources.map((source) => ({
        id: source.id,
        url: source.url,
        title: source.title || undefined,
        status: source.status as
          | "pending"
          | "crawling"
          | "completed"
          | "failed",
        totalPages: source.totalPages || 0,
        crawledPages: source.crawledPages || 0,
        errorMessage: source.errorMessage || undefined,
        lastCrawledAt: source.lastCrawledAt || undefined,
        createdAt: source.createdAt,
        updatedAt: source.updatedAt,
      }));
    } catch (error) {
      log.error("Error listing docs sources:", error);
      throw new Error("Failed to list docs sources");
    }
  });

  // Get a specific docs source
  handle(
    "docs:get-source",
    async (_, sourceId: number): Promise<DocsSource> => {
      try {
        const source = await db.query.docsSources.findFirst({
          where: eq(docsSources.id, sourceId),
        });

        if (!source) {
          throw new Error(`Docs source not found: ${sourceId}`);
        }

        return {
          id: source.id,
          url: source.url,
          title: source.title || undefined,
          status: source.status as
            | "pending"
            | "crawling"
            | "completed"
            | "failed",
          totalPages: source.totalPages || 0,
          crawledPages: source.crawledPages || 0,
          errorMessage: source.errorMessage || undefined,
          lastCrawledAt: source.lastCrawledAt || undefined,
          createdAt: source.createdAt,
          updatedAt: source.updatedAt,
        };
      } catch (error) {
        log.error(`Error getting docs source ${sourceId}:`, error);
        throw new Error(
          `Failed to get docs source: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    },
  );

  // Delete a docs source and all its data
  handle("docs:delete-source", async (_, sourceId: number): Promise<void> => {
    try {
      // Stop any active crawler
      const crawler = activeCrawlers.get(sourceId);
      if (crawler) {
        crawler.stop();
        activeCrawlers.delete(sourceId);
      }

      // Delete from database (cascades to pages and chunks)
      await db.delete(docsSources).where(eq(docsSources.id, sourceId));

      log.info(`Deleted docs source ${sourceId}`);
    } catch (error) {
      log.error(`Error deleting docs source ${sourceId}:`, error);
      throw new Error("Failed to delete docs source");
    }
  });

  // Stop crawling for a source
  handle("docs:stop-crawling", async (_, sourceId: number): Promise<void> => {
    try {
      const crawler = activeCrawlers.get(sourceId);
      if (crawler) {
        crawler.stop();
        activeCrawlers.delete(sourceId);

        // Update status in database
        await db
          .update(docsSources)
          .set({
            status: "failed",
            errorMessage: "Crawling stopped by user",
            updatedAt: new Date(),
          })
          .where(eq(docsSources.id, sourceId));

        log.info(`Stopped crawling for source ${sourceId}`);
      }
    } catch (error) {
      log.error(`Error stopping crawling for source ${sourceId}:`, error);
      throw new Error("Failed to stop crawling");
    }
  });

  // Pause crawling for a source
  handle("docs:pause-crawling", async (_, sourceId: number): Promise<void> => {
    try {
      const crawler = activeCrawlers.get(sourceId);
      if (crawler) {
        crawler.pause();

        // Update status in database
        await db
          .update(docsSources)
          .set({
            status: "paused",
            updatedAt: new Date(),
          })
          .where(eq(docsSources.id, sourceId));

        log.info(`Paused crawling for source ${sourceId}`);
      }
    } catch (error) {
      log.error(`Error pausing crawling for source ${sourceId}:`, error);
      throw new Error("Failed to pause crawling");
    }
  });

  // Resume crawling for a source
  handle("docs:resume-crawling", async (_, sourceId: number): Promise<void> => {
    try {
      const crawler = activeCrawlers.get(sourceId);
      if (crawler) {
        crawler.resume();

        // Update status in database
        await db
          .update(docsSources)
          .set({
            status: "crawling",
            updatedAt: new Date(),
          })
          .where(eq(docsSources.id, sourceId));

        log.info(`Resumed crawling for source ${sourceId}`);
      }
    } catch (error) {
      log.error(`Error resuming crawling for source ${sourceId}:`, error);
      throw new Error("Failed to resume crawling");
    }
  });

  // Reindex a docs source (re-crawl)
  handle(
    "docs:reindex",
    async (_, params: ReindexDocsParams): Promise<void> => {
      try {
        const { sourceId } = params;

        // Get the source
        const source = await db.query.docsSources.findFirst({
          where: eq(docsSources.id, sourceId),
        });

        if (!source) {
          throw new Error(`Docs source not found: ${sourceId}`);
        }

        // Stop any active crawler
        const existingCrawler = activeCrawlers.get(sourceId);
        if (existingCrawler) {
          existingCrawler.stop();
          activeCrawlers.delete(sourceId);
        }

        // Delete existing pages and chunks
        await db.delete(docsPages).where(eq(docsPages.sourceId, sourceId));

        // Reset source status
        await db
          .update(docsSources)
          .set({
            status: "pending",
            totalPages: 0,
            crawledPages: 0,
            errorMessage: null,
            updatedAt: new Date(),
          })
          .where(eq(docsSources.id, sourceId));

        // Start new crawling
        const crawler = new DocsCrawler(
          source.url,
          sourceId,
          {}, // Use default options for reindex
          (progress: DocsCrawlProgress) => {
            ipcMain.emit("docs:crawl-progress", progress);
          },
        );

        activeCrawlers.set(sourceId, crawler);

        // Start crawling
        crawler
          .crawl()
          .then(() => {
            activeCrawlers.delete(sourceId);
            log.info(`Reindexing completed for source ${sourceId}`);
          })
          .catch((error) => {
            activeCrawlers.delete(sourceId);
            log.error(`Reindexing failed for source ${sourceId}:`, error);
          });
      } catch (error) {
        log.error("Error reindexing docs source:", error);
        throw new Error(
          `Failed to reindex docs source: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    },
  );

  // Generate embeddings for a source
  handle(
    "docs:generate-embeddings",
    async (_, params: GenerateEmbeddingsParams): Promise<void> => {
      try {
        const { sourceId, regenerate } = params;

        const embeddingService = new DocsEmbeddingService();

        if (regenerate) {
          await embeddingService.regenerateEmbeddings(sourceId);
        } else {
          await embeddingService.generateEmbeddingsForSource(sourceId);
        }

        log.info(`Generated embeddings for source ${sourceId}`);
      } catch (error) {
        log.error("Error generating embeddings:", error);
        throw new Error(
          `Failed to generate embeddings: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    },
  );

  // Search docs
  handle(
    "docs:search",
    async (_, params: DocsSearchParams): Promise<DocsSearchResult[]> => {
      try {
        const { query, sourceId, limit = 10, chunkType = "all" } = params;

        if (!query.trim()) {
          return [];
        }

        const embeddingService = new DocsEmbeddingService();
        let results = await embeddingService.searchSimilarChunks(
          query,
          sourceId,
          limit * 2,
        );

        // Filter by chunk type if specified
        if (chunkType !== "all") {
          results = results.filter((result) => result.chunkType === chunkType);
        }

        return results.slice(0, limit);
      } catch (error) {
        log.error("Error searching docs:", error);
        throw new Error(
          `Failed to search docs: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    },
  );

  // Get pages for a source
  handle("docs:get-pages", async (_, sourceId: number): Promise<DocsPage[]> => {
    try {
      const pages = await db.query.docsPages.findMany({
        where: eq(docsPages.sourceId, sourceId),
        orderBy: [desc(docsPages.createdAt)],
      });

      return pages.map((page) => ({
        id: page.id,
        sourceId: page.sourceId,
        url: page.url,
        title: page.title || undefined,
        content: page.content || undefined,
        contentHash: page.contentHash,
        filePath: page.filePath || undefined,
        createdAt: page.createdAt,
        updatedAt: page.updatedAt,
      }));
    } catch (error) {
      log.error(`Error getting pages for source ${sourceId}:`, error);
      throw new Error("Failed to get pages");
    }
  });

  // Get chunks for a page
  handle("docs:get-chunks", async (_, pageId: number): Promise<DocsChunk[]> => {
    try {
      const chunks = await db.query.docsChunks.findMany({
        where: eq(docsChunks.pageId, pageId),
        orderBy: [docsChunks.sectionPosition],
      });

      return chunks.map((chunk) => ({
        id: chunk.id,
        pageId: chunk.pageId,
        content: chunk.content,
        chunkType: chunk.chunkType as "text" | "code",
        language: chunk.language || undefined,
        embedding: chunk.embedding || undefined,
        headingPath: chunk.headingPath || undefined,
        sectionPosition: chunk.sectionPosition || undefined,
        createdAt: chunk.createdAt,
      }));
    } catch (error) {
      log.error(`Error getting chunks for page ${pageId}:`, error);
      throw new Error("Failed to get chunks");
    }
  });

  // Get docs statistics
  handle(
    "docs:get-stats",
    async (): Promise<{
      totalSources: number;
      totalPages: number;
      totalChunks: number;
      sourcesWithEmbeddings: number;
    }> => {
      try {
        // Check if docs tables exist first
        const dbClient = (db as any).$client;
        const hasDocsSources = dbClient
          .prepare(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='docs_sources'",
          )
          .get() as { name?: string } | undefined;

        if (!hasDocsSources) {
          log.warn("Docs tables do not exist yet, returning zero stats");
          return {
            totalSources: 0,
            totalPages: 0,
            totalChunks: 0,
            sourcesWithEmbeddings: 0,
          };
        }

        const [sources, pages, chunks, chunksWithEmbeddings] =
          await Promise.all([
            db.query.docsSources.findMany(),
            db.query.docsPages.findMany(),
            db.query.docsChunks.findMany(),
            db.query.docsChunks.findMany({
              where: (chunks, { isNotNull }) => isNotNull(chunks.embedding),
            }),
          ]);

        // Count sources with at least one embedding
        const sourcesWithEmbeddings = new Set();
        for (const chunk of chunksWithEmbeddings) {
          const page = await db.query.docsPages.findFirst({
            where: eq(docsPages.id, chunk.pageId),
          });
          if (page) {
            sourcesWithEmbeddings.add(page.sourceId);
          }
        }

        return {
          totalSources: sources.length,
          totalPages: pages.length,
          totalChunks: chunks.length,
          sourcesWithEmbeddings: sourcesWithEmbeddings.size,
        };
      } catch (error) {
        log.error("Error getting docs stats:", error);
        // Return zero stats instead of throwing error to prevent app crashes
        log.warn("Returning zero stats due to error");
        return {
          totalSources: 0,
          totalPages: 0,
          totalChunks: 0,
          sourcesWithEmbeddings: 0,
        };
      }
    },
  );

  logger.log("Docs IPC handlers registered successfully");
}
