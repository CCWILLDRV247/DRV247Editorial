/**
 * One-off: normalize article_interests rows to DRV247_USER_INTERESTS labels.
 * Safe to re-run — merges duplicate aliases per article.
 *
 * Usage: npx tsx scripts/normalize-article-interests.ts
 */
import { eq } from "drizzle-orm";
import { getDb } from "../lib/db";
import { articleInterests } from "../lib/db/schema";
import { canonicalInterest, isKnownInterest, normalizeInterestList } from "../lib/engine/interest-taxonomy";

async function main() {
  const db = await getDb();
  const rows = await db.select().from(articleInterests);
  const byArticle = new Map<number, string[]>();
  for (const row of rows) {
    const list = byArticle.get(row.articleId) ?? [];
    list.push(row.interest);
    byArticle.set(row.articleId, list);
  }
  let articlesUpdated = 0;
  for (const [articleId, interests] of byArticle) {
    const normalized = normalizeInterestList(interests);
    const legacy = [...new Set(interests)];
    const normalizedSet = new Set(normalized.map((item) => item.toLowerCase()));
    const unchanged =
      legacy.length === normalized.length &&
      legacy.every((item) => normalizedSet.has(canonicalInterest(item).toLowerCase()));
    if (unchanged && legacy.every((item) => isKnownInterest(item))) continue;
    await db.delete(articleInterests).where(eq(articleInterests.articleId, articleId));
    if (normalized.length) {
      await db.insert(articleInterests).values(
        normalized.map((interest) => ({ articleId, interest })),
      );
    }
    articlesUpdated += 1;
  }
  console.log(
    `article_interests: ${articlesUpdated} articles rewritten, ${rows.length} legacy rows scanned`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
