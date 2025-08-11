import {
  BookOpenIcon,
  BugIcon,
  ChevronLeftIcon,
  CheckIcon,
  XIcon,
  RefreshCw,
  Info,
  Gift,
  ExternalLink,
  Copy,
  UploadIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { showError } from "@/lib/toast";
import { useState, useEffect } from "react";
import { ChatLogsData } from "@/ipc/ipc_types";
import { IpcClient } from "@/ipc/ipc_client";
import { useSettings } from "@/hooks/useSettings";
import type { UpdateCheckResult } from "@/ipc/ipc_types";

interface HelpDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpDialog({ isOpen, onClose }: HelpDialogProps) {
  const [updateInfo, setUpdateInfo] = useState<null | {
    version: string;
    releaseNotes: string;
    downloadUrl: string;
  }>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const { settings } = useSettings();

  // Add missing state variables
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [chatLogsData, setChatLogsData] = useState<ChatLogsData | null>(null);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [appVersionState, setAppVersion] = useState<string | null>(null);

  // Function to reset all dialog state
  const resetDialogState = () => {
    setIsLoading(false);
    setIsUploading(false);
    setReviewMode(false);
    setChatLogsData(null);
    setUploadComplete(false);
    setSessionId("");
  };

  // Reset state when dialog closes or reopens
  useEffect(() => {
    if (!isOpen) {
      resetDialogState();
    }
  }, [isOpen]);

  useEffect(() => {
    // Fetch app version on mount
    IpcClient.getInstance().getAppVersion?.().then(setAppVersion);
  }, []);

  // Wrap the original onClose to also reset state
  const handleClose = () => {
    onClose();
  };

  const handleReportBug = async () => {
    setIsLoading(true);
    try {
      // Get system debug info
      const debugInfo = await IpcClient.getInstance().getSystemDebugInfo();

      // Create a formatted issue body with the debug info
      const issueBody = `
## Bug Description
<!-- Please describe the issue you're experiencing -->

## Steps to Reproduce
<!-- Please list the steps to reproduce the issue -->

## Expected Behavior
<!-- What did you expect to happen? -->

## Actual Behavior
<!-- What actually happened? -->

## System Information
- CodeX Version: ${debugInfo.codexVersion}
- Platform: ${debugInfo.platform}
- Architecture: ${debugInfo.architecture}
- Node Version: ${debugInfo.nodeVersion || "n/a"}
- PNPM Version: ${debugInfo.pnpmVersion || "n/a"}
- Node Path: ${debugInfo.nodePath || "n/a"}
- Telemetry ID: ${debugInfo.telemetryId || "n/a"}
- Model: ${debugInfo.selectedLanguageModel || "n/a"}

## Logs
\`\`\`
${debugInfo.logs.slice(-3_500) || "No logs available"}
\`\`\`
`;

      // Create the GitHub issue URL with the pre-filled body
      const encodedBody = encodeURIComponent(issueBody);
      const encodedTitle = encodeURIComponent("[bug] <add title>");
      const githubIssueUrl = `https://github.com/iotserver24/codex/issues/new?title=${encodedTitle}&labels=bug,filed-from-app&body=${encodedBody}`;

      // Open the pre-filled GitHub issue page
      IpcClient.getInstance().openExternalUrl(githubIssueUrl);
    } catch (error) {
      console.error("Failed to prepare bug report:", error);
      // Fallback to opening the regular GitHub issue page
      IpcClient.getInstance().openExternalUrl(
        "https://github.com/iotserver24/codex/issues/new",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitChatLogs = async () => {
    if (!chatLogsData) return;

    setIsUploading(true);
    try {
      // Prepare data for upload
      const chatLogsJson = {
        systemInfo: chatLogsData.debugInfo,
        chat: chatLogsData.chat,
        codebaseSnippet: chatLogsData.codebase,
      };

      // Get signed URL
      const response = await fetch(
        "https://upload-logs.codex.anishkumar.tech/generate-upload-url",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            extension: "json",
            contentType: "application/json",
          }),
        },
      );

      if (!response.ok) {
        showError(`Failed to get upload URL: ${response.statusText}`);
        throw new Error(`Failed to get upload URL: ${response.statusText}`);
      }

      const { uploadUrl, filename } = await response.json();

      await IpcClient.getInstance().uploadToSignedUrl(
        uploadUrl,
        "application/json",
        chatLogsJson,
      );

      // Extract session ID (filename without extension)
      const sessionId = filename.replace(".json", "");
      setSessionId(sessionId);
      setUploadComplete(true);
      setReviewMode(false);
    } catch (error) {
      console.error("Failed to upload chat logs:", error);
      alert("Failed to upload chat logs. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancelReview = () => {
    setReviewMode(false);
    setChatLogsData(null);
  };

  const handleOpenGitHubIssue = () => {
    // Create a GitHub issue with the session ID
    const issueBody = `
## Support Request
Session ID: ${sessionId}

## Issue Description
<!-- Please describe the issue you're experiencing -->

## Expected Behavior
<!-- What did you expect to happen? -->

## Actual Behavior
<!-- What actually happened? -->
`;

    const encodedBody = encodeURIComponent(issueBody);
    const encodedTitle = encodeURIComponent("[session report] <add title>");
    const githubIssueUrl = `https://github.com/iotserver24/codex/issues/new?title=${encodedTitle}&labels=support&body=${encodedBody}`;

    IpcClient.getInstance().openExternalUrl(githubIssueUrl);
    handleClose();
  };

  const handleDonate = () => {
    IpcClient.getInstance().openExternalUrl(
      "https://codex.anishkumar.tech/docs/support#-one-time-donations",
    );
  };

  const handleCheckForUpdates = async () => {
    try {
      const data: UpdateCheckResult =
        await IpcClient.getInstance().checkForUpdates();
      if (!appVersionState || !settings) {
        showError("Could not determine current app version or settings.");
        return;
      }

      // Get the appropriate channel based on user settings
      const channel = settings.releaseChannel === "beta" ? "beta" : "stable";
      const channelData = data[channel];

      const isNewer = (a: string, b: string) => {
        const pa = a.split(".").map(Number);
        const pb = b.split(".").map(Number);
        for (let i = 0; i < 3; i++) {
          if ((pa[i] || 0) < (pb[i] || 0)) return true;
          if ((pa[i] || 0) > (pb[i] || 0)) return false;
        }
        return false;
      };

      if (isNewer(appVersionState, channelData.version)) {
        setUpdateInfo({
          version: channelData.version,
          releaseNotes: channelData.releaseNotes,
          downloadUrl: channelData.downloadUrl,
        });
        setShowUpdateModal(true);
      } else {
        showError("You are using the latest version.");
      }
    } catch (e: any) {
      showError(e?.message || "Failed to check for updates.");
    }
  };

  const renderReleaseNotes = (notes: string | undefined) => {
    if (!notes) return null;
    return (
      <div
        className="max-h-40 overflow-y-auto whitespace-pre-line border rounded p-2 bg-muted text-sm mb-4"
        style={{ fontFamily: "inherit" }}
      >
        {notes.replace(/\n/g, "\n")}
      </div>
    );
  };

  if (uploadComplete) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Complete</DialogTitle>
          </DialogHeader>
          <div className="py-6 flex flex-col items-center space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-full">
              <CheckIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-medium">
              Chat Logs Uploaded Successfully
            </h3>
            <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded flex items-center space-x-2 font-mono text-sm">
              <Copy
                className="h-4 w-4 cursor-pointer"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(sessionId);
                  } catch (err) {
                    console.error("Failed to copy session ID:", err);
                  }
                }}
              />
              <span>{sessionId}</span>
            </div>
            <p className="text-center text-sm">
              Please open a GitHub issue so we can follow-up with you on this
              issue.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={handleOpenGitHubIssue} className="w-full">
              Open GitHub Issue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (reviewMode && chatLogsData) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Button
                variant="ghost"
                className="mr-2 p-0 h-8 w-8"
                onClick={handleCancelReview}
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </Button>
              OK to upload chat session?
            </DialogTitle>
          </DialogHeader>
          <DialogDescription>
            Please review the information that will be submitted. Your chat
            messages, system information, and a snapshot of your codebase will
            be included.
          </DialogDescription>

          <div className="space-y-4 overflow-y-auto flex-grow">
            <div className="border rounded-md p-3">
              <h3 className="font-medium mb-2">Chat Messages</h3>
              <div className="text-sm bg-slate-50 dark:bg-slate-900 rounded p-2 max-h-40 overflow-y-auto">
                {chatLogsData.chat.messages.map((msg) => (
                  <div key={msg.id} className="mb-2">
                    <span className="font-semibold">
                      {msg.role === "user" ? "You" : "Assistant"}:{" "}
                    </span>
                    <span>{msg.content}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border rounded-md p-3">
              <h3 className="font-medium mb-2">Codebase Snapshot</h3>
              <div className="text-sm bg-slate-50 dark:bg-slate-900 rounded p-2 max-h-40 overflow-y-auto font-mono">
                {chatLogsData.codebase}
              </div>
            </div>

            <div className="border rounded-md p-3">
              <h3 className="font-medium mb-2">Logs</h3>
              <div className="text-sm bg-slate-50 dark:bg-slate-900 rounded p-2 max-h-40 overflow-y-auto font-mono">
                {chatLogsData.debugInfo.logs}
              </div>
            </div>

            <div className="border rounded-md p-3">
              <h3 className="font-medium mb-2">System Information</h3>
              <div className="text-sm bg-slate-50 dark:bg-slate-900 rounded p-2 max-h-32 overflow-y-auto">
                <p>CodeX Version: {chatLogsData.debugInfo.codexVersion}</p>
                <p>Platform: {chatLogsData.debugInfo.platform}</p>
                <p>Architecture: {chatLogsData.debugInfo.architecture}</p>
                <p>
                  Node Version:{" "}
                  {chatLogsData.debugInfo.nodeVersion || "Not available"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-between mt-4 pt-2 sticky bottom-0 bg-background">
            <Button
              variant="outline"
              onClick={handleCancelReview}
              className="flex items-center"
            >
              <XIcon className="mr-2 h-4 w-4" /> Cancel
            </Button>
            <Button
              onClick={handleSubmitChatLogs}
              className="flex items-center"
              disabled={isUploading}
            >
              {isUploading ? (
                "Uploading..."
              ) : (
                <>
                  <CheckIcon className="mr-2 h-4 w-4" /> Upload
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Need help with CodeX?</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full flex items-center justify-start gap-2 text-lg py-4"
              onClick={() =>
                IpcClient.getInstance().openExternalUrl(
                  "https://codex.anishkumar.tech/docs",
                )
              }
            >
              <BookOpenIcon className="h-5 w-5" />
              Open Docs
            </Button>
            <div className="text-sm text-muted-foreground">
              Get help with common questions and issues.
            </div>
          </div>
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full flex items-center justify-start gap-2 text-lg py-4"
              onClick={handleReportBug}
              disabled={isLoading}
            >
              <BugIcon className="h-5 w-5" />
              Report a Bug
            </Button>
            <div className="text-sm text-muted-foreground">
              We'll auto-fill your report with system info and logs. You can
              review it for any sensitive info before submitting.
            </div>
          </div>
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full flex items-center justify-start gap-2 text-lg py-4 opacity-50 cursor-not-allowed"
              disabled={true}
            >
              <UploadIcon className="h-5 w-5" />
              Upload Chat Session
              <span className="ml-2 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                Coming Soon
              </span>
            </Button>
            <div className="text-sm text-muted-foreground">
              Share chat logs and code for troubleshooting. This feature will be
              available in a future release.
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 mt-8">
          <Button
            variant="outline"
            className="w-full flex items-center justify-start gap-2 text-lg py-3"
            onClick={handleDonate}
          >
            <Gift className="w-5 h-5" /> Donate
            <ExternalLink className="w-4 h-4 ml-1 opacity-60" />
          </Button>
          <Button
            variant="outline"
            className="w-full flex items-center justify-start gap-2 text-lg py-3"
            onClick={handleCheckForUpdates}
          >
            <RefreshCw className="w-5 h-5" /> Check for Updates
          </Button>
        </div>
        {/* Update Modal */}
        <Dialog open={showUpdateModal} onOpenChange={setShowUpdateModal}>
          <DialogContent>
            <div className="flex items-center gap-3 mb-2">
              <Info className="w-6 h-6 text-blue-500" />
              <DialogTitle>Update Available</DialogTitle>
            </div>
            <DialogDescription>
              <div className="mb-2">
                A new version (<b>{updateInfo?.version}</b>) is available!
              </div>
              <div className="font-semibold mb-1">Release Notes:</div>
              {renderReleaseNotes(updateInfo?.releaseNotes)}
            </DialogDescription>
            <DialogFooter>
              <Button
                variant="default"
                onClick={() => {
                  if (updateInfo?.downloadUrl) {
                    IpcClient.getInstance().openExternalUrl(
                      updateInfo.downloadUrl,
                    );
                  }
                }}
              >
                Download Update
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowUpdateModal(false)}
              >
                Remind Me Later
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
