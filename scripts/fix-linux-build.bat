@echo off
REM Script to fix Linux build issues with Rollup optional dependencies
REM This addresses the npm bug with optional dependencies on Linux
REM Note: This script is for reference - the actual fix happens in CI

echo 🔧 Fixing Linux build dependencies...

REM Step 1: Clean everything
echo 📦 Cleaning node_modules and package-lock.json...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json

REM Step 2: Clear npm cache
echo 🧹 Clearing npm cache...
npm cache clean --force

REM Step 3: Configure npm for better optional dependency handling
echo ⚙️ Configuring npm...
npm config set fund false
npm config set audit false
npm config set optional true
npm config set legacy-peer-deps false

REM Step 4: Install dependencies with explicit optional handling
echo 📥 Installing dependencies...
npm install --include=optional

REM Step 5: Try to explicitly install the problematic dependency
echo 🎯 Attempting to install Rollup Linux binary...
npm install @rollup/rollup-linux-x64-gnu --save-optional || echo ⚠️ Could not install optional rollup dependency, continuing...

REM Step 6: Verify installation
echo ✅ Verifying installation...
npm list @rollup/rollup-linux-x64-gnu >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Rollup Linux binary found!
) else (
    echo ⚠️ Rollup Linux binary not found, but build may still work with fallback
)

echo 🏗️ Linux build fix complete. Run 'npm run make:linux' to test.