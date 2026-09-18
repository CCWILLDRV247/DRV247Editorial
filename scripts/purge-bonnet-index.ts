import { eq } from "drizzle-orm";
import { getDb } from "../lib/db";
import { articles, mediaSources } from "../lib/db/schema";
import { isNonEditorialUrl } from "../lib/engine/non-editorial";
import { deleteArticleById } from "../lib/engine/pipeline";

const BONNET_INDEX = "https://bonnetmagazine.com/pages/articles";

function matchesBonnetIndex(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    const path = parsed.pathname.replace(/\/+$/, "") || "/";
    return host === "bonnetmagazine.com" && path === "/pages/articles";
  } catch {
    return false;
  }
}

async function main() {
  const db = await getDb();
  const rows = await db.select().from(articles);
  const matching = rows.filter(
    (row) => matchesBonnetIndex(row.canonicalUrl) || matchesBonnetIndex(row.url),
  );
  const removed: {
    id: number;
    publication: string;
    title: string;
    url: string;
    canonicalUrl: string;
  }[] = [];
  for (const row of matching) {
    await deleteArticleById(row.id);
    removed.push({
      id: row.id,
      publication: row.publication,
      title: row.title,
      url: row.url,
      canonicalUrl: row.canonicalUrl,
    });
  }
  const leftover = (await db.select().from(articles)).filter(
    (row) => matchesBonnetIndex(row.canonicalUrl) || matchesBonnetIndex(row.url),
  );
  const bonnet = (
    await db.select().from(mediaSources).where(eq(mediaSources.id, "auto_001")).limit(1)
  )[0];
  const remainingBonnet = (await db.select().from(articles)).filter((row) => row.sourceId === "auto_001");
  console.log(
    JSON.stringify(
      {
        skip: {
          exactPath: "/pages/articles",
          example: BONNET_INDEX,
          wouldSkipNow: isNonEditorialUrl(BONNET_INDEX, "https://bonnetmagazine.com"),
        },
        removed: removed.length,
        rows: removed,
        leftover: leftover.length,
        leftoverIds: leftover.map((row) => row.id),
        bonnetEnabled: bonnet?.enabled ?? null,
        bonnetPublication: bonnet?.publication ?? null,
        remainingBonnetStories: remainingBonnet.map((row) => ({
          id: row.id,
          title: row.title.slice(0, 80),
          url: row.canonicalUrl,
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
