import { UNDERGROUND_SOURCE_IDS } from "../config/wave1-sources";
import { getDb } from "../lib/db";
import { ingestEnabledSources } from "../lib/engine/pipeline";

async function main() {
  await getDb();
  console.log("Underground Priority RSS:", UNDERGROUND_SOURCE_IDS.join(", "));
  console.log(JSON.stringify(await ingestEnabledSources([...UNDERGROUND_SOURCE_IDS]), null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
