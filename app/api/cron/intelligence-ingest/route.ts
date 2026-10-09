import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/engine/cron-auth";
import { ingestIntelligenceSources } from "@/lib/intelligence/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await ingestIntelligenceSources());
}

export async function POST(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await ingestIntelligenceSources());
}
