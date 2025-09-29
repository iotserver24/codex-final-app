import { clipboard } from "electron";
import path from "node:path";
import fs, { promises as fsPromises } from "node:fs";
import log from "electron-log";
import { db } from "../../db";
import { apps } from "../../db/schema";
import { eq } from "drizzle-orm";
import { getAppPath } from "../../paths/paths";
import { createLoggedHandler } from "./safe_handle";
import { getHardcodedEnvVar } from "../../constants/hardcoded_env";

const logger = log.scope("e2b_handlers");
const handle = createLoggedHandler(logger);

type SandboxRecord = {
  sandbox: any;
  appId: number;
  port: number;
  url?: string;
  startedAt: number;
  version: number;
  ttlMs: number;
};

type AppSandboxes = { versions: SandboxRecord[]; nextVersion: number };
const runningSandboxes = new Map<number, AppSandboxes>();
const progressLogs = new Map<number, string[]>();

function logProgress(appId: number, message: string) {
  const ts = new Date().toISOString();
  const arr = progressLogs.get(appId) ?? [];
  arr.push(`[${ts}] ${message}`);
  // Keep last 200 entries
  if (arr.length > 200) arr.splice(0, arr.length - 200);
  progressLogs.set(appId, arr);
}

async function readSandboxLogs(sb: any): Promise<string> {
  try {
    const data = await sb.files.read("/tmp/app.log", {
      encoding: "utf-8",
      // Some SDKs accept range; if unsupported, it will return full file
    });
    return typeof data === "string" ? data : (data?.toString?.() ?? "");
  } catch {
    return "";
  }
}

async function getAllFilesRecursively(rootDir: string): Promise<string[]> {
  const files: string[] = [];
  async function walk(current: string) {
    const dirents = await fsPromises.readdir(current, { withFileTypes: true });
    for (const dirent of dirents) {
      const fullPath = path.join(current, dirent.name);
      // Ignore common heavy/unnecessary dirs
      if (dirent.isDirectory()) {
        if (
          [
            "node_modules",
            ".git",
            ".next",
            "dist",
            "build",
            ".vercel",
          ].includes(dirent.name)
        )
          continue;
        await walk(fullPath);
      } else if (dirent.isFile()) {
        files.push(fullPath);
      }
    }
  }
  await walk(rootDir);
  return files;
}

