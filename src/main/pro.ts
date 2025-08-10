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
    enableDyadPro: true, // Always enabled for free codeX Pro
  });
}
