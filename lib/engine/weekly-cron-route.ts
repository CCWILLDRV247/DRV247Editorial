import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/engine/cron-auth";
import { ingestWeeklyCronBatch } from "@/lib/engine/weekly-ingest";

export async function handleWeeklyIngestCron(request: Request, slot: number) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await ingestWeeklyCronBatch({ slot }));
}
