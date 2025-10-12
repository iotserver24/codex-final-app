import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import {
  Download,
  ExternalLink,
  X,
  CheckCircle,
  Calendar,
  Tag,
  Sparkles,
} from "lucide-react";
import { IpcClient } from "../ipc/ipc_client";
import { showError, showSuccess } from "../lib/toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface UpdateInfo {
  version: string;
  date: string;
  description: string;
  downloadUrl: string;
  changelog?: string;
  platformButtons?: { label: string; url: string }[];
}

interface UpdatePopupProps {
  isOpen: boolean;
  onClose: () => void;
  updateInfo: UpdateInfo | null;
  onDownload?: () => void;
  onDismissForSession?: () => void;
}

export function UpdatePopup({
  isOpen,
  onClose,
  updateInfo,
  onDownload,
  onDismissForSession,
}: UpdatePopupProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!updateInfo?.downloadUrl) return;

    setIsDownloading(true);
    try {
      const result = await IpcClient.getInstance().downloadUpdate(
        updateInfo.downloadUrl,
      );

      if (result.success) {
        showSuccess("Update download started in your browser!");
        onDownload?.();
        onClose();
      } else {
        showError(result.error || "Failed to start download");
      }
    } catch (error: any) {
      showError(error.message || "Failed to download update");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleLater = () => {
    onDismissForSession?.();
    onClose();
  };

  // Removed unused handler: changelog renders inline

  if (!updateInfo) return null;

  const formattedDate = updateInfo.date
    ? new Date(updateInfo.date).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

  const hasPlatformButtons = Boolean(
    updateInfo.platformButtons && updateInfo.platformButtons.length > 0,
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-[90vw] max-h-[90vh] p-0 overflow-hidden">
        <div className="grid grid-cols-[300px_1fr] h-full">
          <div className="bg-muted/40 dark:bg-zinc-900/70 p-6 flex flex-col gap-6 border-r border-border/50">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/40">
                  <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-semibold">
                    Update Available
                  </DialogTitle>
                  <DialogDescription className="text-sm">
                    A new version of Xibe AI is ready to install.
                  </DialogDescription>
                </div>
              </div>

              <div className="rounded-xl border border-border/50 bg-background/80 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Tag className="w-4 h-4 text-muted-foreground" />
                  <span className="font-semibold">
                    Xibe AI {updateInfo.version}
                  </span>
                </div>
                {formattedDate && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Published {formattedDate}</span>
                  </div>
                )}
                <div className="flex items-start gap-2 rounded-lg bg-blue-50/80 dark:bg-blue-900/20 p-3 text-sm">
                  <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-medium text-blue-900 dark:text-blue-200">
                      Ready to update?
                    </p>
                    <p className="text-blue-800/80 dark:text-blue-300">
                      Download the latest installer tailored for your platform.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Button
                onClick={handleDownload}
                disabled={isDownloading}
                className="w-full h-12 text-base font-medium bg-blue-600 hover:bg-blue-700"
              >
                {isDownloading ? (
                  <>
                    <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Starting download...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Download for Windows
                  </>
                )}
              </Button>
              <Button variant="ghost" className="w-full" onClick={handleLater}>
                <X className="w-4 h-4 mr-2" />
                Remind me later
              </Button>
            </div>

            {hasPlatformButtons && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Other downloads
                </h3>
                <div className="space-y-1.5">
                  {updateInfo.platformButtons!.map((button, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(button.url, "_blank")}
                      className="w-full justify-between"
                    >
                      <span className="flex items-center gap-2 text-sm">
                        <Download className="w-4 h-4" />
                        {button.label}
                      </span>
                      <ExternalLink className="w-3 h-3 text-muted-foreground" />
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-6 flex flex-col h-full min-h-0">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 flex-shrink-0">
              <Sparkles className="w-4 h-4 text-blue-500" /> What's New
            </h3>
            <div className="rounded-xl border border-border/60 bg-background/80 flex-1 min-h-0">
              <ScrollArea className="h-full">
                <div className="p-6 prose prose-sm dark:prose-invert max-w-none text-muted-foreground break-words">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => (
                        <h1 className="text-xl font-semibold mb-3">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-lg font-semibold mb-2">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-base font-semibold mb-1">
                          {children}
                        </h3>
                      ),
                      p: ({ children }) => (
                        <p className="mb-3 leading-relaxed">{children}</p>
                      ),
                      ul: ({ children }) => (
                        <ul className="mb-3 list-disc pl-5 space-y-2">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="mb-3 list-decimal pl-5 space-y-2">
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => (
                        <li className="leading-relaxed">{children}</li>
                      ),
                      code: ({ children }) => (
                        <code className="bg-muted px-2 py-1 rounded text-xs font-mono">
                          {children}
                        </code>
                      ),
                      a: ({ href, children }) => (
                        <a
                          href={href}
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {children}
                        </a>
                      ),
                    }}
                  >
                    {updateInfo.changelog || updateInfo.description}
                  </ReactMarkdown>
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook for managing update popup state
export function useUpdatePopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [dismissedForSession, setDismissedForSession] = useState(false);

  const showUpdate = (info: UpdateInfo) => {
    // Don't show if user already dismissed for this session
    if (dismissedForSession) {
      console.log("Update popup dismissed for this session, not showing");
      return;
    }
    setUpdateInfo(info);
    setIsOpen(true);
  };

  const hideUpdate = () => {
    setIsOpen(false);
    setUpdateInfo(null);
  };

  const dismissForSession = () => {
    setDismissedForSession(true);
    hideUpdate();
  };

  const checkForUpdates = async () => {
    try {
      const result = await IpcClient.getInstance().checkForUpdatesXibe();

      if (result.hasUpdate && result.releaseInfo && result.downloadUrl) {
        // Create platform buttons from the API response
        let platformButtons: { label: string; url: string }[] = [];
        if (result.releaseInfo.items) {
          platformButtons = result.releaseInfo.items.flatMap((item) =>
            item.variants.map((variant) => ({
              label: `${item.platform} (${variant.arch}) - ${variant.packageType}`,
              url: variant.url,
            })),
          );
        }

        showUpdate({
          version: result.latestVersion,
          date: result.releaseInfo.updatedAt,
          description: result.releaseInfo.changelog,
          downloadUrl: result.downloadUrl,
          changelog: result.changelog,
          platformButtons,
        });
        return true;
      }
      return false;
    } catch (error: any) {
      showError(error.message || "Failed to check for updates");
      return false;
    }
  };

  return {
    isOpen,
    updateInfo,
    showUpdate,
    hideUpdate,
    dismissForSession,
    checkForUpdates,
  };
}
