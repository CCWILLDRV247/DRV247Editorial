import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  articleCategories,
  articleInterests,
  articlePrimary,
  articles,
} from "@/lib/db/schema";
import { MAGAZINE_NAV, type ContentPrimary } from "../../config/magazine-nav";
import { classifyPrimary, type ClassifyInput } from "./taxonomy";

export async function upsertArticlePrimary(articleId: number, input: ClassifyInput) {
  const db = await getDb();
  const primarySlug = classifyPrimary(input);
  const existing = (
    await db.select().from(articlePrimary).where(eq(articlePrimary.articleId, articleId)).limit(1)
  )[0];
  if (existing?.source === "manual" || existing?.source === "ai") return primarySlug;
  if (existing) {
    await db
      .update(articlePrimary)
      .set({ primarySlug, confidence: 80, source: "rule" })
      .where(eq(articlePrimary.articleId, articleId));
  } else {
    await db.insert(articlePrimary).values({
      articleId,
      primarySlug,
      confidence: 80,
      source: "rule",
    });
  }
  return primarySlug;
}

export async function classifyAllArticles(): Promise<number> {
  const db = await getDb();
  const rows = await db.select().from(articles);
  const existing = await db.select().from(articlePrimary);
  const have = new Set(existing.map((row) => row.articleId));
  const missing = rows.filter((row) => !have.has(row.id));
  if (!missing.length) return 0;
  const cats = await db.select().from(articleCategories);
  const interests = await db.select().from(articleInterests);
  const catsBy = new Map<number, string[]>();
  const interestsBy = new Map<number, string[]>();
  for (const row of cats) {
    const list = catsBy.get(row.articleId) ?? [];
    list.push(row.category);
    catsBy.set(row.articleId, list);
  }
  for (const row of interests) {
    const list = interestsBy.get(row.articleId) ?? [];
    list.push(row.interest);
    interestsBy.set(row.articleId, list);
  }
  let count = 0;
  for (const row of missing) {
    await upsertArticlePrimary(row.id, {
      title: row.title,
      excerpt: row.excerpt,
      publication: row.publication,
      categories: catsBy.get(row.id) ?? [],
      interests: interestsBy.get(row.id) ?? [],
    });
    count += 1;
  }
  return count;
}

export async function loadArticlePrimaries(ids: number[]): Promise<Map<number, ContentPrimary>> {
  const map = new Map<number, ContentPrimary>();
  if (!ids.length) return map;
  const db = await getDb();
  const rows = await db.select().from(articlePrimary);
  const wanted = new Set(ids);
  for (const row of rows) {
    if (!wanted.has(row.articleId)) continue;
    map.set(row.articleId, row.primarySlug as ContentPrimary);
  }
  return map;
}

export async function countArticlesByPrimary(): Promise<Record<string, number>> {
  const counts: Record<string, number> = Object.fromEntries(MAGAZINE_NAV.map((item) => [item.slug, 0]));
  const db = await getDb();
  const rows = await db.select().from(articlePrimary);
  for (const row of rows) {
    counts[row.primarySlug] = (counts[row.primarySlug] ?? 0) + 1;
  }
  return counts;
}
