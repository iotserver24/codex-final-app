import { ipcMain } from "electron";
import log from "electron-log";
import { app } from "electron";

const logger = log.scope("update-handlers");

// Types for Xibe AI API responses
interface XibeDownloadVariant {
  arch: string;
  packageType: string;
  url: string;
  sizeMB: number;
}

interface XibePlatformItem {
  platform: string;
  version: string;
  latest: boolean;
  variants: XibeDownloadVariant[];
}

interface XibeApiResponse {
  updatedAt: string;
  version: string;
  changelog: string;
  items: XibePlatformItem[];
}

interface UpdateCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseInfo: XibeApiResponse | null;
  downloadUrl: string | null;
  changelog?: string | null;
  error?: string;
}

export function registerUpdateHandlers() {
  // Check for updates using Xibe AI API
  ipcMain.handle(
    "check-for-updates-xibe",
    async (): Promise<UpdateCheckResult> => {
      try {
        const currentVersion = app.getVersion();
        logger.info("Checking for updates. Current version:", currentVersion);

        // Use the new unified API endpoint
        const apiUrl = "http://api.xibe.app/api/releases/latest";

        logger.info("Using API URL:", apiUrl);

        // Fetch update information
        const response = await fetch(apiUrl, {
          headers: {
            "User-Agent": "Xibe-AI-App/1.0",
            "Cache-Control": "no-cache",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data: XibeApiResponse = await response.json();

        if (!data || !data.version) {
          throw new Error("No release information found in API response");
        }

        logger.info("Latest version found:", data.version);

        // Compare versions using semantic versioning
        const hasUpdate = compareVersions(currentVersion, data.version) < 0;

        if (!hasUpdate) {
          logger.info("No update available. Current version is up to date.");
          return {
            hasUpdate: false,
            currentVersion,
            latestVersion: data.version,
            releaseInfo: null,
            downloadUrl: null,
            changelog: null,
          };
        }

        // Find the appropriate download URL for the current platform
        const downloadUrl = getDownloadUrlForPlatform(data, process.platform);

        logger.info(
          "Update available:",
          data.version,
          "Download URL:",
          downloadUrl,
        );

        return {
          hasUpdate: true,
          currentVersion,
          latestVersion: data.version,
          releaseInfo: data,
          downloadUrl,
          changelog: data.changelog,
        };
      } catch (error: any) {
        logger.error("Failed to check for updates:", error);
        return {
          hasUpdate: false,
          currentVersion: app.getVersion(),
          latestVersion: app.getVersion(),
          releaseInfo: null,
          downloadUrl: null,
          changelog: null,
          error: error.message,
        };
      }
    },
  );

  // Get current app version
  ipcMain.handle(
    "get-app-version-xibe",
    async (): Promise<{ version: string }> => {
      return { version: app.getVersion() };
    },
  );

  // Download and install update
  ipcMain.handle(
    "download-update",
    async (
      _,
      downloadUrl: string,
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        logger.info("Starting update download from:", downloadUrl);

        // Open the download URL in the default browser
        const { shell } = await import("electron");
        await shell.openExternal(downloadUrl);

        logger.info("Update download initiated in browser");
        return { success: true };
      } catch (error: any) {
        logger.error("Failed to download update:", error);
        return { success: false, error: error.message };
      }
    },
  );
}

// Helper function to compare semantic versions
function compareVersions(version1: string, version2: string): number {
  const v1parts = version1.split(".").map(Number);
  const v2parts = version2.split(".").map(Number);

  const maxLength = Math.max(v1parts.length, v2parts.length);

  for (let i = 0; i < maxLength; i++) {
    const v1part = v1parts[i] || 0;
    const v2part = v2parts[i] || 0;

    if (v1part < v2part) return -1;
    if (v1part > v2part) return 1;
  }

  return 0;
}

// Helper function to get download URL for current platform
function getDownloadUrlForPlatform(
  release: XibeApiResponse,
  platform: string,
): string | null {
  const platformName =
    platform === "win32"
      ? "windows"
      : platform === "darwin"
        ? "mac"
        : platform === "linux"
          ? "linux"
          : null;

  if (!platformName) {
    logger.warn("Unknown platform:", platform);
    return null;
  }

  const platformItem = release.items.find(
    (item) => item.platform === platformName,
  );
  if (!platformItem || !platformItem.variants.length) {
    logger.warn("No downloads found for platform:", platformName);
    return null;
  }

  // Select the best variant for the platform
  switch (platform) {
    case "win32":
      // Prefer x64 exe, fallback to ARM64 exe
      const windowsVariant =
        platformItem.variants.find(
          (v) => v.arch === "x64" && v.packageType === "exe",
        ) ||
        platformItem.variants.find(
          (v) => v.arch === "arm64" && v.packageType === "exe",
        ) ||
        platformItem.variants[0];
      return windowsVariant?.url || null;

    case "darwin":
      // Prefer ARM64 for Apple Silicon, fallback to x64
      const macVariant =
        platformItem.variants.find((v) => v.arch === "arm64") ||
        platformItem.variants.find((v) => v.arch === "x64") ||
        platformItem.variants[0];
      return macVariant?.url || null;

    case "linux":
      // Prefer DEB, fallback to RPM, then zip
      const linuxVariant =
        platformItem.variants.find((v) => v.packageType === "deb") ||
        platformItem.variants.find((v) => v.packageType === "rpm") ||
        platformItem.variants.find((v) => v.packageType === "zip") ||
        platformItem.variants[0];
      return linuxVariant?.url || null;

    default:
      return platformItem.variants[0]?.url || null;
  }
}
