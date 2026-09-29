import { getDb } from "../lib/db";
import { ingestEnabledSources } from "../lib/engine/pipeline";

const TYPE7_SOURCE_ID = "auto_055";

async function main() {
  await getDb();
  console.log("Type 7 stories ingest:", TYPE7_SOURCE_ID);
  console.log("Feed: https://type7.com/blogs/stories.atom");
  const results = await ingestEnabledSources([TYPE7_SOURCE_ID]);
  console.log(JSON.stringify(results, null, 2));
  console.log("TYPE7_INGEST_DONE");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
