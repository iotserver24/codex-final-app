// db.ts
import {
  type BetterSQLite3Database,
  drizzle,
} from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "node:path";
import fs from "node:fs";
import { getAppPath, getUserDataPath } from "../paths/paths";
import log from "electron-log";

const logger = log.scope("db");

// Database connection factory
let _db: ReturnType<typeof drizzle> | null = null;

/**
 * Best-effort self-healing for users upgrading from older builds where
 * migrations may not have run (or the DB was copied without meta tables).
 * We create missing tables/columns that recent code expects so the app can
 * start, and then immediately run proper Drizzle migrations afterwards.
 */
function ensureBaselineSchema(sqlite: Database.Database): void {
  try {
    // Helper: does a table exist?
    const hasTable = (name: string): boolean => {
      const row = sqlite
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
        .get(name) as { name?: string } | undefined;
      return Boolean(row && row.name === name);
    };

    // Helper: does a column exist on a table?
    const hasColumn = (table: string, column: string): boolean => {
      const rows = sqlite.prepare(`PRAGMA table_info(${table})`).all() as any[];
      return rows?.some((r) => r.name === column) ?? false;
    };

    // apps table (base) and its columns
    if (!hasTable("apps")) {
      logger.warn("Self-heal: creating table apps");
      sqlite
        .prepare(
          `CREATE TABLE IF NOT EXISTS \`apps\` (
            \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
            \`name\` text NOT NULL,
            \`path\` text NOT NULL,
            \`created_at\` integer DEFAULT (unixepoch()) NOT NULL,
            \`updated_at\` integer DEFAULT (unixepoch()) NOT NULL,
            \`github_org\` text,
            \`github_repo\` text,
            \`github_branch\` text,
            \`supabase_project_id\` text,
            \`neon_project_id\` text,
            \`neon_development_branch_id\` text,
            \`neon_preview_branch_id\` text,
            \`vercel_project_id\` text,
            \`vercel_project_name\` text,
            \`vercel_team_id\` text,
            \`vercel_deployment_url\` text,
            \`install_command\` text,
            \`start_command\` text,
            \`chat_context\` text
          )`,
        )
        .run();
    }
    if (hasTable("apps")) {
      if (!hasColumn("apps", "install_command")) {
        logger.warn("Self-heal: adding apps.install_command column");
        sqlite.prepare("ALTER TABLE `apps` ADD `install_command` text").run();
      }
      if (!hasColumn("apps", "start_command")) {
        logger.warn("Self-heal: adding apps.start_command column");
        sqlite.prepare("ALTER TABLE `apps` ADD `start_command` text").run();
      }
    }

    // language_model_providers (and language_models depends on it)
    if (!hasTable("language_model_providers")) {
      logger.warn("Self-heal: creating table language_model_providers");
      sqlite
        .prepare(
          `CREATE TABLE IF NOT EXISTS \`language_model_providers\` (
            \`id\` text PRIMARY KEY NOT NULL,
            \`name\` text NOT NULL,
            \`api_base_url\` text NOT NULL,
            \`env_var_name\` text,
            \`created_at\` integer DEFAULT (unixepoch()) NOT NULL,
            \`updated_at\` integer DEFAULT (unixepoch()) NOT NULL
          )`,
        )
        .run();
    }

    if (!hasTable("language_models")) {
      logger.warn("Self-heal: creating table language_models");
      sqlite
        .prepare(
          `CREATE TABLE IF NOT EXISTS \`language_models\` (
            \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
            \`display_name\` text NOT NULL,
            \`api_name\` text NOT NULL,
            \`builtin_provider_id\` text,
            \`custom_provider_id\` text,
            \`description\` text,
            \`max_output_tokens\` integer,
            \`context_window\` integer,
            \`created_at\` integer DEFAULT (unixepoch()) NOT NULL,
            \`updated_at\` integer DEFAULT (unixepoch()) NOT NULL,
            FOREIGN KEY (\`custom_provider_id\`) REFERENCES \`language_model_providers\`(\`id\`) ON UPDATE NO ACTION ON DELETE CASCADE
          )`,
        )
        .run();
    }

    // prompts
    if (!hasTable("prompts")) {
      logger.warn("Self-heal: creating table prompts");
      sqlite
        .prepare(
          `CREATE TABLE IF NOT EXISTS \`prompts\` (
            \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
            \`title\` text NOT NULL,
            \`description\` text,
            \`content\` text NOT NULL,
            \`created_at\` integer DEFAULT (unixepoch()) NOT NULL,
            \`updated_at\` integer DEFAULT (unixepoch()) NOT NULL
          )`,
        )
        .run();
    }

    // chats (depends on apps)
    if (!hasTable("chats")) {
      logger.warn("Self-heal: creating table chats");
      sqlite
        .prepare(
          `CREATE TABLE IF NOT EXISTS \`chats\` (
            \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
            \`app_id\` integer NOT NULL,
            \`title\` text,
            \`initial_commit_hash\` text,
            \`created_at\` integer DEFAULT (unixepoch()) NOT NULL,
            FOREIGN KEY (\`app_id\`) REFERENCES \`apps\`(\`id\`) ON UPDATE NO ACTION ON DELETE CASCADE
          )`,
        )
        .run();
    }

    // messages (depends on chats)
    if (!hasTable("messages")) {
      logger.warn("Self-heal: creating table messages");
      sqlite
        .prepare(
          `CREATE TABLE IF NOT EXISTS \`messages\` (
            \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
            \`chat_id\` integer NOT NULL,
            \`role\` text NOT NULL,
            \`content\` text NOT NULL,
            \`approval_state\` text,
            \`commit_hash\` text,
            \`created_at\` integer DEFAULT (unixepoch()) NOT NULL,
            FOREIGN KEY (\`chat_id\`) REFERENCES \`chats\`(\`id\`) ON UPDATE NO ACTION ON DELETE CASCADE
          )`,
        )
        .run();
    }

    // versions (depends on apps)
    if (!hasTable("versions")) {
      logger.warn("Self-heal: creating table versions");
      sqlite
        .prepare(
          `CREATE TABLE IF NOT EXISTS \`versions\` (
            \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
            \`app_id\` integer NOT NULL,
            \`commit_hash\` text NOT NULL,
            \`neon_db_timestamp\` text,
            \`created_at\` integer DEFAULT (unixepoch()) NOT NULL,
            \`updated_at\` integer DEFAULT (unixepoch()) NOT NULL,
            FOREIGN KEY (\`app_id\`) REFERENCES \`apps\`(\`id\`) ON UPDATE NO ACTION ON DELETE CASCADE
          )`,
        )
        .run();
      // Unique index compatible with drizzle unique(app_id, commit_hash)
      try {
        sqlite
          .prepare(
            `CREATE UNIQUE INDEX IF NOT EXISTS \`versions_app_commit_unique\` ON \`versions\` (\`app_id\`, \`commit_hash\`)`,
          )
          .run();
      } catch (e) {
        logger.warn("Self-heal: versions unique index create failed (ok)", e);
      }
    }
  } catch (e) {
    logger.error("Self-heal baseline schema failed:", e);
  }
}

