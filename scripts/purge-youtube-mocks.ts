import fs from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";
import { eq, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import {
  articleCategories,
  articleContentTypes,
  articleEntities,
  articleGeography,
  articleImages,
  articleInterests,
  articleLocations,
  articleMotorsport,
  articlePrimary,
  articleRelated,
  articleScenes,
  articles,
  deskPicks,
  mediaSources,
} from "../lib/db/schema";
import { isMockYoutubeArticle, YOUTUBE_MOCK_MARKER } from "../lib/engine/youtube";

async function main() {
  if (process.env.TURSO_DATABASE_URL || process.env.LIBSQL_URL) {
    throw new Error("Refusing to purge mocks while Turso/libSQL is set. Unset TURSO_DATABASE_URL.");
  }

  const file = path.join(process.cwd(), "data", "drv247.sqlite");
  if (!fs.existsSync(file)) {
    throw new Error(`Local SQLite not found: ${file}`);
  }

  const db = drizzle(createClient({ url: `file:${file}` }));
  const rows = await db.select().from(articles);
  const removed: { id: number; title: string; canonicalUrl: string }[] = [];

  for (const row of rows) {
    if (!isMockYoutubeArticle(row)) continue;
    await db.delete(articleEntities).where(eq(articleEntities.articleId, row.id));
    await db.delete(articleCategories).where(eq(articleCategories.articleId, row.id));
    await db.delete(articleInterests).where(eq(articleInterests.articleId, row.id));
    await db.delete(articleLocations).where(eq(articleLocations.articleId, row.id));
    await db.delete(articleContentTypes).where(eq(articleContentTypes.articleId, row.id));
    await db.delete(articleScenes).where(eq(articleScenes.articleId, row.id));
    await db.delete(articleMotorsport).where(eq(articleMotorsport.articleId, row.id));
    await db.delete(articleGeography).where(eq(articleGeography.articleId, row.id));
    await db.delete(articleRelated).where(eq(articleRelated.articleId, row.id));
    await db.delete(articleRelated).where(eq(articleRelated.relatedArticleId, row.id));
    await db.delete(articleImages).where(eq(articleImages.articleId, row.id));
    await db.delete(articlePrimary).where(eq(articlePrimary.articleId, row.id));
    await db.delete(deskPicks).where(eq(deskPicks.articleId, row.id));
    await db.delete(articles).where(eq(articles.id, row.id));
    removed.push({ id: row.id, title: row.title, canonicalUrl: row.canonicalUrl });
  }

  const youtubeSources = await db.select().from(mediaSources).where(like(mediaSources.id, "yt_%"));
  for (const source of youtubeSources) {
    if (!source.lastError?.includes("mock") && !source.lastError?.includes(YOUTUBE_MOCK_MARKER)) {
      continue;
    }
    await db.update(mediaSources).set({ lastError: null }).where(eq(mediaSources.id, source.id));
  }

  const remainingSources = await db.select().from(mediaSources).where(like(mediaSources.id, "yt_%"));
  const remainingVideos = (await db.select().from(articles)).filter(
    (row) => row.ingestionMethod === "youtube" || row.canonicalUrl.includes("youtube.com/watch"),
  );

  console.log(
    JSON.stringify(
      {
        database: file,
        removed: removed.length,
        rows: removed,
        remainingChannels: remainingSources.map((source) => ({
          id: source.id,
          publication: source.publication,
          channelId: source.channelId,
        })),
        remainingVideos: remainingVideos.map((row) => ({
          id: row.id,
          publication: row.publication,
          title: row.title,
          canonicalUrl: row.canonicalUrl,
        })),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
