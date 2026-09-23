import { getDb } from "../lib/db";
import { articles, mediaSources } from "../lib/db/schema";
import { isUsableArticleImage } from "../lib/text";

async function main() {
  const db = await getDb();
  const rows = await db.select().from(articles);
  const sources = await db.select().from(mediaSources);
  const byPub = new Map<
    string,
    {
      publication: string;
      sourceId: string;
      missing: number;
      total: number;
      samples: { id: number; title: string; url: string; imageUrl: string | null }[];
    }
  >();
  let missing = 0;
  const ids: number[] = [];
  for (const row of rows) {
    const bucket = byPub.get(row.publication) ?? {
      publication: row.publication,
      sourceId: row.sourceId,
      missing: 0,
      total: 0,
      samples: [],
    };
    bucket.total += 1;
    if (!isUsableArticleImage(row.imageUrl)) {
      missing += 1;
      ids.push(row.id);
      bucket.missing += 1;
      if (bucket.samples.length < 3) {
        bucket.samples.push({
          id: row.id,
          title: row.title.slice(0, 72),
          url: row.canonicalUrl,
          imageUrl: row.imageUrl,
        });
      }
    }
    byPub.set(row.publication, bucket);
  }
  console.log(
    JSON.stringify(
      {
        total: rows.length,
        missing,
        usable: rows.length - missing,
        ids,
        enabledSources: sources.filter((source) => source.enabled).length,
        dark: sources.filter((source) => !source.enabled).map((source) => `${source.id} ${source.publication}`),
        byPublication: [...byPub.values()]
          .filter((row) => row.missing > 0)
          .sort((left, right) => right.missing - left.missing),
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
