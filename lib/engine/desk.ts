import { eq, like } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { articles, deskPicks } from "@/lib/db/schema";
import * as schema from "@/lib/db/schema";
import {
  DESK_CURATOR,
  deskNote,
  isDeskLabelSlug,
} from "./desk-labels";

export {
  DESK_CURATOR,
  DESK_LABELS,
  deskLabelName,
  deskNote,
  isDeskLabelSlug,
  isDeskPickLive,
  liveDeskByArticle,
  selectHomepagePicks,
  toDeskPublic,
  type DeskLabelName,
  type DeskLabelSlug,
  type DeskPublic,
} from "./desk-labels";

const DESK_SEED = [
  {
    titleIncludes: "Hand-Painting a 1956 Ferrari 500 TR",
    label: "from-the-desk" as const,
    featured: true,
    note: "A 1956 500 TR, painted by hand. This is the one we'd stay late for.",
    category: "cars",
  },
  {
    titleIncludes: "Christine Laure",
    label: "one-for-the-garage" as const,
    featured: false,
    note: "Tour de France 911 RSR. One for the garage, if the garage were a museum.",
    category: "cars",
  },
  {
    titleIncludes: "Go Japan",
    label: "worth-a-look" as const,
    featured: false,
    note: "Smoke, Hondas, and a Brands Hatch Monday. We'd skip a Ferrari meet for this.",
    category: "culture",
  },
];

type Db = LibSQLDatabase<typeof schema>;

/** Example Desk picks on real stored teasers. Does not invent notes for anything else. */
export async function seedDeskPicksIfEmpty(db: Db) {
  const existing = await db.select({ id: deskPicks.id }).from(deskPicks).limit(1);
  if (existing.length) return;
  const now = Date.now();
  for (const seed of DESK_SEED) {
    const article = (
      await db
        .select({ id: articles.id, title: articles.title })
        .from(articles)
        .where(like(articles.title, `%${seed.titleIncludes}%`))
        .limit(1)
    )[0];
    if (!article) continue;
    await db.insert(deskPicks).values({
      articleId: article.id,
      note: seed.note,
      curator: DESK_CURATOR,
      selectedAt: now,
      expiresAt: null,
      featured: seed.featured,
      category: seed.category,
      label: seed.label,
      active: true,
    });
  }
}

export async function upsertDeskPick(
  db: Db,
  input: {
    articleId: number;
    note?: string | null;
    label?: string;
    featured?: boolean;
    active?: boolean;
    expiresAt?: number | null;
    category?: string | null;
    curator?: string;
  },
) {
  const article = (
    await db.select({ id: articles.id }).from(articles).where(eq(articles.id, input.articleId)).limit(1)
  )[0];
  if (!article) return { error: "Article not found" as const };
  const label = input.label && isDeskLabelSlug(input.label) ? input.label : "from-the-desk";
  const now = Date.now();
  const existing = (
    await db.select().from(deskPicks).where(eq(deskPicks.articleId, input.articleId)).limit(1)
  )[0];
  const values = {
    articleId: input.articleId,
    note: deskNote(input.note),
    curator: input.curator?.trim() || DESK_CURATOR,
    selectedAt: existing?.selectedAt ?? now,
    expiresAt: input.expiresAt === undefined ? (existing?.expiresAt ?? null) : input.expiresAt,
    featured: input.featured ?? existing?.featured ?? false,
    category: input.category === undefined ? (existing?.category ?? null) : input.category,
    label,
    active: input.active ?? true,
  };
  if (existing) {
    const updated = (
      await db.update(deskPicks).set(values).where(eq(deskPicks.id, existing.id)).returning()
    )[0];
    return { pick: updated };
  }
  const created = (await db.insert(deskPicks).values(values).returning())[0];
  return { pick: created };
}
