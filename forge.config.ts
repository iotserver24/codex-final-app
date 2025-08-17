import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerZIP } from "@electron-forge/maker-zip";
import { MakerDeb } from "@electron-forge/maker-deb";
import { MakerRpm } from "@electron-forge/maker-rpm";
import { VitePlugin } from "@electron-forge/plugin-vite";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { FuseV1Options, FuseVersion } from "@electron/fuses";
import { AutoUnpackNativesPlugin } from "@electron-forge/plugin-auto-unpack-natives";

// Environment variables for build configuration:
// - BUILD_DEB: Set to "false" to disable deb package creation (useful in CI)
// - BUILD_RPM: Set to "true" to enable rpm package creation
// - SM_CODE_SIGNING_CERT_SHA1_HASH: Windows code signing certificate hash
// - APPLE_TEAM_ID, APPLE_ID, APPLE_PASSWORD: macOS code signing credentials

// Based on https://github.com/electron/forge/blob/6b2d547a7216c30fde1e1fddd1118eee5d872945/packages/plugin/vite/src/VitePlugin.ts#L124
const ignore = (file: string) => {
  if (!file) return false;
  // `file` always starts with `/`
  // @see - https://github.com/electron/packager/blob/v18.1.3/src/copy-filter.ts#L89-L93
  if (file === "/node_modules") {
    return false;
  }
  if (file.startsWith("/drizzle")) {
    return false;
  }
  if (file.startsWith("/scaffold")) {
    return false;
  }

  if (file.startsWith("/worker") && !file.startsWith("/workers")) {
    return false;
  }
  if (file.startsWith("/node_modules/stacktrace-js")) {
    return false;
  }
  if (file.startsWith("/node_modules/stacktrace-js/dist")) {
    return false;
  }
  if (file.startsWith("/node_modules/better-sqlite3")) {
    return false;
  }
  if (file.startsWith("/node_modules/bindings")) {
    return false;
  }
  if (file.startsWith("/node_modules/file-uri-to-path")) {
    return false;
  }
  if (file.startsWith("/.vite")) {
    return false;
  }

  return true;
};

const isEndToEndTestBuild = process.env.E2E_TEST_BUILD === "true";
// Sign/notarize only if all Apple credentials are present
const hasAppleCreds = Boolean(
  process.env.APPLE_TEAM_ID &&
    process.env.APPLE_ID &&
    process.env.APPLE_PASSWORD,
);

const config: ForgeConfig = {
  packagerConfig: {
    protocols: [
      {
        name: "CodeX",
        schemes: ["codex"],
      },
    ],
    icon: "./assets/icon/logo",

    // In CI without Apple creds, do not attempt to sign/notarize
    osxSign:
      isEndToEndTestBuild || !hasAppleCreds
        ? undefined
        : {
            identity: process.env.APPLE_TEAM_ID,
          },
    osxNotarize:
      isEndToEndTestBuild || !hasAppleCreds
        ? undefined
        : {
            appleId: process.env.APPLE_ID!,
            appleIdPassword: process.env.APPLE_PASSWORD!,
            teamId: process.env.APPLE_TEAM_ID!,
          },
    asar: true,
    ignore,
    // ignore: [/node_modules\/(?! (better-sqlite3|bindings|file-uri-to-path)\/)/],
  },
  rebuildConfig: {
    extraModules: ["better-sqlite3"],
    force: true,
  },
  makers: [
    new MakerSquirrel({
      // Only sign if certificate is available
      ...(process.env.SM_CODE_SIGNING_CERT_SHA1_HASH && {
        signWithParams: `/sha1 ${process.env.SM_CODE_SIGNING_CERT_SHA1_HASH} /tr http://timestamp.digicert.com /td SHA256 /fd SHA256`,
      }),
    }),
    new MakerZIP({}),
    // DEB maker with more robust configuration - only enable if not in CI or explicitly enabled
    // Set BUILD_DEB=false in CI to avoid compatibility issues with deb maker
    ...(process.env.BUILD_DEB !== "false"
      ? [
          new MakerDeb({
            options: {
              mimeType: ["x-scheme-handler/codex"],
              maintainer: "CodeX Team <iotserver24@gmail.com>",
              homepage: "https://github.com/iotserver24/codex",
              categories: ["Development"],
              // Add more specific options for better compatibility
              depends: [
                "libgtk-3-0",
                "libnotify4",
                "libnss3",
                "libxss1",
                "libxtst6",
                "xdg-utils",
                "libatspi2.0-0",
                "libdrm2",
                "libxkbcommon0",
                "libxcomposite1",
                "libxdamage1",
                "libxfixes3",
                "libxrandr2",
                "libgbm1",
                "libasound2",
              ],
              section: "devel",
              priority: "optional",
            },
            // Explicitly set platform to ensure it works on Linux
            platforms: ["linux"],
          }),
        ]
      : []),
    // RPM maker only for Red Hat-based systems
    ...(process.env.BUILD_RPM === "true" ? [new MakerRpm({})] : []),
  ],
  publishers: [
    {
      name: "@electron-forge/publisher-github",
      config: {
        repository: {
          owner: "iotserver24",
          name: "codex",
        },
        draft: true,
        force: true,
        prerelease: true,
      },
    },
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: "src/main.ts",
          config: "vite.main.config.mts",
          target: "main",
        },
        {
          entry: "src/preload.ts",
          config: "vite.preload.config.mts",
          target: "preload",
        },
        {
          entry: "workers/tsc/tsc_worker.ts",
          config: "vite.worker.config.mts",
          target: "main",
        },
      ],
      renderer: [
        {
          name: "main_window",
          config: "vite.renderer.config.mts",
        },
      ],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: isEndToEndTestBuild,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
