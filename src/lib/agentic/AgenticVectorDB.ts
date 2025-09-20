export interface CodeChunk {
  id: string;
  filePath: string;
  content: string;
  type:
    | "function"
    | "class"
    | "component"
    | "interface"
    | "type"
    | "import"
    | "comment"
    | "other";
  lineNumber: number;
  endLineNumber: number;
  metadata: {
    dependencies: string[];
    exports: string[];
    imports: string[];
    complexity: number;
    lastModified: number;
  };
  embedding?: number[];
}

export interface SearchResult {
  chunk: CodeChunk;
  similarity: number;
  reason: string;
}

export interface VectorDBStatistics {
  totalChunks: number;
  chunksByType: Record<string, number>;
  chunksByFile: Record<string, number>;
}

export class AgenticVectorDB {
  private chunks: Map<string, CodeChunk> = new Map();
  private embeddings: Map<string, number[]> = new Map();
  private fileIndex: Map<string, string[]> = new Map(); // filePath -> chunkIds

  async indexCodebase(rootPath: string): Promise<void> {
    console.log(`[AgenticVectorDB] Indexing codebase at ${rootPath}`);

    try {
      const _fs = await import("fs/promises");
      const _path = await import("path");

      // Recursively find all code files
      const codeFiles = await this.findCodeFiles(rootPath);

      for (const filePath of codeFiles) {
        await this.indexFile(filePath);
      }

      console.log(
        `[AgenticVectorDB] Indexed ${this.chunks.size} chunks from ${codeFiles.length} files`,
      );
    } catch (error) {
      console.error(`[AgenticVectorDB] Failed to index codebase:`, error);
      throw new Error(
        `Codebase indexing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async getRelevantContext(
    query: string,
    limit: number = 10,
  ): Promise<SearchResult[]> {
    console.log(`[AgenticVectorDB] Searching for context: ${query}`);

    try {
      // For now, return mock results based on simple text matching
      // In a real implementation, this would use vector similarity search
      const results: SearchResult[] = [];

      for (const [_chunkId, chunk] of this.chunks) {
        const similarity = this.calculateTextSimilarity(query, chunk.content);

        if (similarity > 0.1) {
          // Threshold for relevance
          results.push({
            chunk,
            similarity,
            reason: `Content matches query with ${Math.round(similarity * 100)}% similarity`,
          });
        }
      }

      // Sort by similarity and return top results
      results.sort((a, b) => b.similarity - a.similarity);

      console.log(`[AgenticVectorDB] Found ${results.length} relevant chunks`);
      return results.slice(0, limit);
    } catch (error) {
      console.error(`[AgenticVectorDB] Search failed:`, error);
      return [];
    }
  }

  async addChunk(chunk: CodeChunk): Promise<void> {
    this.chunks.set(chunk.id, chunk);

    // Update file index
    if (!this.fileIndex.has(chunk.filePath)) {
      this.fileIndex.set(chunk.filePath, []);
    }
    this.fileIndex.get(chunk.filePath)!.push(chunk.id);

    // Generate embedding (mock for now)
    this.embeddings.set(chunk.id, this.generateMockEmbedding(chunk.content));
  }

  async removeChunk(chunkId: string): Promise<void> {
    const chunk = this.chunks.get(chunkId);
    if (!chunk) return;

    this.chunks.delete(chunkId);
    this.embeddings.delete(chunkId);

    // Update file index
    const fileChunks = this.fileIndex.get(chunk.filePath);
    if (fileChunks) {
      const index = fileChunks.indexOf(chunkId);
      if (index > -1) {
        fileChunks.splice(index, 1);
      }
    }
  }

  async updateChunk(
    chunkId: string,
    updates: Partial<CodeChunk>,
  ): Promise<void> {
    const existingChunk = this.chunks.get(chunkId);
    if (!existingChunk) {
      throw new Error(`Chunk ${chunkId} not found`);
    }

    const updatedChunk = { ...existingChunk, ...updates };
    this.chunks.set(chunkId, updatedChunk);

    // Regenerate embedding if content changed
    if (updates.content && updates.content !== existingChunk.content) {
      this.embeddings.set(chunkId, this.generateMockEmbedding(updates.content));
    }
  }

  getStatistics(): VectorDBStatistics {
    const chunksByType: Record<string, number> = {};
    const chunksByFile: Record<string, number> = {};

    for (const chunk of this.chunks.values()) {
      chunksByType[chunk.type] = (chunksByType[chunk.type] || 0) + 1;
      chunksByFile[chunk.filePath] = (chunksByFile[chunk.filePath] || 0) + 1;
    }

    return {
      totalChunks: this.chunks.size,
      chunksByType,
      chunksByFile,
    };
  }

  private async findCodeFiles(rootPath: string): Promise<string[]> {
    const fs = await import("fs/promises");
    const path = await import("path");

    const codeExtensions = [
      ".ts",
      ".tsx",
      ".js",
      ".jsx",
      ".py",
      ".java",
      ".cpp",
      ".c",
      ".cs",
      ".go",
      ".rs",
    ];
    const files: string[] = [];

    const walkDir = async (dir: string): Promise<void> => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            // Skip common directories to ignore
            if (
              !["node_modules", ".git", "dist", "build", ".next"].includes(
                entry.name,
              )
            ) {
              await walkDir(fullPath);
            }
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name);
            if (codeExtensions.includes(ext)) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        // Skip directories we can't read
        console.warn(
          `[AgenticVectorDB] Could not read directory ${dir}:`,
          error,
        );
      }
    };

    await walkDir(rootPath);
    return files;
  }

  private async indexFile(filePath: string): Promise<void> {
    try {
      const fs = await import("fs/promises");
      const content = await fs.readFile(filePath, "utf-8");

      // Parse file content into chunks
      const chunks = this.parseFileContent(filePath, content);

      for (const chunk of chunks) {
        await this.addChunk(chunk);
      }
    } catch (error) {
      console.warn(
        `[AgenticVectorDB] Could not index file ${filePath}:`,
        error,
      );
    }
  }

  private parseFileContent(filePath: string, content: string): CodeChunk[] {
    const chunks: CodeChunk[] = [];
    const lines = content.split("\n");

    let currentChunk: Partial<CodeChunk> | null = null;
    let chunkId = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Detect function definitions
      if (trimmedLine.match(/^(export\s+)?(async\s+)?function\s+\w+/)) {
        if (currentChunk) {
          chunks.push(this.finalizeChunk(currentChunk, i - 1));
        }
        currentChunk = {
          id: `${filePath}-${chunkId++}`,
          filePath,
          content: line,
          type: "function",
          lineNumber: i + 1,
          metadata: {
            dependencies: [],
            exports: [],
            imports: [],
            complexity: 1,
            lastModified: Date.now(),
          },
        };
      }
      // Detect class definitions
      else if (trimmedLine.match(/^(export\s+)?class\s+\w+/)) {
        if (currentChunk) {
          chunks.push(this.finalizeChunk(currentChunk, i - 1));
        }
        currentChunk = {
          id: `${filePath}-${chunkId++}`,
          filePath,
          content: line,
          type: "class",
          lineNumber: i + 1,
          metadata: {
            dependencies: [],
            exports: [],
            imports: [],
            complexity: 1,
            lastModified: Date.now(),
          },
        };
      }
      // Detect component definitions (React)
      else if (
        trimmedLine.match(/^(export\s+)?(const|function)\s+\w+.*=.*\(/)
      ) {
        if (currentChunk) {
          chunks.push(this.finalizeChunk(currentChunk, i - 1));
        }
        currentChunk = {
          id: `${filePath}-${chunkId++}`,
          filePath,
          content: line,
          type: "component",
          lineNumber: i + 1,
          metadata: {
            dependencies: [],
            exports: [],
            imports: [],
            complexity: 1,
            lastModified: Date.now(),
          },
        };
      }
      // Detect interface/type definitions
      else if (trimmedLine.match(/^(export\s+)?(interface|type)\s+\w+/)) {
        if (currentChunk) {
          chunks.push(this.finalizeChunk(currentChunk, i - 1));
        }
        currentChunk = {
          id: `${filePath}-${chunkId++}`,
          filePath,
          content: line,
          type: "interface",
          lineNumber: i + 1,
          metadata: {
            dependencies: [],
            exports: [],
            imports: [],
            complexity: 1,
            lastModified: Date.now(),
          },
        };
      }
      // Detect imports
      else if (trimmedLine.startsWith("import ")) {
        if (currentChunk) {
          chunks.push(this.finalizeChunk(currentChunk, i - 1));
        }
        currentChunk = {
          id: `${filePath}-${chunkId++}`,
          filePath,
          content: line,
          type: "import",
          lineNumber: i + 1,
          metadata: {
            dependencies: [],
            exports: [],
            imports: [],
            complexity: 1,
            lastModified: Date.now(),
          },
        };
      }
      // Continue current chunk
      else if (currentChunk) {
        currentChunk.content += "\n" + line;
      }
    }

    // Add final chunk if exists
    if (currentChunk) {
      chunks.push(this.finalizeChunk(currentChunk, lines.length - 1));
    }

    return chunks;
  }

  private finalizeChunk(chunk: Partial<CodeChunk>, endLine: number): CodeChunk {
    return {
      id: chunk.id!,
      filePath: chunk.filePath!,
      content: chunk.content!,
      type: chunk.type!,
      lineNumber: chunk.lineNumber!,
      endLineNumber: endLine + 1,
      metadata: chunk.metadata!,
    };
  }

  private calculateTextSimilarity(query: string, content: string): number {
    // Simple text similarity calculation
    // In a real implementation, this would use proper vector similarity
    const queryWords = query.toLowerCase().split(/\s+/);
    const contentWords = content.toLowerCase().split(/\s+/);

    let matches = 0;
    for (const word of queryWords) {
      if (contentWords.includes(word)) {
        matches++;
      }
    }

    return matches / queryWords.length;
  }

  private generateMockEmbedding(content: string): number[] {
    // Generate a mock embedding vector
    // In a real implementation, this would use a proper embedding model
    const vector = Array.from({ length: 384 }, () => 0);
    for (let i = 0; i < content.length && i < 384; i++) {
      vector[i] = content.charCodeAt(i) / 255;
    }
    return vector;
  }
}
