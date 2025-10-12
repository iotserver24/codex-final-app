import { app, BrowserWindow, dialog, Menu } from "electron";
import * as path from "node:path";
import { registerIpcHandlers } from "./ipc/ipc_host";
import { registerUpdateHandlers } from "./ipc/handlers/update_handlers";
import dotenv from "dotenv";
// @ts-ignore
import started from "electron-squirrel-startup";
import log from "electron-log";
import {
  getSettingsFilePath,
  readSettings,
  writeSettings,
} from "./main/settings";
import { handleSupabaseOAuthReturn } from "./supabase_admin/supabase_return_handler";
import { handleCodexProReturn } from "./main/pro";
import { startPolarCheckoutServer } from "./main/polar_checkout_server";
import { IS_TEST_BUILD } from "./ipc/utils/test_utils";
import { BackupManager } from "./backup_manager";
import { getDatabasePath, initializeDatabase } from "./db";
import { UserSettings } from "./lib/schemas";
import { handleNeonOAuthReturn } from "./neon_admin/neon_return_handler";

log.errorHandler.startCatching();
log.eventLogger.startLogging();
log.scope.labelPadding = false;

const logger = log.scope("main");

// Function to check for updates and notify the renderer
async function checkForUpdatesAndNotify() {
  try {
    // Use the new unified API endpoint
    const apiUrl = "http://api.xibe.app/api/releases/latest";

    logger.info("Checking for updates from:", apiUrl);

    // Fetch update information
    const response = await fetch(apiUrl, {
      headers: {
        "User-Agent": "Xibe-AI-App/1.0",
        "Cache-Control": "no-cache",
      },
    });

    if (!response.ok) {
      logger.error("Failed to fetch update info:", response.status);
      return;
    }

    const data = await response.json();

    if (!data || !data.version) {
      logger.warn("No release found in update data");
      return;
    }

    const currentVersion = app.getVersion();
    const latestVersion = data.version;

    logger.info(
      "Current version:",
      currentVersion,
      "Latest version:",
      latestVersion,
    );

    // Compare versions using semantic versioning
    const hasUpdate = compareVersions(currentVersion, latestVersion) < 0;

    if (hasUpdate) {
      logger.info("New version available:", latestVersion);

      // Find the appropriate download URL for the current platform
      const downloadUrl = getDownloadUrlForPlatform(data, process.platform);

      // Show update notification to user
      if (mainWindow && !mainWindow.isDestroyed()) {
        logger.info("Sending update-available event to renderer");
        mainWindow.webContents.send("update-available", {
          version: latestVersion,
          date: data.updatedAt,
          description: data.changelog,
          downloadUrl: downloadUrl,
          changelog: data.changelog,
        });
      } else {
        logger.warn("Main window not available to send update notification");
      }
    } else {
      logger.info("No update available. Current version is up to date.");
    }
  } catch (error) {
    logger.error("Error checking for updates:", error);
  }
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
  release: any,
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
    (item: any) => item.platform === platformName,
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
          (v: any) => v.arch === "x64" && v.packageType === "exe",
        ) ||
        platformItem.variants.find(
          (v: any) => v.arch === "arm64" && v.packageType === "exe",
        ) ||
        platformItem.variants[0];
      return windowsVariant?.url || null;

    case "darwin":
      // Prefer ARM64 for Apple Silicon, fallback to x64
      const macVariant =
        platformItem.variants.find((v: any) => v.arch === "arm64") ||
        platformItem.variants.find((v: any) => v.arch === "x64") ||
        platformItem.variants[0];
      return macVariant?.url || null;

    case "linux":
      // Prefer DEB, fallback to RPM, then zip
      const linuxVariant =
        platformItem.variants.find((v: any) => v.packageType === "deb") ||
        platformItem.variants.find((v: any) => v.packageType === "rpm") ||
        platformItem.variants.find((v: any) => v.packageType === "zip") ||
        platformItem.variants[0];
      return linuxVariant?.url || null;

    default:
      return platformItem.variants[0]?.url || null;
  }
}

