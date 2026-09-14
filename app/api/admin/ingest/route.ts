import { NextResponse } from "next/server";
import { ingestAll, ingestSource } from "@/lib/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { sourceId?: number } | null;
  const results = body?.sourceId
    ? [await ingestSource(body.sourceId)]
    : await ingestAll();
  return NextResponse.json({ results });
}
