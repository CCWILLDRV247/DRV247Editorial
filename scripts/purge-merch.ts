import { getDb } from "../lib/db";
import { purgeMerchArticles } from "../lib/engine/pipeline";
import { mediaSources } from "../lib/db/schema";
import { SHOP_DISABLED_SOURCE_IDS } from "../config/merch";

async function main() {
  const db = await getDb();
  const result = await purgeMerchArticles();
  const sources = await db.select().from(mediaSources);
  const disabledShop = sources
    .filter((source) => SHOP_DISABLED_SOURCE_IDS.includes(source.id))
    .map((source) => ({
      id: source.id,
      publication: source.publication,
      enabled: source.enabled,
    }));
  console.log(JSON.stringify({ ...result, disabledShop }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
