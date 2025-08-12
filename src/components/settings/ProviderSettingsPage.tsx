import { useState, useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { useLanguageModelProviders } from "@/hooks/useLanguageModelProviders";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {} from "@/components/ui/accordion";

import { Button } from "@/components/ui/button";
// import { showError } from "@/lib/toast";
import { UserSettings } from "@/lib/schemas";

import { ProviderSettingsHeader } from "./ProviderSettingsHeader";
import { ApiKeyConfiguration } from "./ApiKeyConfiguration";
import { ModelsSection } from "./ModelsSection";

interface ProviderSettingsPageProps {
  provider: string;
}

export function ProviderSettingsPage({ provider }: ProviderSettingsPageProps) {
  const {
    settings,
    envVars,
    loading: settingsLoading,
    error: settingsError,
    updateSettings,
  } = useSettings();

  // Fetch all providers
  const {
    data: allProviders,
    isLoading: providersLoading,
    error: providersError,
  } = useLanguageModelProviders();

  // Find the specific provider data from the fetched list
  const providerData = allProviders?.find((p) => p.id === provider);
  const supportsCustomModels =
    providerData?.type === "custom" || providerData?.type === "cloud";

  const isCodeXAuto = provider === "auto";
  const isCodeX = provider === "codex";

  const [apiKeyInput, setApiKeyInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const router = useRouter();

  // Use fetched data (or defaults for CodeX Auto)
  const providerDisplayName = isCodeXAuto
    ? "CodeX Auto"
    : (providerData?.name ?? "Unknown Provider");
  const providerWebsiteUrl = isCodeXAuto
    ? "https://codex.anishkumar.tech/docs/guides/ai-models/pro-modes#smart-context"
    : providerData?.websiteUrl;
  const hasFreeTier = isCodeXAuto ? false : providerData?.hasFreeTier;
  const envVarName = isCodeXAuto ? undefined : providerData?.envVarName;

  // Use provider ID (which is the 'provider' prop)
  const userApiKey = settings?.providerSettings?.[provider]?.apiKey?.value;

  // --- Configuration Logic --- Updated Priority ---
  const isValidUserKey =
    !!userApiKey &&
    !userApiKey.startsWith("Invalid Key") &&
    userApiKey !== "Not Set";
  const hasEnvKey = !!(envVarName && envVars[envVarName]);

  // codeX is always configured since it uses hardcoded token
  // CodeX Auto is always configured since it doesn't need API keys
  const isConfigured =
    isCodeX || isCodeXAuto ? true : isValidUserKey || hasEnvKey;

  // --- Save Handler ---
  const handleSaveKey = async () => {
    if (!apiKeyInput) {
      setSaveError("API Key cannot be empty.");
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      const settingsUpdate: Partial<UserSettings> = {
        providerSettings: {
          ...settings?.providerSettings,
          [provider]: {
            ...settings?.providerSettings?.[provider],
            apiKey: {
              value: apiKeyInput,
            },
          },
        },
      };
      if (isCodeXAuto) {
        settingsUpdate.enableCodexPro = true;
      }
      await updateSettings(settingsUpdate);
      setApiKeyInput(""); // Clear input on success
      // Optionally show a success message
    } catch (error: any) {
      console.error("Error saving API key:", error);
      setSaveError(error.message || "Failed to save API key.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- Delete Handler ---
  const handleDeleteKey = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await updateSettings({
        providerSettings: {
          ...settings?.providerSettings,
          [provider]: {
            ...settings?.providerSettings?.[provider],
            apiKey: undefined,
          },
        },
      });
      // Optionally show a success message
    } catch (error: any) {
      console.error("Error deleting API key:", error);
      setSaveError(error.message || "Failed to delete API key.");
    } finally {
      setIsSaving(false);
    }
  };

  // Effect to clear input error when input changes
  useEffect(() => {
    if (saveError) {
      setSaveError(null);
    }
  }, [apiKeyInput]);

  // --- Loading State for Providers ---
  if (providersLoading) {
    return (
      <div className="min-h-screen px-8 py-4">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-8 w-24 mb-4" />
          <Skeleton className="h-10 w-1/2 mb-6" />
          <Skeleton className="h-10 w-48 mb-4" />
          <div className="space-y-4 mt-6">
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // --- Error State for Providers ---
  if (providersError) {
    return (
      <div className="min-h-screen px-8 py-4">
        <div className="max-w-4xl mx-auto">
          <Button
            onClick={() => router.history.back()}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 mb-4 bg-(--background-lightest) py-5"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mr-3 mb-6">
            Configure Provider
          </h1>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error Loading Provider Details</AlertTitle>
            <AlertDescription>
              Could not load provider data: {providersError.message}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // Handle case where provider is not found (e.g., invalid ID in URL)
  if (!providerData && !isCodeXAuto) {
    return (
      <div className="min-h-screen px-8 py-4">
        <div className="max-w-4xl mx-auto">
          <Button
            onClick={() => router.history.back()}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 mb-4 bg-(--background-lightest) py-5"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mr-3 mb-6">
            Provider Not Found
          </h1>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              The provider with ID "{provider}" could not be found.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-8 py-4">
      <div className="max-w-4xl mx-auto">
        <ProviderSettingsHeader
          providerDisplayName={providerDisplayName}
          isConfigured={isConfigured}
          isLoading={settingsLoading}
          hasFreeTier={hasFreeTier}
          providerWebsiteUrl={providerWebsiteUrl}
          isDyad={isCodeXAuto}
          isCodeX={isCodeX}
          onBackClick={() => router.history.back()}
        />

        {settingsLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
          </div>
        ) : settingsError ? (
          <Alert variant="destructive">
            <AlertTitle>Error Loading Settings</AlertTitle>
            <AlertDescription>
              Could not load configuration data: {settingsError.message}
            </AlertDescription>
          </Alert>
        ) : isCodeX ? (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800">
            <h3 className="text-lg font-medium text-green-800 dark:text-green-200 mb-2">
              ✅ codeX Provider Ready
            </h3>
            <p className="text-green-700 dark:text-green-300">
              The codeX provider is configured and ready to use with 23 AI
              models available.
            </p>
          </div>
        ) : isCodeXAuto ? (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
            <h3 className="text-lg font-medium text-blue-800 dark:text-blue-200 mb-2">
              ✅ CodeX Auto Ready
            </h3>
            <p className="text-blue-700 dark:text-blue-300">
              CodeX Auto is configured and ready to use. It automatically
              selects the best model for your tasks.
            </p>
          </div>
        ) : (
          <ApiKeyConfiguration
            provider={provider}
            providerDisplayName={providerDisplayName}
            settings={settings}
            envVars={envVars}
            envVarName={envVarName}
            isSaving={isSaving}
            saveError={saveError}
            apiKeyInput={apiKeyInput}
            onApiKeyInputChange={setApiKeyInput}
            onSaveKey={handleSaveKey}
            onDeleteKey={handleDeleteKey}
            isDyad={isCodeXAuto}
          />
        )}

        {/* Conditionally render CustomModelsSection */}
        {supportsCustomModels && providerData && (
          <ModelsSection providerId={providerData.id} />
        )}
        <div className="h-24"></div>
      </div>
    </div>
  );
}
