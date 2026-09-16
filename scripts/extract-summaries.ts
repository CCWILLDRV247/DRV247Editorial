import { getDb } from "../lib/db";
import { articles } from "../lib/db/schema";
import { extractMissingSummaries } from "../lib/engine/pipeline";

async function main() {
  const db = await getDb();
  const stats = await extractMissingSummaries();
  const rows = await db.select().from(articles);
  const filled = rows.filter((row) => row.aiSummary?.trim());
  const hidden = rows.filter((row) => !row.aiSummary?.trim());
  const samples = filled
    .filter((row) => row.id !== 28)
    .slice(0, 8)
    .map((row) => ({
      id: row.id,
      publication: row.publication,
      title: row.title.slice(0, 90),
    }));
  console.log(
    JSON.stringify(
      {
        missingPass: stats,
        total: rows.length,
        withSummary: filled.length,
        hidden: hidden.length,
        hiddenPublications: hidden.reduce<Record<string, number>>((acc, row) => {
          acc[row.publication] = (acc[row.publication] ?? 0) + 1;
          return acc;
        }, {}),
        samples,
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
