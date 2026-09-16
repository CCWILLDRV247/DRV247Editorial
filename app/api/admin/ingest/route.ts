import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { adminIngestMode } from "@/lib/engine/admin-ingest";
import { ingestEnabledSources } from "@/lib/engine/pipeline";
import { ingestAll, ingestSource } from "@/lib/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  await requireAdmin();
  await getDb();
  const body = (await request.json().catch(() => null)) as
    | { sourceId?: number; pipeline?: string }
    | null;
  if (adminIngestMode(body) === "v1") {
    const results = typeof body?.sourceId === "number"
      ? [await ingestSource(body.sourceId)]
      : await ingestAll();
    return NextResponse.json({ pipeline: "v1", results });
  }
  const results = await ingestEnabledSources();
  return NextResponse.json({
    pipeline: "culture",
    results: results.map((result) => ({
      sourceName: result.publication,
      publication: result.publication,
      inserted: result.inserted,
      fetched: result.fetched,
      summarized: result.summarized,
      error: result.error,
      method: result.method,
      usedMock: false,
    })),
  });
}
