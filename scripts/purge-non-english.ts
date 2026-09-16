import { getDb } from "../lib/db";
import { purgeNonEnglishArticles } from "../lib/engine/pipeline";
import { mediaSources } from "../lib/db/schema";

async function main() {
  const db = await getDb();
  const result = await purgeNonEnglishArticles();
  const sources = await db.select().from(mediaSources);
  const enabled = sources.filter((source) => source.enabled).map((source) => source.id);
  const disabled = sources
    .filter((source) => !source.enabled && ["auto_012", "auto_048"].includes(source.id))
    .map((source) => `${source.id} ${source.publication}`);
  console.log(JSON.stringify({ ...result, enabledCount: enabled.length, disabledWave2: disabled }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
