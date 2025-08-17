#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");

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

function logStep(step) {
  log(`\n${colors.cyan}=== ${step} ===${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, "green");
}

function logError(message) {
  log(`❌ ${message}`, "red");
}

function logWarning(message) {
  log(`⚠️  ${message}`, "yellow");
}

function logInfo(message) {
  log(`ℹ️  ${message}`, "blue");
}

logStep("CodeX Dependency Fix Script");
logInfo("This script fixes npm optional dependency issues");

// Check if we're in the right directory
if (!fs.existsSync("package.json")) {
  logError(
    "package.json not found. Please run this script from the project root.",
  );
  process.exit(1);
}

try {
  // Step 1: Remove node_modules and package-lock.json
  logStep("Removing existing dependencies");

  if (fs.existsSync("node_modules")) {
    logInfo("Removing node_modules...");
    execSync("rm -rf node_modules", { stdio: "inherit" });
    logSuccess("node_modules removed");
  }

  if (fs.existsSync("package-lock.json")) {
    logInfo("Removing package-lock.json...");
    execSync("rm -f package-lock.json", { stdio: "inherit" });
    logSuccess("package-lock.json removed");
  }

  // Step 2: Clear npm cache
  logStep("Clearing npm cache");
  execSync("npm cache clean --force", { stdio: "inherit" });
  logSuccess("npm cache cleared");

  // Step 3: Reinstall dependencies
  logStep("Installing dependencies");
  execSync("npm install", { stdio: "inherit" });
  logSuccess("Dependencies installed successfully");

  // Step 4: Verify installation
  logStep("Verifying installation");

  // Check if key dependencies are present
  const keyDeps = [
    "node_modules/@rollup/rollup-darwin-arm64",
    "node_modules/@rollup/rollup-darwin-x64",
    "node_modules/@rollup/rollup-linux-x64",
    "node_modules/@rollup/rollup-win32-x64",
  ];

  keyDeps.forEach((dep) => {
    if (fs.existsSync(dep)) {
      logSuccess(`✅ ${dep} found`);
    } else {
      logWarning(
        `⚠️  ${dep} not found (this might be normal for cross-platform builds)`,
      );
    }
  });

  logSuccess("Dependency fix completed!");
  logInfo("You can now try running: npm run make");
} catch (error) {
  logError("Dependency fix failed!");
  logError(error.message);
  process.exit(1);
}
