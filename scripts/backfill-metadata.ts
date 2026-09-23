import { getDb } from "../lib/db";
import { articles } from "../lib/db/schema";
import { backfillArticleMetadata } from "../lib/engine/pipeline";

async function main() {
  await getDb();
  const total = (await (await getDb()).select({ id: articles.id }).from(articles)).length;
  const result = await backfillArticleMetadata();
  console.log(JSON.stringify({ total, ...result }));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
