import axios from "axios";
import * as cheerio from "cheerio";
import PQueue from "p-queue";
import { URL } from "url";
import fs from "fs/promises";
import path from "path";
import CryptoJS from "crypto-js";
import { getUserDataPath } from "../../paths/paths";
import { db } from "../../db";
import { docsSources, docsPages, docsChunks } from "../../db/schema";
import { eq } from "drizzle-orm";
import log from "electron-log";
import { BrowserWindow } from "electron";

export interface CrawlOptions {
  maxPages?: number;
  maxDepth?: number;
  concurrency?: number;
  throttleMs?: number;
  includePaths?: string[];
  excludePaths?: string[];
  downloadCodeFiles?: boolean;
  useHeadlessRender?: boolean;
  allowCrossOrigin?: boolean;
}

export interface CrawlProgress {
  sourceId: number;
  status: "pending" | "crawling" | "paused" | "completed" | "failed";
  totalPages: number;
  crawledPages: number;
  currentUrl?: string;
  errorMessage?: string;
}

export interface PageContent {
  url: string;
  title: string;
  content: string;
  codeBlocks: Array<{
    content: string;
    language?: string;
  }>;
  links: string[];
  filePath: string;
}

export class DocsCrawler {
  private queue: PQueue;
  private visited = new Set<string>();
  private baseUrl: string;
  private origin: string;
  private allowedOrigins: Set<string>;
  private options: Required<CrawlOptions>;
  private isPaused = false;
  private isStopped = false;
  private sourceId: number;
  private progressCallback?: (progress: CrawlProgress) => void;
  private docsDir: string;

  constructor(
    baseUrl: string,
    sourceId: number,
    options: CrawlOptions = {},
    progressCallback?: (progress: CrawlProgress) => void,
  ) {
    this.baseUrl = baseUrl;
    this.sourceId = sourceId;
    this.progressCallback = progressCallback;

    const url = new URL(baseUrl);
    this.origin = url.origin;
    this.allowedOrigins = new Set([this.origin]);

    this.options = {
      maxPages: options.maxPages ?? 1000,
      maxDepth: options.maxDepth ?? 10,
      concurrency: options.concurrency ?? 3,
      throttleMs: options.throttleMs ?? 500,
      includePaths: options.includePaths ?? [],
      excludePaths: options.excludePaths ?? [],
      downloadCodeFiles: options.downloadCodeFiles ?? true,
      useHeadlessRender: options.useHeadlessRender ?? true,
      allowCrossOrigin: options.allowCrossOrigin ?? false,
    };

    this.queue = new PQueue({
      concurrency: this.options.concurrency,
      interval: this.options.throttleMs,
      intervalCap: 1,
    });

    // Start the queue
    this.queue.start();

    // Setup docs directory
    this.docsDir = path.join(
      getUserDataPath(),
      "docs",
      this.sanitizeForPath(url.hostname),
    );
  }

  private async renderWithHeadlessBrowser(
    url: string,
    timeoutMs: number = 20000,
  ): Promise<string | null> {
    try {
      const win = new BrowserWindow({
        show: false,
        webPreferences: {
          offscreen: true,
          javascript: true,
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      await win.loadURL(url);

      const html: string = (await Promise.race([
        win.webContents.executeJavaScript("document.documentElement.outerHTML"),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Headless render timeout")),
            timeoutMs,
          ),
        ),
      ])) as string;

      win.destroy();
      return typeof html === "string" && html.length > 0 ? html : null;
    } catch (error) {
      log.error(`Headless render failed for ${url}:`, error);
      return null;
    }
  }

  private sanitizeForPath(str: string): string {
    return str.replace(/[^\w\-_.]/g, "_");
  }

  private shouldCrawlUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);

      // Must be same origin unless explicitly allowed
      if (!this.allowedOrigins.has(urlObj.origin)) {
        log.debug(`Skipping different origin: ${url}`);
        return false;
      }

      const pathname = urlObj.pathname;

      // Skip common non-content paths
      const skipPatterns = [
        "/api/",
        "/admin/",
        "/login",
        "/logout",
        "/register",
        "/search",
        "/.well-known/",
        "/robots.txt",
        "/sitemap.xml",
        "/favicon.ico",
      ];

