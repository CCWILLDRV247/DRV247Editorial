import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { ingestEnabledSources } from "@/lib/engine/pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  await requireAdmin();
  getDb();
  const body = (await request.json().catch(() => null)) as
    | { sourceId?: string; sourceIds?: string[] }
    | null;
  const ids = body?.sourceIds ?? (body?.sourceId ? [body.sourceId] : undefined);
  const results = await ingestEnabledSources(ids);
  return NextResponse.json({ results });
}
