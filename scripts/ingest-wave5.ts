import { WAVE5_SOURCE_IDS } from "../config/wave1-sources";
import { getDb } from "../lib/db";
import { ingestEnabledSources } from "../lib/engine/pipeline";

const rssFirst = ["auto_039", "auto_044"];
const rest = WAVE5_SOURCE_IDS.filter((id) => !rssFirst.includes(id));

async function main() {
  await getDb();
  console.log("Wave 5 RSS first:", rssFirst.join(", "));
  console.log(JSON.stringify(await ingestEnabledSources(rssFirst), null, 2));
  console.log("Wave 5 sitemap/scrape:", rest.join(", "));
  console.log(JSON.stringify(await ingestEnabledSources([...rest]), null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
