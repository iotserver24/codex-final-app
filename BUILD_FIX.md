# Build Fix Documentation

## Issue

The Linux build was failing with the error:

```
Cannot make for linux and target deb: the maker declared that it cannot run on linux.
```

This was caused by the `MakerDeb` in the Electron Forge configuration not being compatible with the CI environment.

## Solution

The forge configuration has been updated to conditionally enable/disable makers based on environment variables:

### Environment Variables

- `BUILD_DEB`: Controls whether to build `.deb` packages

  - Set to `"false"` to disable (recommended for CI)
  - Default: enabled (when not set or set to any other value)

- `BUILD_RPM`: Controls whether to build `.rpm` packages
  - Set to `"true"` to enable
  - Default: disabled

### CI Configuration

The GitHub Actions workflow has been updated to:

1. Set `BUILD_DEB=false` for Linux builds
2. Only generate ZIP files for Linux (no `.deb` or `.rpm`)
3. Update artifact paths and release notes accordingly

### Local Development

For local development, you can:

1. **Test the configuration:**

   ```bash
   npm run test:forge-config
   ```

2. **Build with specific makers:**

   ```bash
   # Build with deb packages (default)
   npm run make:linux

   # Build without deb packages (CI mode)
   BUILD_DEB=false npm run make:linux

   # Build with rpm packages
   BUILD_RPM=true npm run make:linux
   ```

### Build Outputs

- **CI Builds**: Only ZIP files for Linux
- **Local Builds**: ZIP files + DEB packages (unless disabled)
- **RPM Builds**: Only when `BUILD_RPM=true` is set

## Files Modified

1. `forge.config.ts` - Added conditional logic for makers
2. `.github/workflows/release.yml` - Updated CI configuration
3. `scripts/test-forge-config.js` - Added test script
4. `package.json` - Added test script command

## Testing

Run the test script to verify the configuration works:

```bash
npm run test:forge-config
```

This will test the configuration with different environment variable combinations.
