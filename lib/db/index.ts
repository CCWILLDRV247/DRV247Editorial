import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { seedIfEmpty } from "./seed";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "drv247.sqlite");

function createSchema(sqlite: Database.Database) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      identifier TEXT NOT NULL,
      default_category_id INTEGER NOT NULL REFERENCES categories(id),
      enabled INTEGER NOT NULL DEFAULT 1,
      last_fetch_at INTEGER,
      last_fetch_status TEXT NOT NULL DEFAULT 'idle',
      last_fetch_error TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id INTEGER NOT NULL REFERENCES sources(id),
      category_id INTEGER NOT NULL REFERENCES categories(id),
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      image_url TEXT,
      canonical_url TEXT NOT NULL UNIQUE,
      published_at INTEGER NOT NULL,
      hidden INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS stories_category_published_idx
      ON stories (category_id, published_at);
    CREATE INDEX IF NOT EXISTS stories_source_idx ON stories (source_id);
  `);
}

const globalForDb = globalThis as unknown as {
  drvSqlite?: Database.Database;
  drvDb?: ReturnType<typeof drizzle<typeof schema>>;
};

function getSqlite() {
  if (!globalForDb.drvSqlite) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const sqlite = new Database(DB_PATH);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    createSchema(sqlite);
    globalForDb.drvSqlite = sqlite;
  }
  return globalForDb.drvSqlite;
}

export function getDb() {
  if (!globalForDb.drvDb) {
    const sqlite = getSqlite();
    globalForDb.drvDb = drizzle(sqlite, { schema });
    seedIfEmpty(globalForDb.drvDb);
  }
  return globalForDb.drvDb;
}

export { schema };
