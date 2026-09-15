import { WAVE1_SOURCE_IDS } from "../config/wave1-sources";
import { getDb } from "../lib/db";
import { ingestEnabledSources } from "../lib/engine/pipeline";

const first = ["auto_006", "auto_015", "auto_016"];
const rest = WAVE1_SOURCE_IDS.filter((id) => !first.includes(id));

async function main() {
  getDb();
  console.log("Proving RSS trio first:", first.join(", "));
  console.log(JSON.stringify(await ingestEnabledSources(first), null, 2));
  console.log("Remaining wave 1:", rest.join(", "));
  console.log(JSON.stringify(await ingestEnabledSources([...rest]), null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
