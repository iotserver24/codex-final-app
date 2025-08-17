#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

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

// Get command line arguments
const args = process.argv.slice(2);
const platform = args[0] || "all";
const clean = args.includes("--clean");

const platforms = {
  windows: "win32",
  macos: "darwin",
  linux: "linux",
  all: "all",
};

if (!platforms[platform]) {
  logError(`Invalid platform: ${platform}`);
  logInfo("Available platforms: windows, macos, linux, all");
  process.exit(1);
}

logStep("CodeX Build Script");
logInfo(`Platform: ${platform}`);
logInfo(`Clean build: ${clean}`);

// Check if we're in the right directory
if (!fs.existsSync("package.json")) {
  logError(
    "package.json not found. Please run this script from the project root.",
  );
  process.exit(1);
}

// Read package.json for version info
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
logInfo(`Current version: ${packageJson.version}`);

try {
  // Clean if requested
  if (clean) {
    logStep("Cleaning previous builds");
    execSync("npm run clean", { stdio: "inherit" });
    logSuccess("Clean completed");
  }

  // Install dependencies if node_modules doesn't exist
  if (!fs.existsSync("node_modules")) {
    logStep("Installing dependencies");
    execSync("npm ci", { stdio: "inherit" });
    logSuccess("Dependencies installed");
  }

  // Build based on platform
  if (platform === "all") {
    logStep("Building for all platforms");
    logWarning(
      "This will build for the current platform only. For cross-platform builds, use GitHub Actions.",
    );
    execSync("npm run make", { stdio: "inherit" });
  } else {
    logStep(`Building for ${platform}`);

    // Handle platform-specific issues
    if (platform === "macos") {
      logInfo(
        "macOS build detected - checking for npm optional dependencies issue...",
      );
      try {
        // Try the build first
        execSync("npm run make:macos", { stdio: "inherit" });
      } catch {
        logWarning(
          "macOS build failed, likely due to npm optional dependencies issue",
        );
        logInfo("Attempting to fix by reinstalling dependencies...");
        execSync("npm run reinstall", { stdio: "inherit" });
        logInfo("Retrying macOS build...");
        execSync("npm run make:macos", { stdio: "inherit" });
      }
    } else if (platform === "linux") {
      logInfo("Linux build detected - using platform-specific make command...");
      execSync("npm run make:linux", { stdio: "inherit" });
    } else if (platform === "windows") {
      logInfo(
        "Windows build detected - using platform-specific make command...",
      );
      execSync("npm run make:windows", { stdio: "inherit" });
    }
  }

  logSuccess("Build completed successfully!");

  // List output files
  logStep("Build Outputs");
  const outDir = path.join(process.cwd(), "out");

  if (fs.existsSync(outDir)) {
    const listOutputs = (dir, prefix = "") => {
      const items = fs.readdirSync(dir);
      items.forEach((item) => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        const relativePath = path.relative(process.cwd(), fullPath);

        if (stat.isDirectory()) {
          logInfo(`${prefix}📁 ${relativePath}/`);
          listOutputs(fullPath, prefix + "  ");
        } else {
          const size = (stat.size / 1024 / 1024).toFixed(2);
          logSuccess(`${prefix}📄 ${relativePath} (${size} MB)`);
        }
      });
    };

    listOutputs(outDir);
  } else {
    logWarning("No output directory found");
  }

  logStep("Next Steps");
  logInfo("1. Test the built application");
  logInfo("2. Create a GitHub release using the workflow");
  logInfo("3. Or run: npm run publish (if configured)");
} catch (error) {
  logError("Build failed!");
  logError(error.message);
  process.exit(1);
}
