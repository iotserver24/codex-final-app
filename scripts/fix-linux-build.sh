#!/bin/bash

# Script to fix Linux build issues with Rollup optional dependencies
# This addresses the npm bug with optional dependencies on Linux

echo "🔧 Fixing Linux build dependencies..."

# Step 1: Clean everything
echo "📦 Cleaning node_modules and package-lock.json..."
rm -rf node_modules package-lock.json

# Step 2: Clear npm cache
echo "🧹 Clearing npm cache..."
npm cache clean --force

# Step 3: Configure npm for better optional dependency handling
echo "⚙️ Configuring npm..."
npm config set fund false
npm config set audit false
npm config set optional true
npm config set legacy-peer-deps false

# Step 4: Install dependencies with explicit optional handling
echo "📥 Installing dependencies..."
npm install --include=optional

# Step 5: Try to explicitly install the problematic dependency
echo "🎯 Attempting to install Rollup Linux binary..."
npm install @rollup/rollup-linux-x64-gnu --save-optional || echo "⚠️ Could not install optional rollup dependency, continuing..."

# Step 6: Verify installation
echo "✅ Verifying installation..."
if npm list @rollup/rollup-linux-x64-gnu > /dev/null 2>&1; then
    echo "✅ Rollup Linux binary found!"
else
    echo "⚠️ Rollup Linux binary not found, but build may still work with fallback"
fi

# Step 7: Test build
echo "🏗️ Testing Linux build..."
if npm run make:linux; then
    echo "🎉 Linux build successful!"
else
    echo "❌ Linux build failed. Check the error messages above."
    exit 1
fi