export function resetDatabase(): void {
  try {
    if (_db && (_db as any).$client) {
      (_db as any).$client.close();
    }
  } catch (e) {
    logger.error("Error closing database client during reset:", e);
  } finally {
    _db = null;
  }
}

/**
 * Get the database path based on the current environment
 */
export function getDatabasePath(): string {
  return path.join(getUserDataPath(), "sqlite.db");
}

/**
 * Initialize the database connection
 */
export function initializeDatabase(): BetterSQLite3Database<typeof schema> & {
  $client: Database.Database;
} {
  if (_db) return _db as any;

  const dbPath = getDatabasePath();
  logger.log("Initializing database at:", dbPath);

  // Check if the database file exists and remove it if it has issues
  try {
    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath);
      if (stats.size < 100) {
        logger.log("Database file exists but may be corrupted. Removing it...");
        fs.unlinkSync(dbPath);
      }
    }
  } catch (error) {
    logger.error("Error checking database file:", error);
  }

  fs.mkdirSync(getUserDataPath(), { recursive: true });
  fs.mkdirSync(getAppPath("."), { recursive: true });

  const sqlite = new Database(dbPath, { timeout: 10000 });
  sqlite.pragma("foreign_keys = ON");

  // Try to ensure critical tables/columns exist before running migrations
  ensureBaselineSchema(sqlite);

  _db = drizzle(sqlite, { schema });

  try {
    const migrationsFolder = path.join(__dirname, "..", "..", "drizzle");
    if (!fs.existsSync(migrationsFolder)) {
      logger.error("Migrations folder not found:", migrationsFolder);
    } else {
      logger.log("Running migrations from:", migrationsFolder);
      migrate(_db, { migrationsFolder });
    }
  } catch (error) {
    logger.error("Migration error:", error);
  }

  return _db as any;
}

/**
 * Get the database instance (throws if not initialized)
 */
export function getDb(): BetterSQLite3Database<typeof schema> & {
  $client: Database.Database;
} {
  if (!_db) {
    throw new Error(
      "Database not initialized. Call initializeDatabase() first.",
    );
  }
  return _db as any;
}

export const db = new Proxy({} as any, {
  get(target, prop) {
    const database = getDb();
    return database[prop as keyof typeof database];
  },
}) as BetterSQLite3Database<typeof schema> & {
  $client: Database.Database;
};
