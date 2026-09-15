import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { seedIfEmpty } from "./seed";
import { seedEngine } from "@/lib/engine/seed";

const onVercel = Boolean(process.env.VERCEL);
const DATA_DIR = onVercel
  ? path.join("/tmp", "drv247-data")
  : path.join(process.cwd(), "data");
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

    CREATE TABLE IF NOT EXISTS media_sources (
      id TEXT PRIMARY KEY,
      publication TEXT NOT NULL,
      country TEXT NOT NULL,
      url TEXT NOT NULL,
      rss_url TEXT,
      website_available INTEGER NOT NULL DEFAULT 1,
      scrape_difficulty TEXT NOT NULL,
      editorial_category TEXT NOT NULL,
      marques_covered TEXT NOT NULL,
      relevance TEXT NOT NULL,
      csv_enabled INTEGER NOT NULL DEFAULT 1,
      enabled INTEGER NOT NULL DEFAULT 0,
      source_type TEXT NOT NULL,
      rss_verified_status TEXT NOT NULL,
      rss_confidence TEXT NOT NULL,
      priority INTEGER NOT NULL DEFAULT 50,
      max_articles INTEGER NOT NULL DEFAULT 8,
      allow_excerpt INTEGER NOT NULL DEFAULT 1,
      allow_image INTEGER NOT NULL DEFAULT 1,
      last_success_at INTEGER,
      last_failure_at INTEGER,
      failure_count INTEGER NOT NULL DEFAULT 0,
      last_http_status INTEGER,
      last_error TEXT,
      last_method TEXT,
      last_article_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id TEXT NOT NULL REFERENCES media_sources(id),
      publication TEXT NOT NULL,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      canonical_url TEXT NOT NULL UNIQUE,
      guid TEXT,
      author TEXT,
      published_at INTEGER NOT NULL,
      image_url TEXT,
      excerpt TEXT NOT NULL,
      editorial_score INTEGER NOT NULL DEFAULT 0,
      processed INTEGER NOT NULL DEFAULT 0,
      first_seen INTEGER NOT NULL,
      last_seen INTEGER NOT NULL,
      last_processed INTEGER,
      duplicate_group_id TEXT,
      ingestion_method TEXT NOT NULL,
      why_it_matters TEXT,
      ai_summary TEXT,
      metadata TEXT
    );

    CREATE INDEX IF NOT EXISTS articles_source_idx ON articles (source_id);
    CREATE INDEX IF NOT EXISTS articles_published_idx ON articles (published_at);
    CREATE INDEX IF NOT EXISTS articles_dupe_idx ON articles (duplicate_group_id);

    CREATE TABLE IF NOT EXISTS article_entities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER NOT NULL REFERENCES articles(id),
      kind TEXT NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      make TEXT,
      model TEXT,
      confidence INTEGER NOT NULL DEFAULT 80
    );

    CREATE TABLE IF NOT EXISTS vehicle_entities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      make TEXT,
      model TEXT
    );

    CREATE TABLE IF NOT EXISTS article_categories (
      article_id INTEGER NOT NULL REFERENCES articles(id),
      category TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS article_interests (
      article_id INTEGER NOT NULL REFERENCES articles(id),
      interest TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS article_locations (
      article_id INTEGER NOT NULL REFERENCES articles(id),
      location TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS article_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER NOT NULL REFERENCES articles(id),
      url TEXT NOT NULL,
      source TEXT,
      alt TEXT
    );

    CREATE TABLE IF NOT EXISTS ingestion_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id TEXT NOT NULL REFERENCES media_sources(id),
      started_at INTEGER NOT NULL,
      finished_at INTEGER,
      method TEXT,
      status TEXT NOT NULL,
      http_status INTEGER,
      error_message TEXT,
      fetched INTEGER NOT NULL DEFAULT 0,
      inserted INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS demo_users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT
    );

    CREATE TABLE IF NOT EXISTS demo_vehicles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES demo_users(id),
      make TEXT NOT NULL,
      model TEXT NOT NULL,
      generation TEXT,
      variant TEXT
    );

    CREATE TABLE IF NOT EXISTS demo_user_interests (
      user_id TEXT NOT NULL REFERENCES demo_users(id),
      interest TEXT NOT NULL
    );
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
    // WAL extra files are fine locally; DELETE is simpler on Vercel's /tmp.
    sqlite.pragma(onVercel ? "journal_mode = DELETE" : "journal_mode = WAL");
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
    seedEngine(globalForDb.drvDb);
  }
  return globalForDb.drvDb;
}

export { schema };
