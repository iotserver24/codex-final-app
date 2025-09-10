import React, { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Switch } from "../ui/switch";
import { Separator } from "../ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { useCreateDocsSource } from "../../hooks/useDocs";
import type { CreateDocsSourceParams } from "../../ipc/ipc_types";
import { Globe, Settings, Filter, Zap } from "lucide-react";

interface AddDocsSourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSourceAdded: () => void;
}

export function AddDocsSourceDialog({
  open,
  onOpenChange,
  onSourceAdded,
}: AddDocsSourceDialogProps) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Advanced options
  const [maxPages, setMaxPages] = useState(1000);
  const [maxDepth, setMaxDepth] = useState(10);
  const [concurrency, setConcurrency] = useState(3);
  const [throttleMs, setThrottleMs] = useState(500);
  const [includePaths, setIncludePaths] = useState("");
  const [excludePaths, setExcludePaths] = useState("");
  const [downloadCodeFiles, setDownloadCodeFiles] = useState(true);

  const { createSource, isLoading, error } = useCreateDocsSource();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url.trim()) return;

    try {
      // Validate URL
      new URL(url);

      const params: CreateDocsSourceParams = {
        url: url.trim(),
        title: title.trim() || undefined,
        options: {
          maxPages,
          maxDepth,
          concurrency,
          throttleMs,
          includePaths: includePaths
            ? includePaths.split("\n").filter((p) => p.trim())
            : undefined,
          excludePaths: excludePaths
            ? excludePaths.split("\n").filter((p) => p.trim())
            : undefined,
          downloadCodeFiles,
        },
      };

      await createSource(params);

      // Reset form
      setUrl("");
      setTitle("");
      setShowAdvanced(false);
      setMaxPages(1000);
      setMaxDepth(10);
      setConcurrency(3);
      setThrottleMs(500);
      setIncludePaths("");
      setExcludePaths("");
      setDownloadCodeFiles(true);

      onSourceAdded();
    } catch (err) {
      console.error("Error creating docs source:", err);
      // Error will be handled by the useCreateDocsSource hook and shown in the UI
    }
  };

  const handleUrlChange = (value: string) => {
    setUrl(value);

    // Auto-generate title from URL
    if (value && !title) {
      try {
        const urlObj = new URL(value);
        setTitle(urlObj.hostname);
      } catch {
        // Invalid URL, ignore
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Globe className="w-5 h-5 mr-2" />
            Add Documentation Source
          </DialogTitle>
          <DialogDescription>
            Index a documentation website to make it searchable in your AI
            conversations
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">Documentation URL *</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://nextjs.org/docs"
                value={url}
                onChange={(e) => handleUrlChange(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Enter the base URL of the documentation site you want to index
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title (optional)</Label>
              <Input
                id="title"
                placeholder="Next.js Documentation"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                A friendly name for this documentation source
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Settings className="w-4 h-4" />
                <Label>Advanced Options</Label>
              </div>
              <Switch
                checked={showAdvanced}
                onCheckedChange={setShowAdvanced}
              />
            </div>

            {showAdvanced && (
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center">
                      <Zap className="w-4 h-4 mr-2" />
                      Crawling Limits
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="maxPages" className="text-xs">
                          Max Pages
                        </Label>
                        <Input
                          id="maxPages"
                          type="number"
                          min="1"
                          max="10000"
                          value={maxPages}
                          onChange={(e) => setMaxPages(Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="maxDepth" className="text-xs">
                          Max Depth
                        </Label>
                        <Input
                          id="maxDepth"
                          type="number"
                          min="1"
                          max="20"
                          value={maxDepth}
                          onChange={(e) => setMaxDepth(Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="concurrency" className="text-xs">
                          Concurrency
                        </Label>
                        <Input
                          id="concurrency"
                          type="number"
                          min="1"
                          max="10"
                          value={concurrency}
                          onChange={(e) =>
                            setConcurrency(Number(e.target.value))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="throttle" className="text-xs">
                          Throttle (ms)
                        </Label>
                        <Input
                          id="throttle"
                          type="number"
                          min="0"
                          max="5000"
                          value={throttleMs}
                          onChange={(e) =>
                            setThrottleMs(Number(e.target.value))
                          }
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center">
                      <Filter className="w-4 h-4 mr-2" />
                      Path Filters
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="includePaths" className="text-xs">
                        Include Paths (one per line)
                      </Label>
                      <textarea
                        id="includePaths"
                        className="w-full h-20 px-3 py-2 text-sm border rounded-md resize-none"
                        placeholder="/docs&#10;/api&#10;/guides"
                        value={includePaths}
                        onChange={(e) => setIncludePaths(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Only crawl URLs containing these paths (regex supported)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="excludePaths" className="text-xs">
                        Exclude Paths (one per line)
                      </Label>
                      <textarea
                        id="excludePaths"
                        className="w-full h-20 px-3 py-2 text-sm border rounded-md resize-none"
                        placeholder="/blog&#10;/changelog&#10;\.pdf$"
                        value={excludePaths}
                        onChange={(e) => setExcludePaths(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Skip URLs containing these paths (regex supported)
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="downloadCodeFiles">
                      Download code files
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Also download and index linked code files (.js, .ts, .py,
                      etc.)
                    </p>
                  </div>
                  <Switch
                    id="downloadCodeFiles"
                    checked={downloadCodeFiles}
                    onCheckedChange={setDownloadCodeFiles}
                  />
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="text-sm text-destructive">
              {error instanceof Error ? error.message : String(error)}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !url.trim()}>
              {isLoading ? "Adding..." : "Add Source"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
