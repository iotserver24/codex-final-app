import {
  ArrowLeft,
  ArrowUp,
  Circle,
  ExternalLink,
  GiftIcon,
  KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { IpcClient } from "@/ipc/ipc_client";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {} from "react";

interface ProviderSettingsHeaderProps {
  providerDisplayName: string;
  isConfigured: boolean;
  isLoading: boolean;
  hasFreeTier?: boolean;
  providerWebsiteUrl?: string;
  isDyad: boolean;
  isCodeX?: boolean;
  onBackClick: () => void;
}

function getKeyButtonText({
  isConfigured,
  isDyad,
}: {
  isConfigured: boolean;
  isDyad: boolean;
}) {
  if (isDyad) {
    return "Ready"; // CodeX Auto is always ready
  }
  return isConfigured ? "Manage API Keys" : "Setup API Key";
}

export function ProviderSettingsHeader({
  providerDisplayName,
  isConfigured,
  isLoading,
  hasFreeTier,
  providerWebsiteUrl,
  isDyad,
  isCodeX: _isCodeX,
  onBackClick,
}: ProviderSettingsHeaderProps) {
  const handleGetApiKeyClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (providerWebsiteUrl) {
      IpcClient.getInstance().openExternalUrl(providerWebsiteUrl);
    }
  };

  const ConfigureButton = (
    <Button
      onClick={handleGetApiKeyClick}
      className="mb-4 cursor-pointer py-5 w-full ring-4 ring-primary/60 shadow-lg shadow-primary/30 border-primary/60"
    >
      <KeyRound className="mr-2 h-4 w-4" />
      {getKeyButtonText({ isConfigured, isDyad })}
      <ExternalLink className="ml-2 h-4 w-4" />
    </Button>
  );

  return (
    <>
      <Button
        onClick={onBackClick}
        variant="outline"
        size="sm"
        className="flex items-center gap-2 mb-4 bg-(--background-lightest) py-5"
      >
        <ArrowLeft className="h-4 w-4" />
        Go Back
      </Button>

      <div className="mb-6">
        <div className="flex items-center mb-1">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mr-3">
            {isDyad ? providerDisplayName : `Configure ${providerDisplayName}`}
          </h1>
          {isLoading ? (
            <Skeleton className="h-6 w-6 rounded-full" />
          ) : (
            <Circle
              className={`h-5 w-5 ${
                isConfigured
                  ? "fill-green-500 text-green-600"
                  : "fill-yellow-400 text-yellow-500"
              }`}
            />
          )}
          <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
            {isLoading
              ? "Loading..."
              : isDyad
                ? "Ready"
                : isConfigured
                  ? "Setup Complete"
                  : "Not Setup"}
          </span>
        </div>
        {!isLoading && hasFreeTier && (
          <span className="text-blue-600 mt-2 dark:text-blue-400 text-sm font-medium bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-full inline-flex items-center">
            <GiftIcon className="w-4 h-4 mr-1" />
            Free tier available
          </span>
        )}
      </div>

      {providerWebsiteUrl &&
        !isLoading &&
        (!isConfigured ? (
          <Popover defaultOpen>
            <PopoverTrigger asChild>{ConfigureButton}</PopoverTrigger>
            <PopoverContent
              side="bottom"
              align="center"
              className="w-fit py-2 px-3 bg-background text-primary shadow-lg ring-1 ring-primary/40"
            >
              <div className="text-sm font-semibold flex items-center gap-1">
                <ArrowUp /> Create your API key with {providerDisplayName}
              </div>
            </PopoverContent>
          </Popover>
        ) : (
          ConfigureButton
        ))}
    </>
  );
}
