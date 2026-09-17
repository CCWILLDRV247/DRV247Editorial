import { WAVE3_SOURCE_IDS } from "../config/wave1-sources";
import { getDb } from "../lib/db";
import { ingestEnabledSources } from "../lib/engine/pipeline";

const rssFirst = [
  "auto_019",
  "auto_021",
  "auto_022",
  "auto_023",
  "auto_024",
  "auto_025",
  "auto_026",
  "auto_027",
];
const rest = WAVE3_SOURCE_IDS.filter((id) => !rssFirst.includes(id));

async function main() {
  await getDb();
  console.log("Wave 3 RSS first:", rssFirst.join(", "));
  console.log(JSON.stringify(await ingestEnabledSources(rssFirst), null, 2));
  console.log("Wave 3 sitemap/scrape:", rest.join(", "));
  console.log(JSON.stringify(await ingestEnabledSources([...rest]), null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
