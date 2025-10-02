import { useState } from "react";
import { ExternalLink, KeyRound, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSettings } from "@/hooks/useSettings";

export function XibeApiKeySettings() {
  const { settings, updateSettings } = useSettings();
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const currentApiKey = settings?.xibeApiKey?.value;
  const hasApiKey =
    !!currentApiKey &&
    !currentApiKey.startsWith("Invalid Key") &&
    currentApiKey !== "Not Set";

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
    } catch (error: any) {
      console.error("Error saving Xibe API key:", error);
      setSaveError(error.message || "Failed to save API key.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteKey = async () => {
    setIsSaving(true);
    setSaveError(null);

    try {
      await updateSettings({
        xibeApiKey: undefined,
      });
    } catch (error: any) {
      console.error("Error deleting Xibe API key:", error);
      setSaveError(error.message || "Failed to delete API key.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          Xibe AI API Key
        </CardTitle>
        <CardDescription>
          Required for using AI features. Get your free API key from{" "}
          <a
            href="https://xibe.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 inline-flex items-center gap-1"
          >
            xibe.app
            <ExternalLink className="h-3 w-3" />
          </a>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasApiKey && (
          <Alert>
            <KeyRound className="h-4 w-4" />
            <AlertTitle className="flex justify-between items-center">
              <span>Current API Key</span>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteKey}
                disabled={isSaving}
                className="flex items-center gap-1 h-7 px-2"
              >
                Delete
              </Button>
            </AlertTitle>
            <AlertDescription>
              <p className="font-mono text-sm">{currentApiKey}</p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                API key is configured and active.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {!hasApiKey && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>API Key Required</AlertTitle>
            <AlertDescription>
              You need a Xibe AI API key to use AI features. Sign up for free at{" "}
              <a
                href="https://xibe.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                xibe.app
              </a>
            </AlertDescription>
          </Alert>
        )}

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
            <a
              href="https://xibe.app/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Xibe dashboard
            </a>
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
      </CardContent>
    </Card>
  );
}
