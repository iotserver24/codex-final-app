import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ExternalLink, KeyRound, AlertTriangle } from "lucide-react";
import { IpcClient } from "@/ipc/ipc_client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSettings } from "@/hooks/useSettings";
import { showSuccess } from "@/lib/toast";
import { providerSettingsRoute } from "@/routes/settings/providers/$provider";

interface XibeSetupPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onDismissForSession?: () => void;
}

export function XibeSetupPopup({
  isOpen,
  onClose,
  onDismissForSession,
}: XibeSetupPopupProps) {
  const navigate = useNavigate();
  const { updateSettings } = useSettings();
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSaveKey = async () => {
    if (!apiKeyInput.trim()) {
      setSaveError("API Key cannot be empty.");
      return;
    }

    if (!apiKeyInput.startsWith("XAI_")) {
      setSaveError("API Key must start with 'XAI_'");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      await updateSettings({
        xibeApiKey: {
          value: apiKeyInput.trim(),
        },
      });
      setApiKeyInput("");
      showSuccess("Xibe API key configured successfully!");
      onClose();
    } catch (error: any) {
      console.error("Error saving Xibe API key:", error);
      setSaveError(error.message || "Failed to save API key.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGoToSettings = () => {
    navigate({
      to: providerSettingsRoute.id,
      params: { provider: "codex" },
    });
    onClose();
  };

  const handleLater = () => {
    onDismissForSession?.();
    onClose();
  };

  const handleSignUp = async () => {
    try {
      await IpcClient.getInstance().openExternalUrl("https://xibe.app");
    } catch (error) {
      console.error("Failed to open xibe.app:", error);
      // Fallback to window.open if IPC fails
      window.open("https://xibe.app", "_blank");
    }
  };

  const handleDashboard = async () => {
    try {
      await IpcClient.getInstance().openExternalUrl(
        "https://xibe.app/dashboard",
      );
    } catch (error) {
      console.error("Failed to open xibe dashboard:", error);
      // Fallback to window.open if IPC fails
      window.open("https://xibe.app/dashboard", "_blank");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-blue-600" />
            Setup Xibe AI
          </DialogTitle>
          <DialogDescription>
            Get started with AI features by setting up your free Xibe API key.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>API Key Required</AlertTitle>
            <AlertDescription>
              You need a Xibe AI API key to use AI features. Sign up for free at{" "}
              <button
                onClick={handleSignUp}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 inline-flex items-center gap-1"
              >
                xibe.app
                <ExternalLink className="h-3 w-3" />
              </button>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="xibe-api-key">API Key</Label>
            <div className="flex gap-2">
              <Input
                id="xibe-api-key"
                type="password"
                placeholder="XAI_your-api-key-here"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                disabled={isSaving}
                className="flex-1"
              />
              <Button
                onClick={handleSaveKey}
                disabled={isSaving || !apiKeyInput.trim()}
                className="px-6"
              >
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Your API key starts with "XAI_" and can be found in your{" "}
              <button
                onClick={handleDashboard}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Xibe dashboard
              </button>
            </p>
          </div>

          {saveError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{saveError}</AlertDescription>
            </Alert>
          )}

          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Sign up for free at xibe.app</p>
            <p>• Get your API key from the dashboard</p>
            <p>• Usage is tracked and limited based on your plan</p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleLater}
            className="w-full sm:w-auto"
          >
            Ask me later
          </Button>
          <Button
            variant="outline"
            onClick={handleGoToSettings}
            className="w-full sm:w-auto"
          >
            Go to Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Hook for managing Xibe setup popup state
export function useXibeSetupPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [dismissedForSession, setDismissedForSession] = useState(false);

  const showSetup = () => {
    // Don't show if user already dismissed for this session
    if (dismissedForSession) {
      console.log("Xibe setup popup dismissed for this session, not showing");
      return;
    }
    setIsOpen(true);
  };

  const hideSetup = () => {
    setIsOpen(false);
  };

  const dismissForSession = () => {
    setDismissedForSession(true);
    hideSetup();
  };

  return {
    isOpen,
    showSetup,
    hideSetup,
    dismissForSession,
  };
}
