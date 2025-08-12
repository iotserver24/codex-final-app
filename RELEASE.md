# CodeX Release Guide

This guide explains how to build and release CodeX for Windows, macOS, and Linux platforms.

## 🚀 Quick Release (Recommended)

### Using GitHub Actions (Easiest)

1. **Go to GitHub Actions**: Navigate to your repository's Actions tab
2. **Run Release Workflow**: Click on "Build and Release CodeX" workflow
3. **Manual Trigger**: Click "Run workflow" and enter the version (e.g., `1.0.5`)
4. **Wait for Build**: The workflow will build for all platforms automatically
5. **Release Created**: A GitHub release will be created with all artifacts

### Using Git Tags

```bash
# Create and push a tag
git tag v1.0.5
git push origin v1.0.5
```

This will automatically trigger the release workflow.

## 🔧 Local Building

### Prerequisites

- **Node.js 20+**: Required for building
- **Platform-specific tools**:
  - **Windows**: Visual Studio Build Tools
  - **macOS**: Xcode Command Line Tools
  - **Linux**: build-essential, python3

### Build Commands

```bash
# Build for current platform
npm run build

# Build for specific platform
npm run build:windows
npm run build:macos
npm run build:linux

# Clean build (removes previous builds)
npm run build -- --clean
```

### Manual Build Steps

```bash
# 1. Install dependencies
npm ci

# 2. Clean previous builds
npm run clean

# 3. Build for all platforms (current platform only)
npm run make

# 4. Check outputs
ls -la out/make/
```

## 📦 Build Outputs

### Windows

- **Installer**: `out/make/squirrel.windows/x64/CodeX Setup.exe`
- **Portable**: `out/make/zip/win32/x64/codex-win32-x64.zip`

### macOS

- **App**: `out/make/zip/darwin/arm64/codex-darwin-arm64.zip`
- **Intel**: `out/make/zip/darwin/x64/codex-darwin-x64.zip`

### Linux

- **Debian**: `out/make/deb/x64/codex_*.deb`
- **RPM**: `out/make/rpm/x64/codex-*.rpm`
- **Portable**: `out/make/zip/linux/x64/codex-linux-x64.zip`

## 🔐 Code Signing (Optional)

### Windows Code Signing

If you have a code signing certificate:

1. **Set Environment Variable**:

   ```bash
   export SM_CODE_SIGNING_CERT_SHA1_HASH="your-certificate-hash"
   ```

2. **Build with Signing**:
   ```bash
   npm run make
   ```

### macOS Code Signing

If you have Apple Developer credentials:

1. **Set Environment Variables**:

   ```bash
   export APPLE_ID="your-apple-id"
   export APPLE_PASSWORD="your-app-specific-password"
   export APPLE_TEAM_ID="your-team-id"
   ```

2. **Build with Signing**:
   ```bash
   npm run make
   ```

## 📋 Release Checklist

### Before Release

- [ ] **Update Version**: Update version in `package.json`
- [ ] **Test Builds**: Test builds on target platforms
- [ ] **Update Changelog**: Document new features and fixes
- [ ] **Update Documentation**: Ensure docs are current

### Release Process

- [ ] **Create Tag**: `git tag v1.0.5`
- [ ] **Push Tag**: `git push origin v1.0.5`
- [ ] **Monitor Build**: Watch GitHub Actions workflow
- [ ] **Verify Artifacts**: Check all platform builds
- [ ] **Publish Release**: Review and publish GitHub release
- [ ] **Announce**: Share release on social media/discord

### Post Release

- [ ] **Update Website**: Update download links
- [ ] **Monitor Issues**: Watch for user feedback
- [ ] **Plan Next Release**: Start planning next version

## 🐛 Troubleshooting

### Common Issues

#### Build Fails on Windows

```bash
# Install Visual Studio Build Tools
npm install --global windows-build-tools
```

#### Build Fails on macOS

```bash
# Install Xcode Command Line Tools
xcode-select --install
```

#### Build Fails on Linux

```bash
# Install build dependencies
sudo apt-get update
sudo apt-get install -y build-essential python3
```

#### Memory Issues

```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
npm run make
```

#### Native Module Issues

```bash
# Rebuild native modules
npm run clean
npm ci
npm run make
```

### Debug Build Process

```bash
# Enable verbose logging
DEBUG=electron-forge:* npm run make

# Check Electron Forge config
npx electron-forge config
```

## 🔄 Automated Release

### GitHub Actions Workflow

The `.github/workflows/release.yml` workflow:

1. **Triggers**: On push to main, tags, or manual dispatch
2. **Builds**: Parallel builds for Windows, macOS, Linux
3. **Artifacts**: Uploads build artifacts
4. **Release**: Creates GitHub release with all files
5. **Version**: Updates package.json version

### Workflow Features

- ✅ **No Code Signing Required**: Works without certificates
- ✅ **Cross-Platform**: Builds for all platforms
- ✅ **Automatic Versioning**: Handles version updates
- ✅ **Artifact Management**: Organizes build outputs
- ✅ **Release Notes**: Generates comprehensive release notes

## 📊 Release Statistics

### Build Times (Approximate)

- **Windows**: 15-20 minutes
- **macOS**: 20-25 minutes
- **Linux**: 10-15 minutes
- **Total**: 45-60 minutes

### File Sizes (Approximate)

- **Windows**: 150-200 MB
- **macOS**: 180-220 MB
- **Linux**: 120-160 MB

## 🎯 Best Practices

### Version Management

- Use semantic versioning (MAJOR.MINOR.PATCH)
- Update version before creating tag
- Document breaking changes clearly

### Testing

- Test builds on target platforms
- Verify all features work correctly
- Check installation process

### Documentation

- Update changelog with each release
- Document new features and changes
- Update installation instructions

### Security

- Review dependencies for vulnerabilities
- Test with security tools
- Monitor for security issues

## 📞 Support

If you encounter issues:

1. **Check Issues**: Search existing GitHub issues
2. **Create Issue**: Report new problems with details
3. **Discord**: Join our Discord for help
4. **Documentation**: Check our docs for solutions

---

**Happy Releasing! 🚀**
