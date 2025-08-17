#!/usr/bin/env node

const { execSync } = require("child_process");

console.log("Testing Forge Configuration...\n");

// Test 1: With BUILD_DEB=false (CI mode)
console.log("Test 1: BUILD_DEB=false (CI mode)");
try {
  const result = execSync("BUILD_DEB=false node -e \"const config = require('../forge.config.ts'); console.log('Config loaded successfully'); console.log('Makers count:', config.default.makers.length);\"", {
    encoding: 'utf8',
    stdio: 'pipe'
  });
  console.log("✅ Success:", result.trim());
} catch (error) {
  console.log("❌ Failed:", error.message);
}

console.log("\n" + "=".repeat(50) + "\n");

// Test 2: With BUILD_DEB=true (default mode)
console.log("Test 2: BUILD_DEB=true (default mode)");
try {
  const result = execSync("BUILD_DEB=true node -e \"const config = require('../forge.config.ts'); console.log('Config loaded successfully'); console.log('Makers count:', config.default.makers.length);\"", {
    encoding: 'utf8',
    stdio: 'pipe'
  });
  console.log("✅ Success:", result.trim());
} catch (error) {
  console.log("❌ Failed:", error.message);
}

console.log("\n" + "=".repeat(50) + "\n");

// Test 3: With BUILD_RPM=true
console.log("Test 3: BUILD_RPM=true");
try {
  const result = execSync("BUILD_RPM=true node -e \"const config = require('../forge.config.ts'); console.log('Config loaded successfully'); console.log('Makers count:', config.default.makers.length);\"", {
    encoding: 'utf8',
    stdio: 'pipe'
  });
  console.log("✅ Success:", result.trim());
} catch (error) {
  console.log("❌ Failed:", error.message);
}

console.log("\nConfiguration test completed!");