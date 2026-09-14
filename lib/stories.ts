import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { categories, sources, stories } from "@/lib/db/schema";

export type StoryDto = {
  id: number;
  title: string;
  summary: string;
  imageUrl: string | null;
  canonicalUrl: string;
  publishedAt: string;
  hidden: boolean;
  category: { id: number; slug: string; name: string };
  source: { id: number; name: string; type: string };
};

function toDto(row: {
  story: typeof stories.$inferSelect;
  category: typeof categories.$inferSelect;
  source: typeof sources.$inferSelect;
}): StoryDto {
  return {
    id: row.story.id,
    title: row.story.title,
    summary: row.story.summary,
    imageUrl: row.story.imageUrl,
    canonicalUrl: row.story.canonicalUrl,
    publishedAt: new Date(row.story.publishedAt).toISOString(),
    hidden: row.story.hidden,
    category: {
      id: row.category.id,
      slug: row.category.slug,
      name: row.category.name,
    },
    source: {
      id: row.source.id,
      name: row.source.name,
      type: row.source.type,
    },
  };
}

export async function listCategories() {
  const db = getDb();
  return db.select().from(categories).all();
}

export async function getCategoryBySlug(slug: string) {
  const db = getDb();
  return db.select().from(categories).where(eq(categories.slug, slug)).get();
}

export async function listPublicStories(options?: {
  categoryId?: number;
  limit?: number;
}) {
  const db = getDb();
  const rows = db
    .select({
      story: stories,
      category: categories,
      source: sources,
    })
    .from(stories)
    .innerJoin(categories, eq(stories.categoryId, categories.id))
    .innerJoin(sources, eq(stories.sourceId, sources.id))
    .where(
      options?.categoryId
        ? and(eq(stories.hidden, false), eq(stories.categoryId, options.categoryId))
        : eq(stories.hidden, false),
    )
    .orderBy(desc(stories.publishedAt))
    .limit(options?.limit ?? 40)
    .all();

  return rows.map(toDto);
}

export async function getPublicStory(id: number) {
  const db = getDb();
  const row = db
    .select({
      story: stories,
      category: categories,
      source: sources,
    })
    .from(stories)
    .innerJoin(categories, eq(stories.categoryId, categories.id))
    .innerJoin(sources, eq(stories.sourceId, sources.id))
    .where(and(eq(stories.id, id), eq(stories.hidden, false)))
    .get();
  return row ? toDto(row) : null;
}

export async function listAdminStories() {
  const db = getDb();
  const rows = db
    .select({
      story: stories,
      category: categories,
      source: sources,
    })
    .from(stories)
    .innerJoin(categories, eq(stories.categoryId, categories.id))
    .innerJoin(sources, eq(stories.sourceId, sources.id))
    .orderBy(desc(stories.publishedAt))
    .limit(200)
    .all();
  return rows.map(toDto);
}

export async function listAdminSources() {
  const db = getDb();
  return db.select().from(sources).all();
}
