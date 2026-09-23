import fs from "node:fs";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";
import * as intelligenceSchema from "./intelligence-schema";
import { seedIfEmpty } from "./seed";
import { seedEngine } from "@/lib/engine/seed";
import { ensureIntelligenceSchema } from "@/lib/intelligence/ensure";
import { seedIntelligence } from "@/lib/intelligence/seed";

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL
    )`,
  `CREATE TABLE IF NOT EXISTS sources (
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
    )`,
  `CREATE TABLE IF NOT EXISTS stories (
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
    )`,
  `CREATE INDEX IF NOT EXISTS stories_category_published_idx
      ON stories (category_id, published_at)`,
  `CREATE INDEX IF NOT EXISTS stories_source_idx ON stories (source_id)`,
  `CREATE TABLE IF NOT EXISTS media_sources (
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
    )`,
  `CREATE TABLE IF NOT EXISTS articles (
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
    )`,
  `CREATE INDEX IF NOT EXISTS articles_source_idx ON articles (source_id)`,
  `CREATE INDEX IF NOT EXISTS articles_published_idx ON articles (published_at)`,
  `CREATE INDEX IF NOT EXISTS articles_dupe_idx ON articles (duplicate_group_id)`,
  `CREATE INDEX IF NOT EXISTS article_entities_article_idx ON article_entities (article_id)`,
  `CREATE INDEX IF NOT EXISTS article_categories_article_idx ON article_categories (article_id)`,
  `CREATE INDEX IF NOT EXISTS article_interests_article_idx ON article_interests (article_id)`,
  `CREATE INDEX IF NOT EXISTS article_locations_article_idx ON article_locations (article_id)`,
  `CREATE INDEX IF NOT EXISTS article_primary_slug_idx ON article_primary (primary_slug)`,
  `CREATE TABLE IF NOT EXISTS article_entities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER NOT NULL REFERENCES articles(id),
      kind TEXT NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      make TEXT,
      model TEXT,
      confidence INTEGER NOT NULL DEFAULT 80
    )`,
  `CREATE TABLE IF NOT EXISTS vehicle_entities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      make TEXT,
      model TEXT
    )`,
  `CREATE TABLE IF NOT EXISTS article_categories (
      article_id INTEGER NOT NULL REFERENCES articles(id),
      category TEXT NOT NULL
    )`,
  `CREATE TABLE IF NOT EXISTS article_interests (
      article_id INTEGER NOT NULL REFERENCES articles(id),
      interest TEXT NOT NULL
    )`,
  `CREATE TABLE IF NOT EXISTS article_locations (
      article_id INTEGER NOT NULL REFERENCES articles(id),
      location TEXT NOT NULL
    )`,
  `CREATE TABLE IF NOT EXISTS article_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER NOT NULL REFERENCES articles(id),
      url TEXT NOT NULL,
      source TEXT,
      alt TEXT,
      source_type TEXT,
      status TEXT,
      last_validated INTEGER,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_primary INTEGER NOT NULL DEFAULT 0
    )`,
  `CREATE TABLE IF NOT EXISTS ingestion_runs (
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
    )`,
  `CREATE TABLE IF NOT EXISTS demo_users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT
    )`,
  `CREATE TABLE IF NOT EXISTS demo_vehicles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES demo_users(id),
      make TEXT NOT NULL,
      model TEXT NOT NULL,
      generation TEXT,
      variant TEXT,
      year INTEGER,
      engine TEXT,
      fuel TEXT,
      transmission TEXT,
      body TEXT,
      power_bhp INTEGER,
      registration TEXT,
      specification TEXT
    )`,
  `CREATE TABLE IF NOT EXISTS demo_user_interests (
      user_id TEXT NOT NULL REFERENCES demo_users(id),
      interest TEXT NOT NULL
    )`,
  `CREATE TABLE IF NOT EXISTS editorial_primary_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      sort_order INTEGER NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1
    )`,
  `CREATE TABLE IF NOT EXISTS editorial_secondary_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      primary_category_id INTEGER NOT NULL REFERENCES editorial_primary_categories(id),
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      enabled INTEGER NOT NULL DEFAULT 1
    )`,
  `CREATE TABLE IF NOT EXISTS article_primary (
      article_id INTEGER PRIMARY KEY REFERENCES articles(id),
      primary_slug TEXT NOT NULL,
      confidence INTEGER NOT NULL DEFAULT 80,
      source TEXT NOT NULL DEFAULT 'rule'
    )`,
];

const appSchema = { ...schema, ...intelligenceSchema };
export type AppDb = LibSQLDatabase<typeof appSchema>;

const globalForDb = globalThis as unknown as {
  drvLibsql?: Client;
  drvDb?: AppDb;
  drvDbReady?: Promise<AppDb>;
};

function connection() {
  const url = process.env.TURSO_DATABASE_URL || process.env.LIBSQL_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_AUTH_TOKEN;
  if (url) {
    return { url, authToken };
  }
  if (process.env.VERCEL) {
    throw new Error(
      "Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN. Ephemeral /tmp SQLite and ingest-on-homepage-load are disabled.",
    );
  }
  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  return { url: `file:${path.join(dir, "drv247.sqlite")}` };
}

async function ensureSchema(client: Client) {
  try {
    await client.execute("SELECT 1 FROM media_sources LIMIT 1");
  } catch {
    for (const sql of SCHEMA_STATEMENTS) {
      await client.execute(sql);
    }
  }
  await ensureTaxonomy(client);
  await ensureArticleImageColumns(client);
  await ensureMetadataFoundation(client);
  await ensureDeskPicks(client);
}

const INDEX_STATEMENTS = [
  `CREATE INDEX IF NOT EXISTS article_entities_article_idx ON article_entities (article_id)`,
  `CREATE INDEX IF NOT EXISTS article_categories_article_idx ON article_categories (article_id)`,
  `CREATE INDEX IF NOT EXISTS article_interests_article_idx ON article_interests (article_id)`,
  `CREATE INDEX IF NOT EXISTS article_locations_article_idx ON article_locations (article_id)`,
  `CREATE INDEX IF NOT EXISTS article_primary_slug_idx ON article_primary (primary_slug)`,
];

async function ensureTaxonomy(client: Client) {
  await Promise.all([
    client.execute(`CREATE TABLE IF NOT EXISTS editorial_primary_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      sort_order INTEGER NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1
    )`),
    client.execute(`CREATE TABLE IF NOT EXISTS editorial_secondary_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      primary_category_id INTEGER NOT NULL REFERENCES editorial_primary_categories(id),
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      enabled INTEGER NOT NULL DEFAULT 1
    )`),
    client.execute(`CREATE TABLE IF NOT EXISTS article_primary (
      article_id INTEGER PRIMARY KEY REFERENCES articles(id),
      primary_slug TEXT NOT NULL,
      confidence INTEGER NOT NULL DEFAULT 80,
      source TEXT NOT NULL DEFAULT 'rule'
    )`),
  ]);
  await Promise.all(INDEX_STATEMENTS.map((sql) => client.execute(sql)));
}

const ARTICLE_IMAGE_COLUMNS = [
  "ALTER TABLE article_images ADD COLUMN source_type TEXT",
  "ALTER TABLE article_images ADD COLUMN status TEXT",
  "ALTER TABLE article_images ADD COLUMN last_validated INTEGER",
  "ALTER TABLE article_images ADD COLUMN sort_order INTEGER",
  "ALTER TABLE article_images ADD COLUMN is_primary INTEGER",
];

async function ensureArticleImageColumns(client: Client) {
  for (const sql of ARTICLE_IMAGE_COLUMNS) {
    try {
      await client.execute(sql);
    } catch {
      // Column already exists on live Turso / local sqlite.
    }
  }
}

const METADATA_STATEMENTS = [
  "ALTER TABLE article_entities ADD COLUMN relevance TEXT",
  "ALTER TABLE article_entities ADD COLUMN chassis TEXT",
  "ALTER TABLE article_entities ADD COLUMN canonical_id TEXT",
  "ALTER TABLE article_entities ADD COLUMN source TEXT",
  `CREATE TABLE IF NOT EXISTS article_content_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER NOT NULL REFERENCES articles(id),
      content_type TEXT NOT NULL,
      confidence INTEGER NOT NULL DEFAULT 80,
      source TEXT NOT NULL DEFAULT 'rule'
    )`,
  `CREATE TABLE IF NOT EXISTS article_scenes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER NOT NULL REFERENCES articles(id),
      scene TEXT NOT NULL,
      confidence INTEGER NOT NULL DEFAULT 80,
      source TEXT NOT NULL DEFAULT 'rule'
    )`,
  `CREATE TABLE IF NOT EXISTS article_motorsport (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER NOT NULL REFERENCES articles(id),
      series TEXT NOT NULL,
      confidence INTEGER NOT NULL DEFAULT 80,
      source TEXT NOT NULL DEFAULT 'rule'
    )`,
  `CREATE TABLE IF NOT EXISTS article_geography (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER NOT NULL REFERENCES articles(id),
      kind TEXT NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      confidence INTEGER NOT NULL DEFAULT 80,
      source TEXT NOT NULL DEFAULT 'rule'
    )`,
  `CREATE TABLE IF NOT EXISTS article_related (
      article_id INTEGER NOT NULL REFERENCES articles(id),
      related_article_id INTEGER NOT NULL REFERENCES articles(id),
      reason TEXT NOT NULL,
      score INTEGER NOT NULL DEFAULT 0
    )`,
  `CREATE INDEX IF NOT EXISTS article_content_types_article_idx ON article_content_types (article_id)`,
  `CREATE INDEX IF NOT EXISTS article_scenes_article_idx ON article_scenes (article_id)`,
  `CREATE INDEX IF NOT EXISTS article_motorsport_article_idx ON article_motorsport (article_id)`,
  `CREATE INDEX IF NOT EXISTS article_geography_article_idx ON article_geography (article_id)`,
  `CREATE INDEX IF NOT EXISTS article_related_article_idx ON article_related (article_id)`,
  `CREATE INDEX IF NOT EXISTS article_entities_canonical_idx ON article_entities (canonical_id)`,
];

async function ensureMetadataFoundation(client: Client) {
  for (const sql of METADATA_STATEMENTS) {
    try {
      await client.execute(sql);
    } catch {
      // Column/table already exists on live Turso / local sqlite.
    }
  }
}

const DESK_PICK_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS desk_picks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER NOT NULL UNIQUE REFERENCES articles(id),
      note TEXT,
      curator TEXT NOT NULL DEFAULT 'DRV247 Desk',
      selected_at INTEGER NOT NULL,
      expires_at INTEGER,
      featured INTEGER NOT NULL DEFAULT 0,
      category TEXT,
      label TEXT NOT NULL DEFAULT 'from-the-desk',
      active INTEGER NOT NULL DEFAULT 1
    )`,
  `CREATE INDEX IF NOT EXISTS desk_picks_article_idx ON desk_picks (article_id)`,
  `CREATE INDEX IF NOT EXISTS desk_picks_active_idx ON desk_picks (active, featured, selected_at)`,
  "ALTER TABLE desk_picks ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0",
];

async function ensureDeskPicks(client: Client) {
  for (const sql of DESK_PICK_STATEMENTS) {
    try {
      await client.execute(sql);
    } catch {
      // Table/index already exists on live Turso / local sqlite.
    }
  }
}

async function createDb() {
  const client = globalForDb.drvLibsql ?? createClient(connection());
  globalForDb.drvLibsql = client;
  await ensureSchema(client);
  await ensureIntelligenceSchema(client);
  const db = drizzle(client, { schema: appSchema });
  await seedIfEmpty(db as never);
  await seedEngine(db as never);
  await seedIntelligence(db as never);
  globalForDb.drvDb = db;
  return db;
}

export async function getDb(): Promise<AppDb> {
  if (globalForDb.drvDb) return globalForDb.drvDb;
  if (!globalForDb.drvDbReady) {
    globalForDb.drvDbReady = createDb().catch((error) => {
      globalForDb.drvDbReady = undefined;
      throw error;
    });
  }
  return globalForDb.drvDbReady;
}

export { schema };
