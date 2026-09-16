import { DISABLED_SOURCE_SET, WAVE2_SOURCE_IDS } from "../config/wave1-sources";
import { getDb } from "../lib/db";
import { ingestEnabledSources } from "../lib/engine/pipeline";

const rssFirst = ["auto_004", "auto_009", "auto_047", "auto_049", "auto_051"];
const rest = WAVE2_SOURCE_IDS.filter((id) => !rssFirst.includes(id) && !DISABLED_SOURCE_SET.has(id));

async function main() {
  await getDb();
  console.log("Wave 2 RSS first:", rssFirst.join(", "));
  console.log(JSON.stringify(await ingestEnabledSources(rssFirst), null, 2));
  console.log("Wave 2 sitemap/scrape:", rest.join(", "));
  console.log(JSON.stringify(await ingestEnabledSources([...rest]), null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
