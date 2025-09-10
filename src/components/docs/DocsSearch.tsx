import React, { useState, useEffect, useMemo } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { ScrollArea } from "../ui/scroll-area";
import {
  Search,
  ExternalLink,
  Code,
  FileText,
  Copy,
  Check,
} from "lucide-react";
import { useSearchDocs, useDocsSources } from "../../hooks/useDocs";
import type { DocsSearchResult } from "../../ipc/ipc_types";
import { toast } from "sonner";

export function DocsSearch() {
  const [query, setQuery] = useState("");
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [chunkType, setChunkType] = useState<"all" | "text" | "code">("all");
  const [copiedChunkId, setCopiedChunkId] = useState<number | null>(null);

  const { sources } = useDocsSources();
  const { searchDocs, searchResults, isSearching, clearResults } =
    useSearchDocs();

  // Memoize source titles to prevent infinite re-renders
  const sourceOptions = useMemo(() => {
    return sources.map((source) => {
      let title = source.title;
      if (!title) {
        try {
          title = new URL(source.url).hostname;
        } catch {
          title = source.url;
        }
      }
      return {
        id: source.id,
        title,
        url: source.url,
      };
    });
  }, [sources]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim()) {
      clearResults();
      return;
    }

    await searchDocs({
      query: query.trim(),
      sourceId: selectedSource === "all" ? undefined : Number(selectedSource),
      chunkType,
      limit: 20,
    });
  };

  const handleCopyContent = async (chunk: DocsSearchResult) => {
    try {
      await navigator.clipboard.writeText(chunk.content);
      setCopiedChunkId(chunk.id);
      toast.success("Content copied to clipboard");
      setTimeout(() => setCopiedChunkId(null), 2000);
    } catch {
      toast.error("Failed to copy content");
    }
  };

  const getChunkIcon = (chunkType: string) => {
    return chunkType === "code" ? (
      <Code className="w-3 h-3" />
    ) : (
      <FileText className="w-3 h-3" />
    );
  };

  const formatSimilarity = (similarity: number) => {
    return `${Math.round(similarity * 100)}%`;
  };

  useEffect(() => {
    // Clear results when changing filters
    clearResults();
  }, [selectedSource, chunkType]);

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Search form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Search Documentation</CardTitle>
          <CardDescription>
            Find relevant content across all your indexed documentation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="query">Search Query</Label>
              <div className="flex space-x-2">
                <Input
                  id="query"
                  placeholder="How to deploy a Next.js app..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" disabled={isSearching || !query.trim()}>
                  <Search className="w-4 h-4 mr-2" />
                  {isSearching ? "Searching..." : "Search"}
                </Button>
              </div>
            </div>

            <div className="flex space-x-4">
              <div className="flex-1">
                <Label htmlFor="source">Source</Label>
                <Select
                  value={selectedSource}
                  onValueChange={setSelectedSource}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    {sourceOptions.map((source) => (
                      <SelectItem key={source.id} value={source.id.toString()}>
                        {source.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1">
                <Label htmlFor="chunkType">Content Type</Label>
                <Select
                  value={chunkType}
                  onValueChange={(value) =>
                    setChunkType(value as "all" | "text" | "code")
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Content</SelectItem>
                    <SelectItem value="text">Text Only</SelectItem>
                    <SelectItem value="code">Code Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Search results */}
      <div className="flex-1 overflow-hidden">
        {searchResults.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Search className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {query ? "No results found" : "Start searching"}
              </h3>
              <p className="text-sm text-muted-foreground text-center">
                {query
                  ? "Try different keywords or check if the documentation is indexed"
                  : "Enter a search query to find relevant documentation content"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">
                Found {searchResults.length} relevant chunks
              </h3>
              <Button variant="outline" size="sm" onClick={clearResults}>
                Clear Results
              </Button>
            </div>

            <ScrollArea className="flex-1">
              <div className="space-y-3">
                {searchResults.map((result) => (
                  <Card key={result.id} className="relative">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <Badge
                              variant="outline"
                              className="flex items-center space-x-1"
                            >
                              {getChunkIcon(result.chunkType)}
                              <span className="capitalize">
                                {result.chunkType}
                              </span>
                            </Badge>
                            {result.language && (
                              <Badge variant="secondary" className="text-xs">
                                {result.language}
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {formatSimilarity(result.similarity)} match
                            </Badge>
                          </div>
                          <CardTitle className="text-sm truncate">
                            {result.title}
                          </CardTitle>
                          <CardDescription className="flex items-center space-x-1">
                            <a
                              href={result.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center text-xs hover:underline"
                            >
                              {result.url}
                              <ExternalLink className="w-3 h-3 ml-1" />
                            </a>
                          </CardDescription>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyContent(result)}
                          className="ml-2"
                        >
                          {copiedChunkId === result.id ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div
                        className={`text-sm whitespace-pre-wrap break-words ${
                          result.chunkType === "code"
                            ? "font-mono bg-muted p-2 rounded text-xs"
                            : ""
                        }`}
                      >
                        {result.content.length > 500
                          ? `${result.content.substring(0, 500)}...`
                          : result.content}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}
