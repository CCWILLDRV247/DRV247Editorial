import { handleWeeklyIngestCron } from "@/lib/engine/weekly-cron-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export function GET(request: Request) {
  return handleWeeklyIngestCron(request, 4);
}

export function POST(request: Request) {
  return handleWeeklyIngestCron(request, 4);
}
