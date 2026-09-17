import { getDb } from "../lib/db";
import { articles } from "../lib/db/schema";
import { extractMissingImages } from "../lib/engine/pipeline";

async function main() {
  const ids = process.argv
    .slice(2)
    .join(",")
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value > 0);
  const stats = await extractMissingImages(ids.length ? { ids } : { limit: 4 });
  const db = await getDb();
  const rows = await db.select().from(articles);
  const filled = rows.filter((row) => ids.includes(row.id) && row.imageUrl?.trim());
  console.log(
    JSON.stringify(
      {
        stats,
        proof: filled.map((row) => ({
          id: row.id,
          publication: row.publication,
          title: row.title.slice(0, 80),
          imageUrl: row.imageUrl,
        })),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
