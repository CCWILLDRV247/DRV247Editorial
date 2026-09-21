import { eq, inArray } from "drizzle-orm";
import { getDb } from "../lib/db";
import { articles, mediaSources } from "../lib/db/schema";
import { isNonEditorialUrl } from "../lib/engine/non-editorial";
import { deleteArticleById } from "../lib/engine/pipeline";

const TARGETS = [
  {
    name: "bonnet-articles-index",
    host: "bonnetmagazine.com",
    path: "/pages/articles",
    example: "https://bonnetmagazine.com/pages/articles",
    sourceId: "auto_001",
    sourceUrl: "https://bonnetmagazine.com",
  },
  {
    name: "bonnet-about-us",
    host: "bonnetmagazine.com",
    path: "/pages/about-us",
    example: "https://bonnetmagazine.com/pages/about-us",
    sourceId: "auto_001",
    sourceUrl: "https://bonnetmagazine.com",
  },
  {
    name: "dyler-sell-car",
    host: "dyler.com",
    path: "/sell-car",
    example: "https://dyler.com/sell-car",
    sourceId: "auto_017",
    sourceUrl: "https://dyler.com",
  },
] as const;

function matchesTarget(
  url: string | null | undefined,
  target: (typeof TARGETS)[number],
): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    const path = parsed.pathname.replace(/\/+$/, "") || "/";
    return host === target.host && path === target.path;
  } catch {
    return false;
  }
}

async function main() {
  const db = await getDb();
  const rows = await db.select().from(articles);
  const matching = rows.filter((row) =>
    TARGETS.some((target) => matchesTarget(row.canonicalUrl, target) || matchesTarget(row.url, target)),
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
  const leftover = (await db.select().from(articles)).filter((row) =>
    TARGETS.some((target) => matchesTarget(row.canonicalUrl, target) || matchesTarget(row.url, target)),
  );
  const sources = await db
    .select()
    .from(mediaSources)
    .where(
      inArray(
        mediaSources.id,
        TARGETS.map((target) => target.sourceId),
      ),
    );
  const remaining = await db.select().from(articles);
  console.log(
    JSON.stringify(
      {
        skip: TARGETS.map((target) => ({
          name: target.name,
          exactPath: target.path,
          example: target.example,
          wouldSkipNow: isNonEditorialUrl(target.example, target.sourceUrl),
        })),
        removed: removed.length,
        rows: removed,
        leftover: leftover.length,
        leftoverIds: leftover.map((row) => row.id),
        sources: sources.map((source) => ({
          id: source.id,
          publication: source.publication,
          enabled: source.enabled,
          remainingStories: remaining.filter((row) => row.sourceId === source.id).length,
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
