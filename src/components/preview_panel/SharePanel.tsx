import { useEffect, useMemo, useState } from "react";
import { useAtomValue } from "jotai";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { Button } from "@/components/ui/button";
import { IpcClient } from "@/ipc/ipc_client";
import { useSharePreviewE2B } from "@/hooks/useSharePreviewE2B";
// import e2bQr from "../../../assets/e2b-qr.png";
import { useSettings } from "@/hooks/useSettings";
import { useNavigate } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  ExternalLink,
  RefreshCw,
  Globe,
  Settings,
  Zap,
  CheckCircle,
  AlertCircle,
  Copy,
  Share2,
  Timer,
} from "lucide-react";

export function SharePanel() {
  const appId = useAtomValue(selectedAppIdAtom);
  const { share, isLoading, useStatus, useLogs, useProgress, useVersions } =
    useSharePreviewE2B(appId);
  const { data: status } = useStatus();
  const { data: logs } = useLogs();
  const { data: progress } = useProgress();
  const { data: versions } = useVersions();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [duration, setDuration] = useState<number>(15);
  const [licenseKey, setLicenseKey] = useState<string>("");
  const [reloadKey, setReloadKey] = useState<number>(Date.now());
  const [copied, setCopied] = useState<boolean>(false);

  const url = status?.url;
  const cacheBustedUrl = useMemo(() => {
    if (!url) return undefined;
    const u = new URL(url);
    u.searchParams.set("_", String(reloadKey));
    return u.toString();
  }, [url, reloadKey]);

  useEffect(() => {
    if (
      (duration === 30 || duration === 60) &&
      !licenseKey &&
      settings?.polarLicenseKey?.value
    ) {
      setLicenseKey(settings.polarLicenseKey.value);
    }
  }, [duration, licenseKey, settings?.polarLicenseKey?.value]);

  const handleCopyUrl = async () => {
    if (url) {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getDurationBadgeVariant = (duration: number) => {
    if (duration <= 15) return "secondary";
    return "default";
  };

  const getDurationIcon = (duration: number) => {
    if (duration <= 15) return <Zap className="w-3 h-3" />;
    return <Timer className="w-3 h-3" />;
  };

  if (!appId) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-muted-foreground mb-2">
          No App Selected
        </h3>
        <p className="text-sm text-muted-foreground">
          Please select an app to share
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-background to-muted/20">
      {/* Header */}
      <div className="p-4 border-b bg-card/50 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Share2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Share Preview</h2>
              <p className="text-sm text-muted-foreground">
                Deploy and share your app with E2B
              </p>
            </div>
          </div>
          {status?.running && (
            <Badge variant="outline" className="gap-1">
              <CheckCircle className="w-3 h-3 text-green-500" />
              Running
            </Badge>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <select
              className="px-3 py-2 text-sm border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              value={duration}
              title="Select deployment duration"
              aria-label="Select deployment duration"
              onChange={(e) => setDuration(Number(e.target.value))}
            >
              <option value={5}>5 minutes</option>
              <option value={10}>10 minutes</option>
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>60 minutes</option>
            </select>
            <Badge
              variant={getDurationBadgeVariant(duration)}
              className="gap-1"
            >
              {getDurationIcon(duration)}
              {duration <= 15 ? "Free" : "Paid"}
            </Badge>
          </div>

          {(duration === 30 || duration === 60) &&
            !settings?.polarLicenseKey?.value && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => {
                  navigate({ to: "/settings" });
                  setTimeout(() => {
                    document
                      .getElementById("polar-license")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }, 50);
                }}
              >
                <Settings className="w-4 h-4" />
                Configure License
              </Button>
            )}

          <Button
            className="ml-auto gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            onClick={() =>
              share({
                durationMinutes: duration,
                licenseKey:
                  licenseKey || settings?.polarLicenseKey?.value || undefined,
              })
            }
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Starting...
              </>
            ) : status?.running ? (
              <>
                <Globe className="w-4 h-4" />
                New Version
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Start & Share
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {status?.running && url ? (
          <div className="space-y-4">
            {/* Preview Card */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Live Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="aspect-video w-full rounded-lg border overflow-hidden bg-gradient-to-br from-muted/50 to-muted/20 shadow-inner">
                  <iframe
                    key={reloadKey}
                    src={cacheBustedUrl}
                    title="Live Preview"
                    className="w-full h-full border-0"
                  />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      Share URL
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50 border">
                      <Globe className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <a
                        className="text-sm font-mono truncate hover:text-primary transition-colors"
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {url}
                      </a>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCopyUrl}
                      className="gap-2"
                    >
                      {copied ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      {copied ? "Copied!" : "Copy"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setReloadKey(Date.now())}
                      className="gap-2"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Reload
                    </Button>
                    <Button
                      size="sm"
                      onClick={() =>
                        url
                          ? IpcClient.getInstance().openExternalUrl(url)
                          : undefined
                      }
                      className="gap-2"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Versions Card */}
            {(versions?.versions || []).length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Timer className="w-4 h-4" />
                      Active Versions
                    </span>
                    <Badge variant="outline" className="text-xs">
                      Max 3 versions
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[200px] overflow-auto">
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
                        const secs = Math.floor((remainingMs % 60000) / 1000);
                        const isExpiring = remainingMs < 300000; // 5 minutes

                        return (
                          <div
                            key={v.version}
                            className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card/50 hover:bg-card/80 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs">
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
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  IpcClient.getInstance().openExternalUrl(v.url)
                                }
                              >
                                <ExternalLink className="w-3 h-3" />
                              </Button>
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
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                {isLoading ? "Deploying..." : "Ready to Share"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] rounded-lg border border-dashed border-muted-foreground/25 p-4 overflow-auto bg-muted/20">
                <div className="text-sm font-mono whitespace-pre-wrap text-muted-foreground">
                  {(progress?.lines || []).join("\n")}
                  {(progress?.lines || []).length > 0 && "\n"}
                  {(logs?.logs || "").slice(-4000)}
                  {!isLoading &&
                    (progress?.lines || []).length === 0 &&
                    !logs?.logs && (
                      <div className="text-center py-8">
                        <Globe className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                        <p className="text-muted-foreground">
                          Click "Start & Share" to deploy your app
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
  );
}
