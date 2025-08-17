#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  blue: "\x1b[34m",
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

function removeFileOrDirectory(pathToRemove) {
  if (fs.existsSync(pathToRemove)) {
    try {
      const platform = os.platform();

      if (platform === "win32") {
        // Windows: use rmdir /s /q for directories, del for files
        const stat = fs.statSync(pathToRemove);
        if (stat.isDirectory()) {
          execSync(`rmdir /s /q "${pathToRemove}"`, { stdio: "inherit" });
        } else {
          execSync(`del "${pathToRemove}"`, { stdio: "inherit" });
        }
      } else {
        // Unix-like: use rm -rf
        execSync(`rm -rf "${pathToRemove}"`, { stdio: "inherit" });
      }

      logSuccess(`Removed: ${pathToRemove}`);
    } catch (error) {
      logWarning(`Could not remove ${pathToRemove}: ${error.message}`);
    }
  } else {
    logWarning(`Path does not exist: ${pathToRemove}`);
  }
}

// Get the project root directory
const projectRoot = process.cwd();

logInfo("🔄 Reinstalling dependencies...");

// Remove node_modules and package-lock.json
const pathsToRemove = [
  path.join(projectRoot, "node_modules"),
  path.join(projectRoot, "package-lock.json"),
];

logInfo("Removing existing dependencies...");
pathsToRemove.forEach((pathToRemove) => {
  removeFileOrDirectory(pathToRemove);
});

// Install dependencies
logInfo("Installing dependencies...");
try {
  execSync("npm install", { stdio: "inherit" });
  logSuccess("Dependencies installed successfully!");
} catch {
  logError("Failed to install dependencies!");
  process.exit(1);
}

logSuccess("Reinstall completed!");
