import { NextResponse } from "next/server";
import { ingestIntelligenceSources } from "@/lib/intelligence/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (secret && auth === `Bearer ${secret}`) return true;
  if (!secret && process.env.NODE_ENV !== "production") return true;
  return false;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as { sourceIds?: string[] };
  return NextResponse.json(await ingestIntelligenceSources({ sourceIds: body.sourceIds }));
}
