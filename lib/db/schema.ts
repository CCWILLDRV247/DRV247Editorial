import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const sourceTypes = ["rss", "youtube", "newsapi"] as const;
export type SourceType = (typeof sourceTypes)[number];

export const fetchStatuses = ["idle", "ok", "error", "running"] as const;
export type FetchStatus = (typeof fetchStatuses)[number];

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
});

export const sources = sqliteTable("sources", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").$type<SourceType>().notNull(),
  name: text("name").notNull(),
  identifier: text("identifier").notNull(),
  defaultCategoryId: integer("default_category_id")
    .notNull()
    .references(() => categories.id),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  lastFetchAt: integer("last_fetch_at"),
  lastFetchStatus: text("last_fetch_status")
    .$type<FetchStatus>()
    .notNull()
    .default("idle"),
  lastFetchError: text("last_fetch_error"),
  createdAt: integer("created_at").notNull(),
});

export const stories = sqliteTable("stories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sourceId: integer("source_id")
    .notNull()
    .references(() => sources.id),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categories.id),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  imageUrl: text("image_url"),
  canonicalUrl: text("canonical_url").notNull().unique(),
  publishedAt: integer("published_at").notNull(),
  hidden: integer("hidden", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at").notNull(),
});

export type Category = typeof categories.$inferSelect;
export type Source = typeof sources.$inferSelect;
export type Story = typeof stories.$inferSelect;

export const mediaSources = sqliteTable("media_sources", {
  id: text("id").primaryKey(),
  publication: text("publication").notNull(),
  country: text("country").notNull(),
  url: text("url").notNull(),
  rssUrl: text("rss_url"),
  websiteAvailable: integer("website_available", { mode: "boolean" }).notNull().default(true),
  scrapeDifficulty: text("scrape_difficulty").notNull(),
  editorialCategory: text("editorial_category").notNull(),
  marquesCovered: text("marques_covered").notNull(),
  relevance: text("relevance").notNull(),
  csvEnabled: integer("csv_enabled", { mode: "boolean" }).notNull().default(true),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
  sourceType: text("source_type").notNull(),
  rssVerifiedStatus: text("rss_verified_status").notNull(),
  rssConfidence: text("rss_confidence").notNull(),
  priority: integer("priority").notNull().default(50),
  maxArticles: integer("max_articles").notNull().default(8),
  allowExcerpt: integer("allow_excerpt", { mode: "boolean" }).notNull().default(true),
  allowImage: integer("allow_image", { mode: "boolean" }).notNull().default(true),
  lastSuccessAt: integer("last_success_at"),
  lastFailureAt: integer("last_failure_at"),
  failureCount: integer("failure_count").notNull().default(0),
  lastHttpStatus: integer("last_http_status"),
  lastError: text("last_error"),
  lastMethod: text("last_method"),
  lastArticleCount: integer("last_article_count").notNull().default(0),
});

export const articles = sqliteTable("articles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sourceId: text("source_id")
    .notNull()
    .references(() => mediaSources.id),
  publication: text("publication").notNull(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  canonicalUrl: text("canonical_url").notNull().unique(),
  guid: text("guid"),
  author: text("author"),
  publishedAt: integer("published_at").notNull(),
  imageUrl: text("image_url"),
  excerpt: text("excerpt").notNull(),
  editorialScore: integer("editorial_score").notNull().default(0),
  processed: integer("processed", { mode: "boolean" }).notNull().default(false),
  firstSeen: integer("first_seen").notNull(),
  lastSeen: integer("last_seen").notNull(),
  lastProcessed: integer("last_processed"),
  duplicateGroupId: text("duplicate_group_id"),
  ingestionMethod: text("ingestion_method").notNull(),
  whyItMatters: text("why_it_matters"),
  aiSummary: text("ai_summary"),
  metadata: text("metadata"),
});

export const articleEntities = sqliteTable("article_entities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  articleId: integer("article_id")
    .notNull()
    .references(() => articles.id),
  kind: text("kind").notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  make: text("make"),
  model: text("model"),
  confidence: integer("confidence").notNull().default(80),
});

export const vehicleEntities = sqliteTable("vehicle_entities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  kind: text("kind").notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  make: text("make"),
  model: text("model"),
});

export const articleCategories = sqliteTable("article_categories", {
  articleId: integer("article_id")
    .notNull()
    .references(() => articles.id),
  category: text("category").notNull(),
});

export const articleInterests = sqliteTable("article_interests", {
  articleId: integer("article_id")
    .notNull()
    .references(() => articles.id),
  interest: text("interest").notNull(),
});

export const articleLocations = sqliteTable("article_locations", {
  articleId: integer("article_id")
    .notNull()
    .references(() => articles.id),
  location: text("location").notNull(),
});

export const articleImages = sqliteTable("article_images", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  articleId: integer("article_id")
    .notNull()
    .references(() => articles.id),
  url: text("url").notNull(),
  source: text("source"),
  alt: text("alt"),
});

export const ingestionRuns = sqliteTable("ingestion_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sourceId: text("source_id")
    .notNull()
    .references(() => mediaSources.id),
  startedAt: integer("started_at").notNull(),
  finishedAt: integer("finished_at"),
  method: text("method"),
  status: text("status").notNull(),
  httpStatus: integer("http_status"),
  errorMessage: text("error_message"),
  fetched: integer("fetched").notNull().default(0),
  inserted: integer("inserted").notNull().default(0),
});

export const demoUsers = sqliteTable("demo_users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location"),
});

export const demoVehicles = sqliteTable("demo_vehicles", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => demoUsers.id),
  make: text("make").notNull(),
  model: text("model").notNull(),
  generation: text("generation"),
  variant: text("variant"),
});

export const demoUserInterests = sqliteTable("demo_user_interests", {
  userId: text("user_id")
    .notNull()
    .references(() => demoUsers.id),
  interest: text("interest").notNull(),
});

export const editorialPrimaryCategories = sqliteTable("editorial_primary_categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
});

export const editorialSecondaryCategories = sqliteTable("editorial_secondary_categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  primaryCategoryId: integer("primary_category_id")
    .notNull()
    .references(() => editorialPrimaryCategories.id),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
});

export const articlePrimary = sqliteTable("article_primary", {
  articleId: integer("article_id")
    .primaryKey()
    .references(() => articles.id),
  primarySlug: text("primary_slug").notNull(),
  confidence: integer("confidence").notNull().default(80),
  source: text("source").notNull().default("rule"),
});

export type MediaSource = typeof mediaSources.$inferSelect;
export type Article = typeof articles.$inferSelect;
export type IngestionRun = typeof ingestionRuns.$inferSelect;
export type DemoUser = typeof demoUsers.$inferSelect;
export type DemoVehicle = typeof demoVehicles.$inferSelect;