export function registerE2BHandlers() {
  // Clipboard copy (used when renderer document is not focused)
  handle("clipboard:write-text", async (_evt, text: string): Promise<void> => {
    if (typeof text !== "string" || text.length === 0) return;
    clipboard.writeText(text);
  });

  // Status
  handle(
    "e2b:status",
    async (
      _,
      { appId }: { appId: number },
    ): Promise<{
      running: boolean;
      url?: string;
      port?: number;
      startedAt?: number;
    }> => {
      const app = runningSandboxes.get(appId);
      const rec = app?.versions[app.versions.length - 1];
      return {
        running: !!rec,
        url: rec?.url,
        port: rec?.port,
        startedAt: rec?.startedAt,
      };
    },
  );

  // Logs
  handle(
    "e2b:logs",
    async (_, { appId }: { appId: number }): Promise<{ logs: string }> => {
      const app = runningSandboxes.get(appId);
      const rec = app?.versions[app.versions.length - 1];
      if (!rec) return { logs: "" };
      const logs = await readSandboxLogs(rec.sandbox);
      return { logs };
    },
  );

  // Progress (orchestration) logs
  handle(
    "e2b:progress",
    async (_, { appId }: { appId: number }): Promise<{ lines: string[] }> => ({
      lines: progressLogs.get(appId) ?? [],
    }),
  );

  // Stop
  handle("e2b:stop", async (_, { appId }: { appId: number }): Promise<void> => {
    const app = runningSandboxes.get(appId);
    if (!app) return;
    try {
      for (const rec of app.versions) {
        await rec.sandbox.close?.();
      }
    } finally {
      runningSandboxes.delete(appId);
      progressLogs.delete(appId);
    }
  });

  // Sync a single file (basic primitive for future watchers)
  handle(
    "e2b:sync-file",
    async (
      _,
      { appId, fileRelPath }: { appId: number; fileRelPath: string },
    ): Promise<void> => {
      const app = runningSandboxes.get(appId);
      const rec = app?.versions[app.versions.length - 1];
      if (!rec) throw new Error("Sandbox not running");
      const appRow = await db.query.apps.findFirst({
        where: eq(apps.id, appId),
      });
      if (!appRow) throw new Error("App not found");
      const appDir = getAppPath(appRow.path);
      const abs = path.join(appDir, fileRelPath);
      if (!fs.existsSync(abs)) throw new Error("File not found");
      const data = await fsPromises.readFile(abs);
      const dest = path.join("/workspace", fileRelPath).replace(/\\/g, "/");
      const ab = (data as Buffer).buffer.slice(
        data.byteOffset,
        data.byteOffset + data.byteLength,
      );
      await rec.sandbox.files.write(dest, ab as any);
      logProgress(appId, `Synced file: ${fileRelPath}`);
    },
  );

  // Sync entire project: walk local app dir and overwrite files in sandbox
  handle(
    "e2b:sync-all",
    async (_, { appId }: { appId: number }): Promise<{ synced: number }> => {
      const appRunning = runningSandboxes.get(appId);
      const rec = appRunning?.versions[appRunning.versions.length - 1];
      if (!rec) throw new Error("Sandbox not running");
      const appRow = await db.query.apps.findFirst({
        where: eq(apps.id, appId),
      });
      if (!appRow) throw new Error("App not found");
      const appDir = getAppPath(appRow.path);
      if (!fs.existsSync(appDir))
        throw new Error("App directory does not exist");
      logProgress(appId, "Syncing project to sandbox");
      const files = await getAllFilesRecursively(appDir);
      let count = 0;
      for (const absPath of files) {
        const rel = path.relative(appDir, absPath);
        const dest = path.join("/workspace", rel).replace(/\\/g, "/");
        const data = await fsPromises.readFile(absPath);
        const ab = (data as Buffer).buffer.slice(
          data.byteOffset,
          data.byteOffset + data.byteLength,
        );
        await rec.sandbox.files.write(dest, ab as any);
        count++;
      }
      logProgress(appId, `Synced ${count} files`);
      return { synced: count };
    },
  );

  // List all versions for an app
  handle(
    "e2b:list",
    async (
      _evt,
      { appId }: { appId: number },
    ): Promise<{
      versions: {
        version: number;
        url: string;
        port: number;
        startedAt: number;
        expiresAt: number;
      }[];
    }> => {
      const app = runningSandboxes.get(appId);
      const list = (app?.versions ?? []).map((v) => ({
        version: v.version,
        url: v.url ?? "",
        port: v.port,
        startedAt: v.startedAt,
        expiresAt: v.startedAt + (v.ttlMs ?? 30 * 60 * 1000),
      }));
      return { versions: list };
    },
  );

  handle(
    "share-preview:e2b",
    async (
      _,
      {
        appId,
        port = 3000,
        durationMinutes,
        licenseKey,
      }: {
        appId: number;
        port?: number;
        durationMinutes?: number;
        licenseKey?: string;
      },
    ): Promise<{ url: string }> => {
      const apiKey =
        getHardcodedEnvVar("E2B_API_KEY") || process.env.E2B_API_KEY;
      if (!apiKey) {
        throw new Error("E2B_API_KEY is not available");
      }

      const app = await db.query.apps.findFirst({ where: eq(apps.id, appId) });
      if (!app) {
        throw new Error("App not found");
      }

      const appDir = getAppPath(app.path);
      if (!fs.existsSync(appDir)) {
        throw new Error("App directory does not exist");
      }

      // Determine requested TTL with free/paid gating
      const FREE_MINUTES = new Set([5, 10, 15]);
      const PAID_MINUTES = new Set([30, 60]);
      const requestedMinutes = durationMinutes ?? 15;
      if (
        !FREE_MINUTES.has(requestedMinutes) &&
        !PAID_MINUTES.has(requestedMinutes)
      ) {
        throw new Error(
          "Invalid duration. Allowed: 5, 10, 15 (free) or 30, 60 (requires paid license)",
        );
      }

      // Verify Polar license if paid duration
      const isPaid = PAID_MINUTES.has(requestedMinutes);
      if (isPaid) {
        const polarApiKey =
          getHardcodedEnvVar("POLAR_API_KEY") || process.env.POLAR_API_KEY;
        if (!licenseKey) {
          throw new Error(
            "Paid duration selected. A valid Polar license key is required.",
          );
        }
        if (!polarApiKey) {
          throw new Error(
            "POLAR_API_KEY is not available; cannot verify license for paid durations",
          );
        }
        try {
          // Best-effort Polar license validation
          const res = await fetch("https://api.polar.sh/v1/licenses/validate", {
            method: "POST",
            headers: {
              "content-type": "application/json",
              authorization: `Bearer ${polarApiKey}`,
            },
            body: JSON.stringify({ license_key: licenseKey }),
          } as any);
          if (!res.ok) {
            const text = await res.text();
            throw new Error(`License validation failed: ${text || res.status}`);
          }
          const json: any = await res.json().catch(() => ({}));
          if (!json?.valid && !json?.ok && json?.status !== "valid") {
            throw new Error("License is not valid for this product");
          }
        } catch (e: any) {
          throw new Error(
            `Polar license verification failed: ${e?.message || e}`,
          );
        }
      }

      const ttlMs = requestedMinutes * 60 * 1000;

      // Lazy import SDK to keep main bundle light
      const { Sandbox } = await import("e2b");

      const appRec = runningSandboxes.get(appId);
      const existing = appRec?.versions?.[appRec.versions.length - 1];
      logProgress(
        appId,
        existing ? "Creating another sandbox (version)" : "Creating sandbox",
      );
      const sandbox = await Sandbox.create({
        apiKey,
        timeoutMs: ttlMs,
        allowInternetAccess: true,
        // Ensure frameworks that read env (not flags) pick correct host/port
        envs: {
          PORT: String(port),
          HOST: "0.0.0.0",
        } as any,
      });

      try {
        // If new sandbox, upload full project; otherwise, assume warm and skip
        if (!existing) {
          logProgress(appId, "Scanning files for upload");
          const files = await getAllFilesRecursively(appDir);
          logProgress(appId, `Uploading ${files.length} files`);
          for (const absPath of files) {
            const rel = path.relative(appDir, absPath);
            const dest = path.join("/workspace", rel).replace(/\\/g, "/");
            const data = await fsPromises.readFile(absPath);
            const ab = (data as Buffer).buffer.slice(
              data.byteOffset,
              data.byteOffset + data.byteLength,
            );
            await sandbox.files.write(dest, ab as any);
          }
          logProgress(appId, "Files uploaded");
        }

        // Check if vite.config.js exists and update it to allow E2B hosts
        const viteConfigPath = path.join(appDir, "vite.config.js");
        const viteConfigTsPath = path.join(appDir, "vite.config.ts");
        const viteConfigMjsPath = path.join(appDir, "vite.config.mjs");

        let configPath = null;
        if (fs.existsSync(viteConfigPath)) configPath = viteConfigPath;
        else if (fs.existsSync(viteConfigTsPath)) configPath = viteConfigTsPath;
        else if (fs.existsSync(viteConfigMjsPath))
          configPath = viteConfigMjsPath;

        if (configPath) {
          try {
            let configContent = await fsPromises.readFile(configPath, "utf-8");
            logProgress(
              appId,
              `Updating Vite config: ${path.basename(configPath)}`,
            );
            logProgress(
              appId,
              `Original config preview: ${configContent.substring(0, 200)}...`,
            );

            // More robust Vite config injection
            // First, try to find and update existing server config
            // Handle both direct objects and function returns with multiline support
            const serverConfigRegex = /server:\s*\{[^}]*\}/gs;
            const hasServerConfig = serverConfigRegex.test(configContent);
            logProgress(
              appId,
              `Found existing server config: ${hasServerConfig}`,
            );

            if (hasServerConfig) {
              // Replace existing server config with E2B-compatible version
              configContent = configContent.replace(
                serverConfigRegex,
                `server: {
  host: '0.0.0.0',
  allowedHosts: ['.e2b.app', 'all']
}`,
              );
              logProgress(appId, "Replaced existing server config");
            } else {
              // No existing server config, add it to the main config object
              // Handle different export patterns
              if (configContent.includes("export default defineConfig")) {
                configContent = configContent.replace(
                  /export\s+default\s+defineConfig\(\s*\{/,
                  `export default defineConfig({
  server: {
    host: '0.0.0.0',
    allowedHosts: ['.e2b.app', 'all']
  },`,
                );
              } else if (configContent.includes("export default")) {
                configContent = configContent.replace(
                  /export\s+default\s*\{/,
                  `export default {
  server: {
    host: '0.0.0.0',
    allowedHosts: ['.e2b.app', 'all']
  },`,
                );
              } else {
                // Fallback: prepend server config
                configContent = `// E2B Share Preview: Auto-injected server config
const config = {
  server: {
    host: '0.0.0.0',
    allowedHosts: ['.e2b.app', 'all']
  },
  ...${configContent}
};

export default config;`;
              }
            }

            const destConfigPath = path.join(
              "/workspace",
              path.basename(configPath),
            );
            await sandbox.files.write(destConfigPath, configContent);
            logProgress(appId, "Vite config updated for E2B hosts");
          } catch (err) {
            logger.warn("Failed to update vite config for E2B hosts:", err);
            logProgress(appId, `Warning: Could not update Vite config: ${err}`);
          }
        } else {
          logProgress(
            appId,
            "No Vite config found, using default server settings",
          );
        }

        // Install and start dev server
        // Support SDK variants: commands.run (code-interpreter), or lower-level exec/run
        const runCmd = async (cmd: string, cwd?: string) => {
          const ci: any = (sandbox as any).commands;
          if (ci && typeof ci.run === "function") {
            const res = await ci.run(cmd, { timeoutMs: 0, cwd });
            return {
              exitCode: res.exitCode ?? res.code ?? 0,
              stdout: res.stdout ?? res.logs ?? "",
              stderr: res.stderr ?? "",
            };
          }
          if (typeof (sandbox as any).exec === "function") {
            const res = await (sandbox as any).exec({ cmd, cwd });
            return res;
          }
          if (typeof (sandbox as any).run === "function") {
            const res = await (sandbox as any).run({ cmd, cwd });
            return res;
          }
          throw new Error(
            "E2B SDK process API not found (commands.run/exec/run). Please install 'e2b' or '@e2b/code-interpreter' >= latest.",
          );
        };

        // Run command in background using a bash wrapper that writes logs to /tmp/app.log
        const runBackground = async (cmd: string, cwd?: string) => {
          const ci: any = (sandbox as any).commands;
          const quoted = cmd.replace(/'/g, "'\\''");
          const bashBg = `nohup bash -lc '${quoted}' > /tmp/app.log 2>&1 & disown`;
          if (ci && typeof ci.run === "function") {
            const res = await ci.run(bashBg, { timeoutMs: 0, cwd });
            return {
              exitCode: res.exitCode ?? res.code ?? 0,
              stdout: res.stdout ?? res.logs ?? "",
              stderr: res.stderr ?? "",
            };
          }
          // Fallback to POSIX sh
          const shBg = `sh -lc '${quoted} > /tmp/app.log 2>&1 & echo $!'`;
          return runCmd(shBg, cwd);
        };

        // Check for availability of a binary inside the sandbox
        const hasCommand = async (bin: string): Promise<boolean> => {
          const res = await runCmd(
            `command -v ${bin} >/dev/null 2>&1; echo $?`,
          );
          return (res.stdout?.trim?.() ?? "1") === "0";
        };

        if (!existing) {
          logProgress(appId, "Installing dependencies");
          // Try a sequence of installs from lightest to heaviest, to avoid OOM (exit 137)
          const installAttempts: string[] = [];
          if (await hasCommand("pnpm")) {
            installAttempts.push("pnpm i --frozen-lockfile || pnpm i");
          }
          if (await hasCommand("npm")) {
            installAttempts.push(
              "npm ci --legacy-peer-deps --no-audit --no-fund || true",
            );
            installAttempts.push(
              "npm i --legacy-peer-deps --omit=optional --no-audit --no-fund",
            );
          }
          if (await hasCommand("yarn")) {
            installAttempts.push(
              "yarn install --frozen-lockfile || yarn install",
            );
          }
          // As a very last resort, try to enable corepack and pnpm
          installAttempts.push(
            "(corepack enable && corepack prepare pnpm@latest --activate && pnpm i) || true",
          );

          let success = false;
          let lastOutput = "";
          for (const cmd of installAttempts) {
            logProgress(appId, `Running: ${cmd}`);
            const res = await runCmd(cmd, "/workspace");
            lastOutput = res.stderr || res.stdout || "";
            if (res.exitCode === 0) {
              success = true;
              break;
            }
            if (res.exitCode === 137) {
              // OOM killed; surface a clear message and abort further attempts
              const msg =
                "Dependency install was killed (exit 137). The sandbox likely ran out of memory. Try reducing project size, closing other processes, or using a smaller dependency set.";
              logProgress(appId, msg);
              throw new Error(`${msg} Logs: ${lastOutput.slice(-800)}`);
            }
            logProgress(
              appId,
              `Install attempt failed with code ${res.exitCode}. Retrying with next strategy...`,
            );
          }
          if (!success) {
            throw new Error(
              `Dependency install failed after retries. Last logs: ${lastOutput.slice(-1200)}`,
            );
          }
          logProgress(appId, "Dependencies installed");
        }

        // Choose a start command that exists in the sandbox
        let startCmd =
          app.startCommand?.trim() && app.startCommand !== ""
            ? `${app.startCommand} --host 0.0.0.0 --port ${port} --strictPort`
            : "";
        if (!startCmd) {
          const candidates: string[] = [];
          if (await hasCommand("pnpm")) {
            candidates.push(
              `pnpm dev -- --host 0.0.0.0 --port ${port} --strictPort`,
            );
          }
          if (await hasCommand("npm")) {
            candidates.push(
              `npm run dev -- --host 0.0.0.0 --port ${port} --strictPort`,
            );
          }
          if (await hasCommand("yarn")) {
            candidates.push(
              `yarn dev --host 0.0.0.0 --port ${port} --strictPort`,
            );
          }
          // Common direct CLIs
          if (await hasCommand("vite")) {
            candidates.push(`vite --host 0.0.0.0 --port ${port} --strictPort`);
          }
          if (await hasCommand("next")) {
            candidates.push(`next dev -H 0.0.0.0 -p ${port}`);
          }
          startCmd =
            candidates[0] ||
            `npm run dev -- --host 0.0.0.0 --port ${port} --strictPort`;
        }

        // Ensure env vars also instruct frameworks to bind correctly
        // Prefix with HOST/PORT to cover frameworks that read env instead of CLI flags
        const envPrefixedStart = `HOST=0.0.0.0 PORT=${port} ${startCmd}`;

        // Start server using background execution
        logProgress(appId, `Starting dev server: ${envPrefixedStart}`);
        const started = await runBackground(envPrefixedStart, "/workspace");
        if (started.exitCode !== 0) {
          const recentLogs = (await readSandboxLogs(sandbox)).slice(-2000);
          throw new Error(
            `Start command failed with code ${started.exitCode}. Command: ${envPrefixedStart}. Logs: ${recentLogs}`,
          );
        }
        // Emit immediate short tail after triggering the background start
        try {
          const initTail = await runCmd(
            "bash -lc 'tail -n 20 /tmp/app.log 2>/dev/null || true'",
            "/workspace",
          );
          const initStr = (initTail.stdout || initTail.stderr || "").trim();
          if (initStr)
            logProgress(appId, `Dev server output (initial):\n${initStr}`);
        } catch {}

        // Proactively wait for the port to accept TCP connections inside the sandbox
        // Some frameworks print ready logs before the port actually binds
        let portReady = false;
        for (let i = 0; i < 60; i++) {
          // Try a lightweight TCP connect using Bash's /dev/tcp
          const tcpProbe = await runCmd(
            `bash -lc 'exec 3<>/dev/tcp/127.0.0.1/${port}'`,
            "/workspace",
          );
          if (tcpProbe.exitCode === 0) {
            portReady = true;
            break;
          }
          if (i % 5 === 0) {
            // Every ~5s, append a short progress with a tiny log tail
            try {
              const tail = await runCmd(
                "bash -lc 'tail -n 20 /tmp/app.log 2>/dev/null || true'",
                "/workspace",
              );
              const tailStr = (tail.stdout || tail.stderr || "")
                .split("\n")
                .slice(-10)
                .join("\n");
              if (tailStr.trim().length > 0) {
                logProgress(
                  appId,
                  `Waiting for port ${port} to open...\n${tailStr}`,
                );
              } else {
                logProgress(appId, `Waiting for port ${port} to open...`);
              }
            } catch {
              logProgress(appId, `Waiting for port ${port} to open...`);
            }
          }
          await new Promise((r) => setTimeout(r, 1000));
        }
        if (!portReady) {
          let recentLogs = (await readSandboxLogs(sandbox)).slice(-2000);
          if (!recentLogs) {
            // Fallback to shell tail if file read via SDK fails
            try {
              const tail = await runCmd(
                "bash -lc 'tail -n 120 /tmp/app.log 2>/dev/null || true'",
                "/workspace",
              );
              recentLogs = (tail.stdout || tail.stderr || "").slice(-2000);
            } catch {}
          }
          throw new Error(
            `Service did not open port ${port} in time. Check your dev command binds to 0.0.0.0 and the correct port. Recent logs: ${recentLogs}`,
          );
        }

        // Wait and retry for host exposure to be available
        let host = "";
        for (let i = 0; i < 30; i++) {
          try {
            // Some SDKs expose getHost directly on sandbox
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const h = await (sandbox as any).getHost?.(port);
            if (h) {
              host = h;
              break;
            }
          } catch {
            // Ignore getHost errors during retry
          }
          await new Promise((r) => setTimeout(r, 1500));
        }
        if (!host) {
          throw new Error(
            "Failed to expose sandbox port; server may not have started or SDK lacks getHost(). Update 'e2b' / '@e2b/code-interpreter'.",
          );
        }
        const url = `https://${host}`;
        logProgress(appId, `Sandbox ready at ${url}`);

        // Record running sandbox as a new version (max 3 kept)
        const container =
          runningSandboxes.get(appId) ??
          ({ versions: [], nextVersion: 0 } as AppSandboxes);
        const version = container.nextVersion++;
        const rec: SandboxRecord = {
          sandbox,
          appId,
          port,
          url,
          startedAt: Date.now(),
          version,
          ttlMs,
        };
        container.versions.push(rec);
        while (container.versions.length > 3) {
          const old = container.versions.shift();
          try {
            await old?.sandbox?.close?.();
          } catch (e) {
            logger.warn("E2B sandbox close during rotation failed:", e);
          }
        }
        runningSandboxes.set(appId, container);

        // Schedule an explicit shutdown as a safety net
        setTimeout(async () => {
          const app = runningSandboxes.get(appId);
          if (!app) return;
          try {
            await (sandbox as any).close?.();
          } catch (e) {
            logger.warn("E2B sandbox close failed:", e);
          }
          const idx = app.versions.findIndex((v) => v.sandbox === sandbox);
          if (idx >= 0) app.versions.splice(idx, 1);
          if (app.versions.length === 0) runningSandboxes.delete(appId);
        }, ttlMs);

        // Do not await process end; leave running until sandbox timeout/close
        return { url };
      } catch (err) {
        // Best-effort cleanup on failure
        try {
          await (sandbox as any).close?.();
        } catch (e) {
          logger.warn("E2B sandbox cleanup after failure failed:", e);
        }
        throw err;
      }
    },
  );
}
