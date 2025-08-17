# Build Troubleshooting Guide

This guide helps resolve common build issues when building CodeX for different platforms.

## Common Issues

### macOS Build Issues

#### Issue: `Cannot find module @rollup/rollup-darwin-arm64`

This is a known npm bug with optional dependencies. The error message suggests removing `package-lock.json` and `node_modules` and running `npm i` again.

**Solution:**

```bash
# Run the automated fix script
npm run fix:deps

# Or manually:
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### Linux Build Issues

#### Issue: `Cannot make for linux and target rpm: the maker declared that it cannot run on linux`

RPM packages are typically built on Red Hat-based systems, not all Linux distributions.

**Solution:**

- The RPM maker is now conditionally included only when `BUILD_RPM=true` environment variable is set
- For Ubuntu/Debian systems, only DEB packages will be built
- For Red Hat-based systems, set `BUILD_RPM=true` to build RPM packages

### Windows Build Issues

Windows builds should work out of the box. If you encounter issues:

1. Ensure you have the latest Node.js version (20+)
2. Run `npm run clean` before building
3. Check that all dependencies are properly installed

## Build Scripts

### Available Scripts

- `npm run make` - Build for current platform
- `npm run build:windows` - Build for Windows
- `npm run build:macos` - Build for macOS
- `npm run build:linux` - Build for Linux
- `npm run fix:deps` - Fix dependency issues (especially for macOS)

### Cross-Platform Building

For cross-platform builds, use GitHub Actions which automatically builds for all platforms:

1. Push to `main` branch or create a tag
2. GitHub Actions will build for Windows, macOS, and Linux
3. Download the artifacts from the Actions tab

## Environment Variables

- `BUILD_RPM` - Set to "true" to enable RPM package building on Linux
- `NODE_OPTIONS` - Set to "--max-old-space-size=4096" for builds with high memory usage

## Platform-Specific Notes

### macOS

- Requires Xcode Command Line Tools
- May need to run `npm run fix:deps` for optional dependency issues
- Builds both Intel (x64) and Apple Silicon (arm64) versions

### Linux

- Requires build-essential and python3
- DEB packages built by default
- RPM packages only built when `BUILD_RPM=true`

### Windows

- Requires Visual Studio Build Tools
- Builds both installer (.exe) and portable (.zip) versions

## Getting Help

If you encounter build issues not covered here:

1. Check the GitHub Actions logs for the latest successful builds
2. Ensure you're using the same Node.js version (20.x)
3. Try running `npm run fix:deps` first
4. Open an issue with the complete error message and your platform details
