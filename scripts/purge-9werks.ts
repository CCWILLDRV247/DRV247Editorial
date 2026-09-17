import { eq } from "drizzle-orm";
import { getDb } from "../lib/db";
import { mediaSources } from "../lib/db/schema";
import { purgeArticlesBySourceId } from "../lib/engine/pipeline";
import { DISABLED_SOURCE_SET, ENABLED_SOURCE_SET } from "../config/wave1-sources";

const SOURCE_ID = "auto_049";

async function main() {
  const db = await getDb();
  const removed = await purgeArticlesBySourceId(SOURCE_ID);
  await db.update(mediaSources).set({ enabled: false }).where(eq(mediaSources.id, SOURCE_ID));
  const source = (await db.select().from(mediaSources).where(eq(mediaSources.id, SOURCE_ID)).limit(1))[0];
  const leftover = await db.select().from(mediaSources);
  console.log(
    JSON.stringify(
      {
        removed: removed.removed,
        ids: removed.ids,
        source: source
          ? { id: source.id, publication: source.publication, enabled: source.enabled }
          : null,
        inDisabledSet: DISABLED_SOURCE_SET.has(SOURCE_ID),
        inEnabledSet: ENABLED_SOURCE_SET.has(SOURCE_ID),
        enabledCount: leftover.filter((row) => row.enabled).length,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
