import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { articleEntities, articleGeography, articleRelated, articles } from "@/lib/db/schema";

const MAX_RELATED = 5;

type RelatedHit = { relatedArticleId: number; reason: string; score: number };

function pushHit(map: Map<number, RelatedHit[]>, articleId: number, hit: RelatedHit) {
  if (articleId === hit.relatedArticleId) return;
  const list = map.get(articleId) ?? [];
  const existing = list.find(
    (row) => row.relatedArticleId === hit.relatedArticleId && row.reason === hit.reason,
  );
  if (existing) {
    existing.score = Math.max(existing.score, hit.score);
  } else {
    list.push(hit);
  }
  map.set(articleId, list);
}

/** Pair stories that share an about/relevant vehicle or the same event/circuit. Idempotent. */
export async function rebuildRelatedStories(): Promise<number> {
  const db = await getDb();
  const [entityRows, geoRows, articleRows] = await Promise.all([
    db.select().from(articleEntities),
    db.select().from(articleGeography),
    db.select({ id: articles.id }).from(articles),
  ]);
  const known = new Set(articleRows.map((row) => row.id));
  const byVehicle = new Map<string, number[]>();
  for (const row of entityRows) {
    if (row.kind !== "model" && row.kind !== "generation") continue;
    const relevance = row.relevance ?? "mentioned";
    if (relevance !== "about" && relevance !== "relevant") continue;
    if (!known.has(row.articleId)) continue;
    const key = `${(row.make ?? "").toLowerCase()}::${(row.model ?? row.name).toLowerCase()}::${
      row.kind === "generation" ? row.name.toLowerCase() : ""
    }`;
    const list = byVehicle.get(key) ?? [];
    if (!list.includes(row.articleId)) list.push(row.articleId);
    byVehicle.set(key, list);
  }

  const byPlace = new Map<string, number[]>();
  for (const row of geoRows) {
    if (row.kind !== "event" && row.kind !== "circuit") continue;
    if (!known.has(row.articleId)) continue;
    const key = `${row.kind}::${row.slug}`;
    const list = byPlace.get(key) ?? [];
    if (!list.includes(row.articleId)) list.push(row.articleId);
    byPlace.set(key, list);
  }

  const related = new Map<number, RelatedHit[]>();
  for (const [key, ids] of byVehicle) {
    const generation = key.split("::")[2];
    const score = generation ? 90 : 80;
    const reason = generation ? "same-generation" : "same-vehicle";
    for (const left of ids) {
      for (const right of ids) {
        pushHit(related, left, { relatedArticleId: right, reason, score });
      }
    }
  }
  for (const ids of byPlace.values()) {
    for (const left of ids) {
      for (const right of ids) {
        pushHit(related, left, { relatedArticleId: right, reason: "same-event", score: 70 });
      }
    }
  }

  await db.delete(articleRelated);
  let count = 0;
  for (const [articleId, hits] of related) {
    hits.sort((a, b) => b.score - a.score || a.relatedArticleId - b.relatedArticleId);
    const seen = new Set<number>();
    const top: RelatedHit[] = [];
    for (const hit of hits) {
      if (seen.has(hit.relatedArticleId)) continue;
      seen.add(hit.relatedArticleId);
      top.push(hit);
      if (top.length >= MAX_RELATED) break;
    }
    for (const hit of top) {
      await db.insert(articleRelated).values({
        articleId,
        relatedArticleId: hit.relatedArticleId,
        reason: hit.reason,
        score: hit.score,
      });
      count += 1;
    }
  }
  return count;
}

export async function relatedForArticle(articleId: number) {
  const db = await getDb();
  const rows = await db.select().from(articleRelated).where(eq(articleRelated.articleId, articleId));
  if (!rows.length) return [];
  const ids = rows.map((row) => row.relatedArticleId);
  const stories =
    ids.length <= 8
      ? await db
          .select({ id: articles.id, title: articles.title, publication: articles.publication })
          .from(articles)
          .where(inArray(articles.id, ids))
      : await db.select({ id: articles.id, title: articles.title, publication: articles.publication }).from(articles);
  const byId = new Map(stories.map((row) => [row.id, row]));
  return rows
    .sort((a, b) => b.score - a.score)
    .flatMap((row) => {
      const story = byId.get(row.relatedArticleId);
      if (!story) return [];
      return [{ ...story, reason: row.reason, score: row.score }];
    });
}

