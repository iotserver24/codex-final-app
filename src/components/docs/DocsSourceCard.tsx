import React from "react";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  AlertCircle,
  ExternalLink,
  MoreVertical,
  RefreshCw,
  Trash2,
  Download,
  FileText,
  Pause,
  Play,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  useDeleteDocsSource,
  useReindexDocs,
  useGenerateDocsEmbeddings,
  useStopDocsCrawling,
  usePauseDocsCrawling,
  useResumeDocsCrawling,
} from "../../hooks/useDocs";
import type { DocsSource, DocsCrawlProgress } from "../../ipc/ipc_types";
import { IpcClient } from "../../ipc/ipc_client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface DocsSourceCardProps {
  source: DocsSource;
  onUpdate: () => void;
}

export function DocsSourceCard({ source, onUpdate }: DocsSourceCardProps) {
  const [showLiveData, setShowLiveData] = React.useState(false);
  const [currentUrl, setCurrentUrl] = React.useState<string | null>(null);

  const { deleteSource, isLoading: deleting } = useDeleteDocsSource();
  const { reindexSource, isLoading: reindexing } = useReindexDocs();
  const { generateEmbeddings, isLoading: generatingEmbeddings } =
    useGenerateDocsEmbeddings();
  const { stopCrawling, isLoading: stopping } = useStopDocsCrawling();
  const { pauseCrawling, isLoading: pausing } = usePauseDocsCrawling();
  const { resumeCrawling, isLoading: resuming } = useResumeDocsCrawling();

  // Listen for crawl progress events
  React.useEffect(() => {
    const ipcClient = IpcClient.getInstance();
    const unsubscribe = ipcClient.onDocsCrawlProgress(
      (progress: DocsCrawlProgress) => {
        if (progress.sourceId === source.id) {
          setCurrentUrl(progress.currentUrl || null);
        }
      },
    );

    return unsubscribe;
  }, [source.id]);

  const handleDelete = async () => {
    if (
      confirm(
        "Are you sure you want to delete this documentation source? This will remove all indexed content.",
      )
    ) {
      try {
        await deleteSource(source.id);
        onUpdate();
        toast.success("Documentation source deleted");
      } catch (error) {
        console.error("Error deleting source:", error);
      }
    }
  };

  const handleReindex = async () => {
    try {
      await reindexSource(source.id);
      onUpdate();
      toast.success("Reindexing started");
    } catch (error) {
      console.error("Error reindexing:", error);
    }
  };

  const handleGenerateEmbeddings = async () => {
    try {
      await generateEmbeddings(source.id);
      onUpdate();
      toast.success("Embedding generation started");
    } catch (error) {
      console.error("Error generating embeddings:", error);
    }
  };

  const handleStopCrawling = async () => {
    try {
      await stopCrawling(source.id);
      onUpdate();
      toast.success("Crawling stopped");
    } catch (error) {
      console.error("Error stopping crawling:", error);
    }
  };

  const handlePauseCrawling = async () => {
    try {
      await pauseCrawling(source.id);
      onUpdate();
      toast.success("Crawling paused");
    } catch (error) {
      console.error("Error pausing crawling:", error);
    }
  };

  const handleResumeCrawling = async () => {
    try {
      await resumeCrawling(source.id);
      onUpdate();
      toast.success("Crawling resumed");
    } catch (error) {
      console.error("Error resuming crawling:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "crawling":
        return "secondary";
      case "paused":
        return "outline";
      case "failed":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <FileText className="w-3 h-3" />;
      case "crawling":
        return (
          <div className="w-3 h-3 animate-spin rounded-full border border-current border-t-transparent" />
        );
      case "paused":
        return <Pause className="w-3 h-3" />;
      case "failed":
        return <AlertCircle className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const progressPercentage =
    source.totalPages > 0 ? (source.crawledPages / source.totalPages) * 100 : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate">
              {source.title || new URL(source.url).hostname}
            </CardTitle>
            <CardDescription className="flex items-center space-x-2 mt-1">
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-xs hover:underline"
              >
                {source.url}
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Badge
              variant={getStatusColor(source.status)}
              className="flex items-center space-x-1"
            >
              {getStatusIcon(source.status)}
              <span className="capitalize">{source.status}</span>
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {source.status === "crawling" ? (
                  <>
                    <DropdownMenuItem
                      onClick={handlePauseCrawling}
                      disabled={pausing}
                    >
                      <Pause className="w-4 h-4 mr-2" />
                      Pause Crawling
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleStopCrawling}
                      disabled={stopping}
                    >
                      <AlertCircle className="w-4 h-4 mr-2" />
                      Stop Crawling
                    </DropdownMenuItem>
                  </>
                ) : source.status === "paused" ? (
                  <>
                    <DropdownMenuItem
                      onClick={handleResumeCrawling}
                      disabled={resuming}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Resume Crawling
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleStopCrawling}
                      disabled={stopping}
                    >
                      <AlertCircle className="w-4 h-4 mr-2" />
                      Stop Crawling
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem
                      onClick={handleReindex}
                      disabled={reindexing}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Reindex
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleGenerateEmbeddings}
                      disabled={generatingEmbeddings}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Generate Embeddings
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Progress for crawling */}
          {(source.status === "crawling" || source.status === "paused") && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Crawling progress</span>
                <span>
                  {source.crawledPages}/{source.totalPages} pages
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
          )}

          {/* Live data display */}
          {(source.status === "crawling" || source.status === "paused") && (
            <div className="space-y-2">
              <button
                onClick={() => setShowLiveData(!showLiveData)}
                className="flex items-center space-x-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showLiveData ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
                <span>Live crawl data</span>
              </button>

              {showLiveData && (
                <div className="bg-muted/50 rounded-md p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge
                      variant={getStatusColor(source.status)}
                      className="text-xs"
                    >
                      {getStatusIcon(source.status)}
                      <span className="ml-1 capitalize">{source.status}</span>
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Pages crawled:
                    </span>
                    <span>{source.crawledPages}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total pages:</span>
                    <span>{source.totalPages}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Progress:</span>
                    <span>{Math.round(progressPercentage)}%</span>
                  </div>

                  {currentUrl && (
                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          Currently crawling:
                        </span>
                      </div>
                      <div className="mt-1 p-2 bg-background rounded border text-xs font-mono break-all">
                        {currentUrl}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t">
                    <div className="flex space-x-2">
                      {source.status === "crawling" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handlePauseCrawling}
                          disabled={pausing}
                          className="h-6 text-xs"
                        >
                          <Pause className="w-3 h-3 mr-1" />
                          Pause
                        </Button>
                      )}
                      {source.status === "paused" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleResumeCrawling}
                          disabled={resuming}
                          className="h-6 text-xs"
                        >
                          <Play className="w-3 h-3 mr-1" />
                          Resume
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={handleStopCrawling}
                        disabled={stopping}
                        className="h-6 text-xs"
                      >
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Stop
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <span className="text-muted-foreground">
                {source.crawledPages} pages indexed
              </span>
              {source.lastCrawledAt && (
                <span className="text-muted-foreground">
                  Last crawled{" "}
                  {formatDistanceToNow(new Date(source.lastCrawledAt), {
                    addSuffix: true,
                  })}
                </span>
              )}
            </div>
          </div>

          {/* Error message */}
          {source.status === "failed" && source.errorMessage && (
            <div className="flex items-start space-x-2 p-2 bg-destructive/10 rounded text-xs text-destructive">
              <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>{source.errorMessage}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
