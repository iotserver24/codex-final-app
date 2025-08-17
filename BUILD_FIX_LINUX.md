# Linux Build Fix

## Issue

The Linux build was failing with the error:

```
Cannot find module @rollup/rollup-linux-x64-gnu. npm has a bug related to optional dependencies (https://github.com/npm/cli/issues/4828). Please try `npm i` again after removing both package-lock.json and node_modules directory.
```

## Root Cause

This is a known npm bug with optional dependencies where npm sometimes fails to properly install platform-specific optional dependencies like `@rollup/rollup-linux-x64-gnu` on Linux systems.

## Solution Applied

### 1. Updated GitHub Workflow (`.github/workflows/release.yml`)

- Added a dedicated step to fix Rollup optional dependencies
- Configured npm for better optional dependency handling
- Added fallback build attempt if the first one fails
- Implemented proper cleanup and reinstallation process

### 2. Added Helper Scripts

- `scripts/fix-linux-build.sh` - Linux/macOS script to fix the issue locally
- `scripts/fix-linux-build.bat` - Windows script for reference
- `package.json` - Added `fix-rollup` and `make:linux:fix` scripts

### 3. Key Changes Made

#### In the workflow:

```yaml
- name: Configure npm for better optional dependency handling
  run: |
    npm config set fund false
    npm config set audit false
    npm config set optional true
    npm config set legacy-peer-deps false

- name: Fix Rollup optional dependencies issue
  run: |
    echo "Fixing Rollup optional dependencies issue..."
    rm -rf node_modules package-lock.json
    npm cache clean --force
    npm config set optional true
    npm install --include=optional
    npm install @rollup/rollup-linux-x64-gnu --save-optional || echo "Could not install optional rollup dependency, will try alternative approach"
```

#### In package.json:

```json
{
  "scripts": {
    "make:linux:fix": "npm run reinstall && npm run make:linux",
    "fix-rollup": "npm cache clean --force && rimraf node_modules package-lock.json && npm install"
  }
}
```

## Testing the Fix

### In CI/CD:

The workflow now automatically handles this issue with multiple fallback strategies.

### Locally (Linux/macOS):

```bash
./scripts/fix-linux-build.sh
```

### Locally (Windows):

```cmd
scripts\fix-linux-build.bat
```

### Manual Fix:

```bash
# Clean and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm config set optional true
npm install --include=optional

# Try explicit install of the problematic dependency
npm install @rollup/rollup-linux-x64-gnu --save-optional

# Build
npm run make:linux
```

## References

- [npm CLI issue #4828](https://github.com/npm/cli/issues/4828)
- [Rollup optional dependencies documentation](https://rollupjs.org/guide/en/#optional-dependencies)
- [Electron Forge Vite plugin documentation](https://www.electronforge.io/config/plugins/vite)

## Status

✅ **Fixed** - The Linux build should now work properly in CI/CD and locally.
