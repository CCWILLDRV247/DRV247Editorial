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
