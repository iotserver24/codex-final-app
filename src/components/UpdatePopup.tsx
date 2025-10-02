import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <DialogTitle className="text-xl">Update Available!</DialogTitle>
              <DialogDescription className="text-base">
                A new version of Xibe AI is ready to download
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Version Info */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-gray-500" />
              <span className="font-medium">Version {updateInfo.version}</span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {new Date(updateInfo.date).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Release Description */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">
              What's New
            </h4>
            <ScrollArea className="h-48 w-full">
              <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => (
                      <h1 className="text-lg font-semibold mb-2">{children}</h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-base font-semibold mb-2">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-sm font-semibold mb-1">{children}</h3>
                    ),
                    p: ({ children }) => <p className="mb-2">{children}</p>,
                    ul: ({ children }) => (
                      <ul className="list-disc list-inside mb-2">{children}</ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal list-inside mb-2">
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => <li className="mb-1">{children}</li>,
                    strong: ({ children }) => (
                      <strong className="font-semibold">{children}</strong>
                    ),
                    em: ({ children }) => (
                      <em className="italic">{children}</em>
                    ),
                    code: ({ children }) => (
                      <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-xs">
                        {children}
                      </code>
                    ),
                    a: ({ href, children }) => (
                      <a
                        href={href}
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
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

          {/* Platform-specific Downloads */}
          {updateInfo.platformButtons &&
            updateInfo.platformButtons.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">
                  Download Options
                </h4>
                <div className="grid grid-cols-1 gap-2">
                  {updateInfo.platformButtons.map((button, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(button.url, "_blank")}
                      className="justify-start text-left h-auto py-2"
                    >
                      <Download className="w-4 h-4 mr-2 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">
                          {button.label}
                        </div>
                      </div>
                      <ExternalLink className="w-3 h-3 ml-2 flex-shrink-0" />
                    </Button>
                  ))}
                </div>
              </div>
            )}

          {/* Update Notice */}
          <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg">
            <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="text-blue-800 dark:text-blue-200 font-medium">
                Ready to update?
              </p>
              <p className="text-blue-700 dark:text-blue-300 mt-1">
                Click "Download Update" to open the download page in your
                browser. The installer will guide you through the update
                process.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleLater}>
            <X className="w-4 h-4 mr-2" />
            Later
          </Button>
          <Button
            onClick={handleDownload}
            disabled={isDownloading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isDownloading ? (
              <>
                <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Starting Download...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Download Update
              </>
            )}
          </Button>
        </DialogFooter>
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
