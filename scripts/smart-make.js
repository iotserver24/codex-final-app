#!/usr/bin/env node

const { execSync } = require("child_process");
const os = require("os");

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, "blue");
}

function logSuccess(message) {
  log(`✅ ${message}`, "green");
}

function logWarning(message) {
  log(`⚠️  ${message}`, "yellow");
}

function logError(message) {
  log(`❌ ${message}`, "red");
}

// Detect platform
const platform = os.platform();
const arch = os.arch();

logInfo(`Detected platform: ${platform} (${arch})`);

// Set environment variables to control which makers are used
const env = { ...process.env };

if (platform === "win32") {
  env.ELECTRON_FORGE_PLATFORM = "win32";
  logInfo("Building for Windows (win32)");
} else if (platform === "darwin") {
  env.ELECTRON_FORGE_PLATFORM = "darwin";
  logInfo("Building for macOS (darwin)");
} else if (platform === "linux") {
  env.ELECTRON_FORGE_PLATFORM = "linux";
  logInfo("Building for Linux");
} else {
  logError(`Unsupported platform: ${platform}`);
  logInfo("Supported platforms: win32, darwin, linux");
  process.exit(1);
}

try {
  // Run electron-forge make with platform-specific environment
  execSync("npm run clean && npx electron-forge make", {
    stdio: "inherit",
    env,
  });
  logSuccess("Build completed successfully!");
} catch {
  logError("Build failed!");

  // Special handling for macOS dependency issues
  if (platform === "darwin") {
    logWarning(
      "macOS build failed. This might be due to npm optional dependencies issue.",
    );
    logInfo("You can try: npm run make:fix-deps");
  }

  process.exit(1);
}
