import { readSettings, writeSettings } from "./settings";

export function handleCodexProReturn({ apiKey }: { apiKey: string }) {
  const settings = readSettings();
  // codeX Pro is always enabled for free, but we'll keep the API key if provided
  writeSettings({
    providerSettings: {
      ...settings.providerSettings,
      auto: {
        ...settings.providerSettings.auto,
        apiKey: {
          value: apiKey || "free-codex-pro-key", // Default free key
        },
      },
    },
    enableCodexPro: true, // Always enabled - CodeX Pro is now free and client-side
  });
}