// Load environment variables from .env file
dotenv.config();

// Register IPC handlers before app is ready
registerIpcHandlers();
registerUpdateHandlers();

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// https://www.electronjs.org/docs/latest/tutorial/launch-app-from-url-in-another-app#main-process-mainjs
// Register both legacy "dyad" and new "codex" URL schemes for deep links
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient("dyad", process.execPath, [
      path.resolve(process.argv[1]),
    ]);
    app.setAsDefaultProtocolClient("codex", process.execPath, [
      path.resolve(process.argv[1]),
    ]);
  }
} else {
  app.setAsDefaultProtocolClient("dyad");
  app.setAsDefaultProtocolClient("codex");
}

export async function onReady() {
  try {
    const backupManager = new BackupManager({
      settingsFile: getSettingsFilePath(),
      dbFile: getDatabasePath(),
    });
    await backupManager.initialize();
  } catch (e) {
    logger.error("Error initializing backup manager", e);
  }
  initializeDatabase();
  const settings = readSettings();
  await onFirstRunMaybe(settings);
  createWindow();

  // Start local server for Polar checkout success callbacks
  const _server = startPolarCheckoutServer({
    onEvent: (evt) => {
      // Forward to renderer
      mainWindow?.webContents.send("polar:checkout", evt);
    },
  });

  logger.info("Auto-update enabled=", settings.enableAutoUpdate);
  if (settings.enableAutoUpdate) {
    // Use new Xibe AI update system
    logger.info(
      "Auto-update release channel=",
      settings.releaseChannel === "beta" ? "beta" : "stable",
    );

    // Check for updates after a short delay on startup
    setTimeout(checkForUpdatesAndNotify, 5000); // Wait 5 seconds after startup

    // Set up periodic update checking (every 4 hours)
    setInterval(checkForUpdatesAndNotify, 1000 * 60 * 60 * 4);
  }
}

export async function onFirstRunMaybe(settings: UserSettings) {
  if (!settings.hasRunBefore) {
    await promptMoveToApplicationsFolder();
    writeSettings({
      hasRunBefore: true,
    });
  }
  if (IS_TEST_BUILD) {
    writeSettings({
      isTestMode: true,
    });
  }
}

/**
 * Ask the user if the app should be moved to the
 * applications folder.
 */
async function promptMoveToApplicationsFolder(): Promise<void> {
  // Why not in e2e tests?
  // There's no way to stub this dialog in time, so we just skip it
  // in e2e testing mode.
  if (IS_TEST_BUILD) return;
  if (process.platform !== "darwin") return;
  if (app.isInApplicationsFolder()) return;
  logger.log("Prompting user to move to applications folder");

  const { response } = await dialog.showMessageBox({
    type: "question",
    buttons: ["Move to Applications Folder", "Do Not Move"],
    defaultId: 0,
    message: "Move to Applications Folder? (required for auto-update)",
  });

  if (response === 0) {
    logger.log("User chose to move to applications folder");
    app.moveToApplicationsFolder();
  } else {
    logger.log("User chose not to move to applications folder");
  }
}

declare global {
  const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
}

let mainWindow: BrowserWindow | null = null;

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: process.env.NODE_ENV === "development" ? 1280 : 960,
    minWidth: 800,
    height: 700,
    minHeight: 500,
    titleBarStyle: "hidden",
    title: "Xibe AI",
    titleBarOverlay: false,
    trafficLightPosition: {
      x: 10,
      y: 8,
    },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
      // transparent: true,
    },
    // backgroundColor: "#00000001",
    // frame: false,
  });
  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, "../renderer/main_window/index.html"),
    );
  }
  if (process.env.NODE_ENV === "development") {
    // Open the DevTools.
    mainWindow.webContents.openDevTools();
  }

  // Enable native context menu on right-click
  mainWindow.webContents.on("context-menu", (event, params) => {
    // Prevent any default behavior and show our own menu
    event.preventDefault();

    const template: Electron.MenuItemConstructorOptions[] = [];

    if (params.isEditable) {
      template.push(
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "delete" },
        { type: "separator" },
        { role: "selectAll" },
      );
    } else {
      if (params.selectionText && params.selectionText.length > 0) {
        template.push({ role: "copy" });
      }
      template.push({ role: "selectAll" });
    }

    if (process.env.NODE_ENV === "development") {
      template.push(
        { type: "separator" },
        {
          label: "Inspect Element",
          click: () =>
            mainWindow?.webContents.inspectElement(params.x, params.y),
        },
      );
    }

    const menu = Menu.buildFromTemplate(template);
    menu.popup({ window: mainWindow! });
  });
};

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, commandLine, _workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    // the commandLine is array of strings in which last element is deep link url
    handleDeepLinkReturn(commandLine.pop()!);
  });
  app.whenReady().then(onReady);
}

