import { eq } from "drizzle-orm";
import { getDb } from "../lib/db";
import { ingestionRuns, mediaSources } from "../lib/db/schema";
import { purgeArticlesBySourceId } from "../lib/engine/pipeline";
import { DEMO_YOUTUBE_SOURCE_ID } from "../lib/engine/youtube-sources";

async function main() {
  if (process.env.YOUTUBE_ALLOW_REMOTE !== "1") {
    throw new Error("Set YOUTUBE_ALLOW_REMOTE=1 to purge a YouTube source.");
  }
  const ids = process.argv.slice(2);
  const target = ids.length ? ids : [DEMO_YOUTUBE_SOURCE_ID];
  const db = await getDb();
  for (const sourceId of target) {
    const removed = await purgeArticlesBySourceId(sourceId);
    await db.delete(ingestionRuns).where(eq(ingestionRuns.sourceId, sourceId));
    await db.delete(mediaSources).where(eq(mediaSources.id, sourceId));
    console.log(JSON.stringify({ sourceId, removed: removed.removed, ids: removed.ids }, null, 2));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
