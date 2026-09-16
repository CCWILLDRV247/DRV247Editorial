import { count, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { ENABLED_SOURCE_IDS } from "@/config/wave1-sources";
import { getDb } from "@/lib/db";
import { articles, mediaSources } from "@/lib/db/schema";
import { ENGINE_BRANCH, ENGINE_WAVE, engineCommit } from "@/lib/engine/version";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const db = await getDb();
  const enabled = (await db.select().from(mediaSources)).filter((source) => source.enabled);
  const sources = [];
  for (const id of ENABLED_SOURCE_IDS) {
    const source = enabled.find((row) => row.id === id);
    const [{ value }] = await db
      .select({ value: count() })
      .from(articles)
      .where(eq(articles.sourceId, id));
    sources.push({
      id,
      publication: source?.publication ?? null,
      enabled: Boolean(source?.enabled),
      lastMethod: source?.lastMethod ?? null,
      lastError: source?.lastError ?? null,
      articleCount: value,
    });
  }
  return NextResponse.json(
    {
      engine: ENGINE_WAVE,
      branch: ENGINE_BRANCH,
      commit: engineCommit(),
      enabledCount: enabled.length,
      publications: sources.filter((row) => row.articleCount > 0).map((row) => row.publication),
      sources,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
