import { UNDERGROUND_SOURCE_IDS } from "../config/wave1-sources";
import { getDb } from "../lib/db";
import { ingestEnabledSources } from "../lib/engine/pipeline";

async function main() {
  await getDb();
  console.log("Underground Priority RSS:", UNDERGROUND_SOURCE_IDS.join(", "));
  const results = await ingestEnabledSources([...UNDERGROUND_SOURCE_IDS]);
  console.log(JSON.stringify(results, null, 2));
  console.log("UNDERGROUND_INGEST_DONE");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
