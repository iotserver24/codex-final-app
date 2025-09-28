import { ipcMain } from "electron";
import log from "electron-log";
import { app } from "electron";

const logger = log.scope("update-handlers");

// Types for Xibe AI API responses
interface XibeDownloadInfo {
  name: string;
  url: string;
  type: string;
  arch: string;
}

interface XibeRelease {
  version: string;
  date: string;
  isLatest: boolean;
  isStable: boolean;
  description: string;
  downloads: {
    windows: XibeDownloadInfo[];
    macos: XibeDownloadInfo[];
    linux: XibeDownloadInfo[];
  };
}

interface XibeApiResponse {
  releases: XibeRelease[];
  latest: XibeRelease;
  totalVersions: number;
  apiInfo: {
    endpoints: Record<string, string>;
    usage: string;
  };
}

interface XibeBetaApiResponse {
  latest: XibeRelease;
  apiInfo: {
    endpoints: Record<string, string>;
  };
}

interface UpdateCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseInfo: XibeRelease | null;
  downloadUrl: string | null;
  changelogUrl?: string | null;
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

        // Get user settings to determine release channel
        const { readSettings } = await import("../../main/settings");
        const settings = readSettings();
        const isBeta = settings.releaseChannel === "beta";

        // Choose the appropriate API endpoint
        const apiUrl = isBeta
          ? "https://www.xibe.app/api/downloads-beta.json"
          : "https://www.xibe.app/api/downloads.json";

        logger.info(
          "Using API URL:",
          apiUrl,
          "Channel:",
          isBeta ? "beta" : "stable",
        );

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

        const data: XibeApiResponse | XibeBetaApiResponse =
          await response.json();

        // Parse the response based on channel
        let latestRelease: XibeRelease;
        if (isBeta) {
          latestRelease = (data as XibeBetaApiResponse).latest;
        } else {
          const stableData = data as XibeApiResponse;
          latestRelease = stableData.releases?.[0] || stableData.latest;
        }

        if (!latestRelease) {
          throw new Error("No release information found in API response");
        }

        logger.info("Latest version found:", latestRelease.version);

        // Compare versions using semantic versioning
        const hasUpdate =
          compareVersions(currentVersion, latestRelease.version) < 0;

        if (!hasUpdate) {
          logger.info("No update available. Current version is up to date.");
          return {
            hasUpdate: false,
            currentVersion,
            latestVersion: latestRelease.version,
            releaseInfo: null,
            downloadUrl: null,
            changelogUrl: null,
          };
        }

        // Find the appropriate download URL for the current platform
        const downloadUrl = getDownloadUrlForPlatform(
          latestRelease,
          process.platform,
        );

        logger.info(
          "Update available:",
          latestRelease.version,
          "Download URL:",
          downloadUrl,
        );

        return {
          hasUpdate: true,
          currentVersion,
          latestVersion: latestRelease.version,
          releaseInfo: latestRelease,
          downloadUrl,
          changelogUrl: latestRelease.changelogUrl,
        };
      } catch (error: any) {
        logger.error("Failed to check for updates:", error);
        return {
          hasUpdate: false,
          currentVersion: app.getVersion(),
          latestVersion: app.getVersion(),
          releaseInfo: null,
          downloadUrl: null,
          changelogUrl: null,
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
  release: XibeRelease,
  platform: string,
): string | null {
  const downloads = release.downloads;

  switch (platform) {
    case "win32":
      // Prefer x64, fallback to ARM64
      const windowsDownload =
        downloads.windows.find((d) => d.arch === "x64") || downloads.windows[0];
      return windowsDownload?.url || null;

    case "darwin":
      // Prefer ARM64 for Apple Silicon, fallback to x64
      const macosDownload =
        downloads.macos.find((d) => d.arch === "ARM64") ||
        downloads.macos.find((d) => d.arch === "x64") ||
        downloads.macos[0];
      return macosDownload?.url || null;

    case "linux":
      // Prefer DEB, fallback to RPM
      const linuxDownload =
        downloads.linux.find((d) => d.type === "deb") || downloads.linux[0];
      return linuxDownload?.url || null;

    default:
      logger.warn("Unknown platform:", platform);
      return null;
  }
}
