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
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, "green");
}

function logWarning(message) {
  log(`⚠️  ${message}`, "yellow");
}

function removeDirectory(dirPath) {
  if (fs.existsSync(dirPath)) {
    try {
      const platform = os.platform();

      if (platform === "win32") {
        // Windows: use rmdir /s /q
        execSync(`rmdir /s /q "${dirPath}"`, { stdio: "inherit" });
      } else {
        // Unix-like: use rm -rf
        execSync(`rm -rf "${dirPath}"`, { stdio: "inherit" });
      }

      logSuccess(`Removed: ${dirPath}`);
    } catch (error) {
      logWarning(`Could not remove ${dirPath}: ${error.message}`);
    }
  } else {
    logWarning(`Directory does not exist: ${dirPath}`);
  }
}

// Get the project root directory
const projectRoot = process.cwd();

// Directories to clean
const directoriesToClean = [
  path.join(projectRoot, "out"),
  path.join(projectRoot, "scaffold", "node_modules"),
];

log("🧹 Cleaning build directories...");

// Clean each directory
directoriesToClean.forEach((dir) => {
  removeDirectory(dir);
});

logSuccess("Clean completed!");
