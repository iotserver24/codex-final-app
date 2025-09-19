import { useMemo, useState } from "react";
import { useSharePreviewE2B } from "@/hooks/useSharePreviewE2B";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Globe,
  RefreshCw,
  Timer,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Terminal,
  Eye,
} from "lucide-react";

type Props = {
  appId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode; // trigger
};

export function E2BSharePreviewPopover({
  appId,
  open,
  onOpenChange,
  children,
}: Props) {
  const { useStatus, useLogs, useProgress, useVersions } =
    useSharePreviewE2B(appId);
  const { data: status } = useStatus();
  const { data: logs } = useLogs();
  const { data: progress } = useProgress();
  const { data: versions } = useVersions();
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadTimeout, setLoadTimeout] = useState<NodeJS.Timeout | null>(null);

  const url = status?.url;
  const previewUrl = useMemo(() => {
    if (!url) return undefined;
    // Only add cache busting when explicitly reloading
    if (reloadKey > 0) {
      const u = new URL(url);
      u.searchParams.set("_", String(reloadKey));
      return u.toString();
    }
    return url;
  }, [url, reloadKey]);

  const handleReload = () => {
    setIsLoading(true);
    setReloadKey(Date.now());

    // Clear existing timeout
    if (loadTimeout) {
      clearTimeout(loadTimeout);
    }

    // Set timeout to hide loading after 10 seconds
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 10000);

    setLoadTimeout(timeout);
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
    if (loadTimeout) {
      clearTimeout(loadTimeout);
      setLoadTimeout(null);
    }
  };

  if (!appId) {
    return (
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>{children}</PopoverTrigger>
        <PopoverContent align="start" sideOffset={8} className="w-[400px] p-0">
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <AlertCircle className="w-8 h-8 text-muted-foreground mb-3" />
            <h3 className="text-sm font-medium text-muted-foreground mb-1">
              No App Selected
            </h3>
            <p className="text-xs text-muted-foreground">
              Select an app to view preview
            </p>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-[480px] p-0 overflow-hidden"
      >
        <div className="bg-gradient-to-br from-background to-muted/20">
          {/* Header */}
          <div className="p-2.5 border-b bg-card/50 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-primary/10">
                  <Globe className="w-3.5 h-3.5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Live Preview</h3>
                  <p className="text-xs text-muted-foreground">E2B Sandbox</p>
                </div>
              </div>
              {status?.running ? (
                <Badge variant="outline" className="gap-1 text-xs">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  Active
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <RefreshCw className="w-3 h-3" />
                  {progress?.lines?.length ? "Deploying" : "Ready"}
                </Badge>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-2.5 space-y-2 max-h-[280px] overflow-auto">
            {status?.running && url ? (
              <div className="space-y-2">
                {/* Preview */}
                <Card className="overflow-hidden">
                  <CardHeader className="pb-1">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Eye className="w-3.5 h-3.5" />
                      Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="h-[180px] w-full rounded-md border overflow-hidden bg-gradient-to-br from-muted/50 to-muted/20 shadow-inner relative">
                      {!previewUrl ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                          <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                            <Globe className="w-8 h-8 opacity-50" />
                            <span>Preview not available</span>
                          </div>
                        </div>
                      ) : (
                        <>
                          {isLoading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-muted/80 backdrop-blur-sm z-10">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Loading preview...
                              </div>
                            </div>
                          )}
                          <iframe
                            key={url}
                            src={previewUrl}
                            title="Live Preview"
                            className="w-full h-full border-0"
                            onLoad={handleIframeLoad}
                            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                          />
                        </>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-muted-foreground mb-1">
                          Share URL
                        </div>
                        <div className="flex items-center gap-1.5 p-1.5 rounded-md bg-muted/50 border">
                          <Globe className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          <a
                            className="text-xs font-mono truncate hover:text-primary transition-colors"
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {url}
                          </a>
                        </div>
                      </div>

                      <div className="flex gap-1">
                        <button
                          onClick={handleReload}
                          className="p-1.5 rounded-md border bg-background hover:bg-muted transition-colors"
                          title="Reload preview"
                        >
                          <RefreshCw className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() =>
                            url ? window.open(url, "_blank") : undefined
                          }
                          className="p-1.5 rounded-md border bg-background hover:bg-muted transition-colors"
                          title="Open in browser"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Versions */}
                {(versions?.versions || []).length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Timer className="w-3.5 h-3.5" />
                          Versions
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {versions.versions.length}/3
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1.5 max-h-[80px] overflow-auto">
                        {versions.versions.map(
                          (v: {
                            version: number;
                            url: string;
                            expiresAt: number;
                          }) => {
                            const remainingMs = Math.max(
                              0,
                              v.expiresAt - Date.now(),
                            );
                            const mins = Math.floor(remainingMs / 60000);
                            const secs = Math.floor(
                              (remainingMs % 60000) / 1000,
                            );
                            const isExpiring = remainingMs < 300000; // 5 minutes

                            return (
                              <div
                                key={v.version}
                                className="flex items-center justify-between gap-2 p-2 rounded-md border bg-card/50 hover:bg-card/80 transition-colors"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      v{v.version}
                                    </Badge>
                                    {isExpiring && (
                                      <Badge
                                        variant="destructive"
                                        className="text-xs"
                                      >
                                        Expiring
                                      </Badge>
                                    )}
                                  </div>
                                  <a
                                    className="text-xs font-mono text-muted-foreground hover:text-primary transition-colors truncate block"
                                    href={v.url}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    {v.url}
                                  </a>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`text-xs font-mono ${isExpiring ? "text-destructive" : "text-muted-foreground"}`}
                                  >
                                    {mins}:{String(secs).padStart(2, "0")}
                                  </div>
                                  <button
                                    className="p-1 rounded hover:bg-muted transition-colors"
                                    onClick={() => window.open(v.url, "_blank")}
                                    title="Open version"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            );
                          },
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              /* Logs */
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5" />
                    {progress?.lines?.length
                      ? "Deployment Logs"
                      : "Ready to Deploy"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px] rounded-lg border border-dashed border-muted-foreground/25 p-3 overflow-auto bg-muted/20">
                    <div className="text-xs font-mono whitespace-pre-wrap text-muted-foreground">
                      {(progress?.lines || []).join("\n")}
                      {(progress?.lines || []).length > 0 && "\n"}
                      {(logs?.logs || "").slice(-2500)}
                      {!progress?.lines?.length && !logs?.logs && (
                        <div className="text-center py-6">
                          <Globe className="w-8 h-8 mx-auto text-muted-foreground/50 mb-3" />
                          <p className="text-muted-foreground text-sm">
                            Click "Start & Share" to deploy
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