// Handle the protocol. In this case, we choose to show an Error Box.
app.on("open-url", (event, url) => {
  handleDeepLinkReturn(url);
});

function handleDeepLinkReturn(url: string) {
  // example url: "dyad://supabase-oauth-return?token=a&refreshToken=b"
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    log.info("Invalid deep link URL", url);
    return;
  }

  // Intentionally do NOT log the full URL which may contain sensitive tokens.
  log.log(
    "Handling deep link: protocol",
    parsed.protocol,
    "hostname",
    parsed.hostname,
  );
  if (parsed.protocol !== "dyad:" && parsed.protocol !== "codex:") {
    dialog.showErrorBox(
      "Invalid Protocol",
      `Expected dyad:// or codex://, got ${parsed.protocol}. Full URL: ${url}`,
    );
    return;
  }
  if (parsed.hostname === "neon-oauth-return") {
    const token = parsed.searchParams.get("token");
    const refreshToken = parsed.searchParams.get("refreshToken");
    const expiresIn = Number(parsed.searchParams.get("expiresIn"));
    if (!token || !refreshToken || !expiresIn) {
      dialog.showErrorBox(
        "Invalid URL",
        "Expected token, refreshToken, and expiresIn",
      );
      return;
    }
    handleNeonOAuthReturn({ token, refreshToken, expiresIn });
    // Send message to renderer to trigger re-render
    mainWindow?.webContents.send("deep-link-received", {
      type: parsed.hostname,
    });
    return;
  }
  if (
    parsed.hostname === "supabase-oauth-return" ||
    parsed.hostname === "supabase-connect-return"
  ) {
    // Support multiple parameter conventions
    const token =
      parsed.searchParams.get("token") ||
      parsed.searchParams.get("access_token");
    const refreshToken =
      parsed.searchParams.get("refreshToken") ||
      parsed.searchParams.get("refresh_token");
    const expiresInRaw =
      parsed.searchParams.get("expiresIn") ||
      parsed.searchParams.get("expires_in");
    const expiresIn = Number(expiresInRaw);
    if (!token || !refreshToken || !expiresIn) {
      dialog.showErrorBox(
        "Invalid URL",
        "Expected token/access_token, refreshToken/refresh_token, and expiresIn/expires_in",
      );
      return;
    }
    handleSupabaseOAuthReturn({ token, refreshToken, expiresIn });
    // Send message to renderer to trigger re-render
    mainWindow?.webContents.send("deep-link-received", {
      type: parsed.hostname,
    });
    return;
  }
  // codex://codex-pro-return?key=123&budget_reset_at=2025-05-26T16:31:13.492000Z&max_budget=100
  if (parsed.hostname === "codex-pro-return") {
    const apiKey = parsed.searchParams.get("key");
    if (!apiKey) {
      dialog.showErrorBox("Invalid URL", "Expected key");
      return;
    }
    handleCodexProReturn({
      apiKey,
    });
    // Send message to renderer to trigger re-render
    mainWindow?.webContents.send("deep-link-received", {
      type: parsed.hostname,
    });
    return;
  }
  dialog.showErrorBox("Invalid deep link URL", url);
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
