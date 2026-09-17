import { WAVE4_SOURCE_IDS } from "../config/wave1-sources";
import { getDb } from "../lib/db";
import { ingestEnabledSources } from "../lib/engine/pipeline";

const rssFirst = [
  "auto_031",
  "auto_032",
  "auto_033",
  "auto_034",
  "auto_035",
  "auto_037",
  "auto_038",
];
const rest = WAVE4_SOURCE_IDS.filter((id) => !rssFirst.includes(id));

async function main() {
  await getDb();
  console.log("Wave 4 RSS first:", rssFirst.join(", "));
  console.log(JSON.stringify(await ingestEnabledSources(rssFirst), null, 2));
  console.log("Wave 4 sitemap/scrape:", rest.join(", "));
  console.log(JSON.stringify(await ingestEnabledSources([...rest]), null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
