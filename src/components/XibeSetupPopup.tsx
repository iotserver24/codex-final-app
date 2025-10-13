import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { KeyRound, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  // Removing manual key entry: key is managed automatically after login

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
            <AlertTitle>Connected via Desktop</AlertTitle>
            <AlertDescription>
              API access is managed automatically after signing in from the
              desktop app.
            </AlertDescription>
          </Alert>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Sign in from the desktop app to link your device</p>
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
