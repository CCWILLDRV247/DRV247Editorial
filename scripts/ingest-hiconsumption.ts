import { eq } from "drizzle-orm";
import {
  HICONSUMPTION_MOTORS_FEED_URL,
  HICONSUMPTION_MOTORS_SOURCE_ID,
} from "../config/teaser-feeds";
import { getDb } from "../lib/db";
import { articlePrimary, articles, mediaSources } from "../lib/db/schema";
import { ingestMediaSource } from "../lib/engine/pipeline";

async function main() {
  const db = await getDb();
  const source = (
    await db
      .select()
      .from(mediaSources)
      .where(eq(mediaSources.id, HICONSUMPTION_MOTORS_SOURCE_ID))
      .limit(1)
  )[0];
  if (!source) throw new Error("HiConsumption Motors source was not seeded");

  console.log("HiConsumption Motors ingest:", source.id);
  console.log("Feed:", HICONSUMPTION_MOTORS_FEED_URL);
  const result = await ingestMediaSource(source);
  const rows = await db
    .select({
      id: articles.id,
      title: articles.title,
      url: articles.canonicalUrl,
      excerpt: articles.excerpt,
      summary: articles.aiSummary,
      imageUrl: articles.imageUrl,
      method: articles.ingestionMethod,
      primary: articlePrimary.primarySlug,
    })
    .from(articles)
    .leftJoin(articlePrimary, eq(articlePrimary.articleId, articles.id))
    .where(eq(articles.sourceId, HICONSUMPTION_MOTORS_SOURCE_ID));

  console.log(
    JSON.stringify(
      {
        result,
        landed: rows.length,
        stories: rows.map((row) => ({
          id: row.id,
          title: row.title,
          url: row.url,
          excerpt: row.excerpt,
          summary: row.summary,
          imageUrl: row.imageUrl,
          method: row.method,
          primary: row.primary,
        })),
      },
      null,
      2,
    ),
  );
  console.log("HICONSUMPTION_INGEST_DONE");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
