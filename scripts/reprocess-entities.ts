import { getDb } from "../lib/db";
import { articles, articleEntities } from "../lib/db/schema";
import { reprocessArticles } from "../lib/engine/pipeline";

function summarize(
  rows: { id: number }[],
  ents: { articleId: number; kind: string; name: string }[],
) {
  const by = new Map<number, { makes: Set<string>; models: Set<string> }>();
  for (const entity of ents) {
    const cur = by.get(entity.articleId) ?? { makes: new Set<string>(), models: new Set<string>() };
    if (entity.kind === "make") cur.makes.add(entity.name);
    if (entity.kind === "model") cur.models.add(entity.name);
    by.set(entity.articleId, cur);
  }
  let make = 0;
  let model = 0;
  let porsche = 0;
  let porsche911 = 0;
  for (const row of rows) {
    const extra = by.get(row.id);
    if (extra?.makes.size) make += 1;
    if (extra?.models.size) model += 1;
    if (extra?.makes.has("Porsche")) porsche += 1;
    if (extra?.makes.has("Porsche") && extra.models.has("911")) porsche911 += 1;
  }
  return { n: rows.length, make, model, porsche, porsche911 };
}

async function main() {
  const db = await getDb();
  const before = summarize(await db.select().from(articles), await db.select().from(articleEntities));
  const reprocessed = await reprocessArticles();
  const after = summarize(await db.select().from(articles), await db.select().from(articleEntities));
  console.log(JSON.stringify({ before, reprocessed, after }));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
