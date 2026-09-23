import { getDb } from "../lib/db";
import { articles } from "../lib/db/schema";
import { isUsableArticleImage } from "../lib/text";
import { validateImageUrl } from "../lib/engine/images";

async function main() {
  const db = await getDb();
  const rows = await db.select().from(articles);
  const samples = rows.filter((row) => isUsableArticleImage(row.imageUrl)).slice(0, 5);
  const results = [];
  for (const row of samples) {
    const check = await validateImageUrl(row.imageUrl!);
    results.push({
      id: row.id,
      publication: row.publication,
      ok: check.ok,
      status: check.status,
      contentType: check.contentType,
      reason: check.reason,
    });
  }
  const broken = await validateImageUrl("https://example.invalid/missing.jpg");
  const html = await validateImageUrl("https://example.com/");
  console.log(
    JSON.stringify(
      {
        live: results,
        missingHost: { ok: broken.ok, status: broken.status, reason: broken.reason },
        htmlPage: { ok: html.ok, status: html.status, contentType: html.contentType, reason: html.reason },
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