      if (skipPatterns.some((pattern) => pathname.includes(pattern))) {
        log.debug(`Skipping non-content path: ${url}`);
        return false;
      }

      // Check include paths
      if (this.options.includePaths.length > 0) {
        const matches = this.options.includePaths.some(
          (pattern) =>
            pathname.includes(pattern) || new RegExp(pattern).test(pathname),
        );
        if (!matches) {
          log.debug(`URL doesn't match include patterns: ${url}`);
          return false;
        }
      }

      // Check exclude paths
      if (this.options.excludePaths.length > 0) {
        const matches = this.options.excludePaths.some(
          (pattern) =>
            pathname.includes(pattern) || new RegExp(pattern).test(pathname),
        );
        if (matches) {
          log.debug(`URL matches exclude pattern: ${url}`);
          return false;
        }
      }

      log.debug(`URL approved for crawling: ${url}`);
      return true;
    } catch (error) {
      log.debug(`Invalid URL: ${url}`, error);
      return false;
    }
  }

  private async fetchRobotsTxt(): Promise<string[]> {
    try {
      const robotsUrl = new URL("/robots.txt", this.origin).toString();
      const response = await axios.get(robotsUrl, { timeout: 10000 });

      // Parse robots.txt for Disallow directives
      const disallowPaths: string[] = [];
      const lines = response.data.split("\n");
      let isUserAgent = false;

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.toLowerCase().startsWith("user-agent:")) {
          isUserAgent =
            trimmed.toLowerCase().includes("*") ||
            trimmed.toLowerCase().includes("codexcrawler");
        } else if (
          isUserAgent &&
          trimmed.toLowerCase().startsWith("disallow:")
        ) {
          const path = trimmed.substring(9).trim();
          if (path) disallowPaths.push(path);
        }
      }

      return disallowPaths;
    } catch {
      // If robots.txt is not accessible, return empty array
      return [];
    }
  }

  private async fetchSitemap(): Promise<string[]> {
    try {
      const sitemapUrl = new URL("/sitemap.xml", this.origin).toString();
      const response = await axios.get(sitemapUrl, { timeout: 10000 });

      const $ = cheerio.load(response.data, { xmlMode: true });
      const urls: string[] = [];

      $("url > loc").each((_, el: any) => {
        const url = $(el).text().trim();
        if (url && this.shouldCrawlUrl(url)) {
          urls.push(url);
        }
      });

      return urls;
    } catch {
      return [];
    }
  }

  private async processUrl(
    url: string,
    depth: number = 0,
  ): Promise<PageContent | null> {
    // Check for stop/pause states
    if (this.isStopped) {
      return null;
    }

    // Wait if paused
    while (this.isPaused && !this.isStopped) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (
      this.visited.has(url) ||
      depth > this.options.maxDepth ||
      this.visited.size >= this.options.maxPages
    ) {
      return null;
    }

    this.visited.add(url);

    try {
      log.info(`Crawling: ${url} (depth: ${depth})`);

      // Update progress
      if (this.progressCallback) {
        this.progressCallback({
          sourceId: this.sourceId,
          status: "crawling",
          totalPages: Math.min(
            this.visited.size + this.queue.size,
            this.options.maxPages,
          ),
          crawledPages: this.visited.size,
          currentUrl: url,
        });
      }

      // Attempt primary URL and a set of robust fallbacks (trailing slash, index pages, common docs landing pages)
      const urlObj = new URL(url);
      const pathHasExtension = /\.[a-zA-Z0-9]{1,6}$/.test(urlObj.pathname);
      const candidates: string[] = [url];
      if (!url.endsWith("/") && !pathHasExtension) {
        candidates.push(`${url}/`);
      }
      const basePath = url.endsWith("/") ? url : `${url}/`;
      const commonEntrypoints = [
        "index.html",
        "index",
        "getting-started",
        "guide",
        "guides",
        "overview",
        "features",
        "docs",
        "documentation",
      ];
      for (const p of commonEntrypoints) {
        // Only add if we didn't already include exact candidate
        const candidate = basePath + p;
        if (!candidates.includes(candidate)) candidates.push(candidate);
      }

      let html: string | null = null;
      let finalUrl = url;
      for (const candidate of candidates) {
        try {
          const resp = await axios.get(candidate, {
            timeout: 15000,
            headers: {
              "User-Agent": "CodexCrawler/1.0 (Documentation Indexer)",
              Accept:
                "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
            maxRedirects: 3,
          });
          html = resp.data;
          finalUrl = candidate;
          if (candidate !== url) {
            log.info(`Fetched fallback URL for ${url}: ${candidate}`);
          }
          break;
        } catch (err: any) {
          // Try next candidate on HTTP errors
          const status = err?.response?.status;
          log.info(
            `Attempt failed (${status ?? "no-status"}) for ${candidate}, trying next`,
          );
          // Optional headless fallback per candidate on failure
          if (this.options.useHeadlessRender) {
            const rendered = await this.renderWithHeadlessBrowser(candidate);
            if (rendered && rendered.length > 200) {
              html = rendered;
              finalUrl = candidate;
              log.info(`Headless fallback succeeded for ${candidate}`);
              break;
            }
          }
        }
      }

      if (!html) {
        // Last-chance headless attempt on the original URL
        if (this.options.useHeadlessRender) {
          const rendered = await this.renderWithHeadlessBrowser(url);
          if (rendered && rendered.length > 200) {
            html = rendered;
            finalUrl = url;
          }
        }
      }

      if (!html) {
        log.error(`All attempts failed for ${url}`);
        return null;
      }

      const responseUrl = finalUrl;
      const htmlStr = html;
      const $ = cheerio.load(htmlStr);

      // Optionally discover alternate origin on first page
      if (
        this.options.allowCrossOrigin &&
        depth === 0 &&
        this.allowedOrigins.size === 1
      ) {
        const originCounts = new Map<string, number>();
        $("a[href]").each((_, el: any) => {
          const href = $(el).attr("href");
          if (!href) return;
          try {
            const linkUrl = new URL(href, responseUrl);
            const origin = linkUrl.origin;
            if (origin !== this.origin) {
              originCounts.set(origin, (originCounts.get(origin) || 0) + 1);
            }
          } catch {}
        });
        // Pick dominant alternate origin if it has significant presence
        let topOrigin: string | null = null;
        let topCount = 0;
        for (const [o, c] of originCounts.entries()) {
          if (c > topCount) {
            topOrigin = o;
            topCount = c;
          }
        }
        if (topOrigin && topCount >= 3) {
          this.allowedOrigins.add(topOrigin);
          log.info(`Discovered and allowed alternate origin: ${topOrigin}`);
        }
      }

      // Extract page content
      const title =
        $("title").first().text().trim() ||
        $("h1").first().text().trim() ||
        "Untitled";

      // Extract main content using various selectors
      let content = "";
      const mainSelectors = [
        "main",
        "article",
        "[role='main']",
        ".content",
        ".main-content",
        "#content",
        "#main-content",
        ".docs-content",
        ".documentation",
        ".prose",
        ".markdown-body",
        ".post-content",
      ];

      for (const selector of mainSelectors) {
        const element = $(selector);
        if (element.length > 0) {
          // Remove navigation, sidebar, footer elements
          element
            .find(
              "nav, .sidebar, .navigation, footer, .footer, .toc, .table-of-contents",
            )
            .remove();
          content = element.text().trim();
          if (content.length > 100) {
            log.info(
              `Found content using selector: ${selector} (${content.length} chars)`,
            );
            break;
          }
        }
      }

      // Fallback to body if no main content found
      if (!content || content.length < 100) {
        $(
          "nav, header, footer, script, style, .sidebar, .navigation, .toc, .table-of-contents",
        ).remove();
        content = $("body").text().trim();
        log.info(`Using body fallback (${content.length} chars)`);
      }

      // Clean up content
      content = content.replace(/\s+/g, " ").trim();

      // Extract code blocks
      const codeBlocks: Array<{ content: string; language?: string }> = [];

      $("pre code, code").each((_, element: any) => {
        const $code = $(element);
        const codeContent = $code.text().trim();

        if (codeContent.length > 10) {
          // Only meaningful code blocks
          let language: string | undefined;

          // Try to detect language from class names
          const classNames = $code.attr("class") || "";
          const langMatch = classNames.match(/language-(\w+)|lang-(\w+)|(\w+)/);
          if (langMatch) {
            language = langMatch[1] || langMatch[2] || langMatch[3];
          }

          codeBlocks.push({
            content: codeContent,
            language: language,
          });
        }
      });

      // Extract internal links for further crawling
      const links: string[] = [];
      $("a[href]").each((_, element: any) => {
        const href = $(element).attr("href");
        if (!href) return;

        try {
          const linkUrl = new URL(href, responseUrl).toString();
          if (this.shouldCrawlUrl(linkUrl) && !this.visited.has(linkUrl)) {
            links.push(linkUrl);
          }
        } catch {
          // Invalid URL, skip
        }
      });

      // Save raw HTML file
      const urlPath = new URL(responseUrl).pathname;
      const safePath = this.sanitizeForPath(urlPath);
      const fileName = safePath.endsWith("/")
        ? "index.html"
        : `${safePath}.html`;
      const filePath = path.join(this.docsDir, fileName);

      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, htmlStr, "utf8");

      // Queue additional links for crawling
      if (
        depth < this.options.maxDepth &&
        this.visited.size < this.options.maxPages
      ) {
        for (const link of links.slice(0, 10)) {
          if (!this.visited.has(link)) {
            this.enqueueCrawl(link, depth + 1, undefined);
          }
        }
      }

      return {
        url: responseUrl,
        title,
        content,
        codeBlocks,
        links,
        filePath,
      };
    } catch (error) {
      log.error(`Error crawling ${url}:`, error);
      return null;
    }
  }

  private enqueueCrawl(
    url: string,
    depth: number,
    results?: PageContent[],
  ): void {
    // results is optional for internal calls; we maintain a shared array in crawl()
    this.queue.add(async () => {
      const result = await this.processUrl(url, depth);
      if (result) {
        if (results) results.push(result);
        await this.savePageContent(result);
        await db
          .update(docsSources)
          .set({
            crawledPages: (results ? results.length : undefined) as any,
            updatedAt: new Date(),
          })
          .where(eq(docsSources.id, this.sourceId));
        log.info(`Processed page: ${result.url}`);
      }
    });
  }

  private async savePageContent(pageContent: PageContent): Promise<void> {
    try {
      const contentHash = CryptoJS.SHA256(pageContent.content).toString();

      // Check if page already exists with same content
      const existingPage = await db.query.docsPages.findFirst({
        where: eq(docsPages.url, pageContent.url),
      });

      let pageId: number;

      if (existingPage) {
        if (existingPage.contentHash === contentHash) {
          // Content hasn't changed, skip
          return;
        }

        // Update existing page
        await db
          .update(docsPages)
          .set({
            title: pageContent.title,
            content: pageContent.content,
            contentHash,
            filePath: pageContent.filePath,
            updatedAt: new Date(),
          })
          .where(eq(docsPages.id, existingPage.id));

        pageId = existingPage.id;

        // Delete old chunks
        await db
          .delete(docsChunks)
          .where(eq(docsChunks.pageId, existingPage.id));
      } else {
        // Insert new page
        const [newPage] = await db
          .insert(docsPages)
          .values({
            sourceId: this.sourceId,
            url: pageContent.url,
            title: pageContent.title,
            content: pageContent.content,
            contentHash,
            filePath: pageContent.filePath,
          })
          .returning();

        pageId = newPage.id;
      }

      // Create chunks (will be implemented in next step)
      await this.createChunks(pageId, pageContent);
    } catch (error) {
      log.error(`Error saving page content for ${pageContent.url}:`, error);
    }
  }

  private async createChunks(
    pageId: number,
    pageContent: PageContent,
  ): Promise<void> {
    // Simple chunking implementation - will enhance this in the next step
    const chunks: Array<{
      pageId: number;
      content: string;
      chunkType: "text" | "code";
      language?: string;
      sectionPosition: number;
    }> = [];

    // Chunk main text content
    const textChunks = this.chunkText(pageContent.content);
    textChunks.forEach((chunk, index) => {
      if (chunk.trim().length > 50) {
        // Only meaningful chunks
        chunks.push({
          pageId,
          content: chunk.trim(),
          chunkType: "text",
          sectionPosition: index,
        });
      }
    });

    // Add code blocks as separate chunks
    pageContent.codeBlocks.forEach((codeBlock, index) => {
      chunks.push({
        pageId,
        content: codeBlock.content,
        chunkType: "code",
        language: codeBlock.language,
        sectionPosition: textChunks.length + index,
      });
    });

    // Insert chunks into database
    if (chunks.length > 0) {
      await db.insert(docsChunks).values(chunks);
    }
  }

  private chunkText(
    text: string,
    maxChars: number = 2000,
    overlap: number = 200,
  ): string[] {
    const chunks: string[] = [];
    let i = 0;

    while (i < text.length) {
      const end = Math.min(i + maxChars, text.length);
      const chunk = text.slice(i, end);
      chunks.push(chunk.trim());
      i += maxChars - overlap;
    }

    return chunks;
  }

  public async crawl(): Promise<void> {
    try {
      log.info(`Starting crawl for ${this.baseUrl}`);

      // Update source status
      await db
        .update(docsSources)
        .set({
          status: "crawling",
          updatedAt: new Date(),
        })
        .where(eq(docsSources.id, this.sourceId));

      // Check robots.txt
      const disallowedPaths = await this.fetchRobotsTxt();
      log.info(
        `Found ${disallowedPaths.length} disallowed paths in robots.txt`,
      );

      // Get sitemap URLs
      const sitemapUrls = await this.fetchSitemap();
      log.info(`Found ${sitemapUrls.length} URLs in sitemap`);

      // Start with base URL and sitemap URLs
      const seedUrls = [this.baseUrl, ...sitemapUrls].slice(
        0,
        this.options.maxPages,
      );
      log.info(`Processing ${seedUrls.length} seed URLs`);

      // Shared results array used by queued tasks
      const results: PageContent[] = [];

      // Process seed URLs
      for (const url of seedUrls) {
        if (this.shouldCrawlUrl(url)) {
          this.enqueueCrawl(url, 0, results);
          log.info(`Queued URL for crawling: ${url}`);
        } else {
          log.info(`Skipped URL: ${url}`);
        }
      }

      // If no URLs were queued, add the base URL as fallback
      if (this.queue.size === 0) {
        log.info("No URLs queued, adding base URL as fallback");
        this.enqueueCrawl(this.baseUrl, 0, results);
      }

      this.queue.on("error", (error) => {
        log.error("Queue error:", error);
      });

      // Wait for all crawling to complete
      await this.queue.onIdle();

      // Final update
      await db
        .update(docsSources)
        .set({
          status: "completed",
          totalPages: results.length,
          crawledPages: results.length,
          lastCrawledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(docsSources.id, this.sourceId));

      if (this.progressCallback) {
        this.progressCallback({
          sourceId: this.sourceId,
          status: "completed",
          totalPages: results.length,
          crawledPages: results.length,
        });
      }

      log.info(`Crawling completed. Processed ${results.length} pages.`);
    } catch (error) {
      log.error("Crawling failed:", error);

      // Update source status to failed
      await db
        .update(docsSources)
        .set({
          status: "failed",
          errorMessage: error instanceof Error ? error.message : String(error),
          updatedAt: new Date(),
        })
        .where(eq(docsSources.id, this.sourceId));

      if (this.progressCallback) {
        this.progressCallback({
          sourceId: this.sourceId,
          status: "failed",
          totalPages: 0,
          crawledPages: 0,
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      }

      throw error;
    }
  }

  public pause(): void {
    this.isPaused = true;
    this.queue.pause();
  }

  public resume(): void {
    this.isPaused = false;
    this.queue.start();
  }

  public stop(): void {
    this.isStopped = true;
    this.queue.clear();
    this.queue.pause();
  }
}
