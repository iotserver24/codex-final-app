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
import { Badge } from "./ui/badge";
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

interface UpdateInfo {
  version: string;
  date: string;
  description: string;
  isBeta: boolean;
  downloadUrl: string;
  changelogUrl?: string;
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

  const handleViewChangelog = async () => {
    if (!updateInfo?.changelogUrl) return;

    try {
      await IpcClient.getInstance().openExternalUrl(updateInfo.changelogUrl);
    } catch (error: any) {
      showError(error.message || "Failed to open changelog");
    }
  };

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
              {updateInfo.isBeta && (
                <Badge variant="secondary" className="text-xs">
                  Beta
                </Badge>
              )}
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
            <ScrollArea className="h-32 w-full">
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {updateInfo.description}
              </p>
            </ScrollArea>
          </div>

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
          {updateInfo.changelogUrl && (
            <Button
              variant="outline"
              onClick={handleViewChangelog}
              className="flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              View Changelog
            </Button>
          )}
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
        showUpdate({
          version: result.latestVersion,
          date: result.releaseInfo.date,
          description: result.releaseInfo.description,
          isBeta: result.releaseInfo.isStable === false,
          downloadUrl: result.downloadUrl,
          changelogUrl: result.releaseInfo.changelogUrl,
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
