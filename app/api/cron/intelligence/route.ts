import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/engine/cron-auth";
import { runIntelligenceRollup } from "@/lib/engagement/intelligence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function run(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json({ ok: true, ...(await runIntelligenceRollup()) });
  } catch {
    return NextResponse.json({ ok: false, error: "rollup_failed" }, { status: 503 });
  }
}

export function GET(request: Request) {
  return run(request);
}

export function POST(request: Request) {
  return run(request);
}
