# Build Troubleshooting Guide

This guide helps resolve common build issues when building CodeX for different platforms.

## Platform-Specific Build Issues

### macOS (ARM64) Build Issues

**Problem:** `Cannot find module @rollup/rollup-darwin-arm64`

This is a known npm bug with optional dependencies. The error message suggests:

> npm has a bug related to optional dependencies (https://github.com/npm/cli/issues/4828). Please try `npm i` again after removing both package-lock.json and node_modules directory.

**Solution:**

```bash
# Use the provided reinstall script
npm run reinstall

# Or manually:
rm -rf node_modules package-lock.json
npm install
npm run make:macos
```

### Linux Build Issues

**Problem:** `Cannot make for linux and target rpm: the maker declared that it cannot run on linux.`

This happens when the RPM maker is not properly configured for Linux-only builds.

**Solution:**
The forge configuration has been updated to specify Linux-only targets for RPM and DEB makers.

**Use platform-specific build commands:**

```bash
npm run make:linux
```

## Available Build Commands

### Platform-Specific Builds

- `npm run make:windows` - Build for Windows only
- `npm run make:macos` - Build for macOS only
- `npm run make:linux` - Build for Linux only

### Cross-Platform Build Script

- `npm run build:windows` - Build for Windows using the build script
- `npm run build:macos` - Build for macOS using the build script (includes dependency fix)
- `npm run build:linux` - Build for Linux using the build script

### Utility Commands

- `npm run reinstall` - Remove node_modules and package-lock.json, then reinstall (fixes npm optional dependencies issues)
- `npm run make:fix-deps` - Reinstall dependencies and then run make

## Recommended Build Process

### For Development (Current Platform Only)

```bash
npm run make
```

### For Specific Platform

```bash
# Windows
npm run build:windows

# macOS (with automatic dependency fix)
npm run build:macos

# Linux
npm run build:linux
```

### If You Encounter Dependency Issues

```bash
npm run reinstall
npm run make
```

## CI/CD Considerations

For GitHub Actions or other CI environments:

1. **macOS runners** should use `npm run build:macos` which automatically handles the dependency reinstall
2. **Linux runners** should use `npm run build:linux`
3. **Windows runners** should use `npm run build:windows`

## Troubleshooting Steps

1. **Clean build:** `npm run clean`
2. **Reinstall dependencies:** `npm run reinstall`
3. **Try platform-specific build:** `npm run make:[platform]`
4. **Check forge configuration:** Ensure makers are properly configured for target platforms
5. **Verify Node.js version:** Ensure you're using Node.js 20+ as specified in package.json

## Common Error Messages and Solutions

| Error                                            | Platform | Solution                             |
| ------------------------------------------------ | -------- | ------------------------------------ |
| `Cannot find module @rollup/rollup-darwin-arm64` | macOS    | `npm run reinstall`                  |
| `Cannot make for linux and target rpm`           | Linux    | Use `npm run make:linux`             |
| `Cannot find module 'typescript'`                | Any      | `npm run reinstall`                  |
| Build timeout                                    | Any      | Use platform-specific build commands |
