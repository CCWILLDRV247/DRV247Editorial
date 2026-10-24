import { NextResponse } from "next/server";
import { insertEngagementEvent, insertImpressionBatch, visitorIsRateLimited } from "@/lib/engagement/aggregates";
import { IMPRESSION_EVENT } from "@/lib/engagement/impressions";
import {
  createVisitorKey,
  parseEngagementWritePayload,
  visitorCookieOptions,
  visitorKeyFromCookieHeader,
  VISITOR_COOKIE,
} from "@/lib/engagement/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function resolveVisitorKey(request: Request): string {
  return visitorKeyFromCookieHeader(request.headers.get("cookie")) ?? createVisitorKey();
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = parseEngagementWritePayload(body);
  if ("error" in parsed) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  const visitorKey = resolveVisitorKey(request);

  try {
    if (parsed.event === IMPRESSION_EVENT) {
      await insertImpressionBatch({
        articleIds: parsed.articleIds ?? (parsed.articleId ? [parsed.articleId] : []),
        visitorKey,
        surface: parsed.surface ?? "home",
        cohort: parsed.cohort,
      });
    } else {
      if (await visitorIsRateLimited(visitorKey)) {
        return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
      }
      await insertEngagementEvent({
        event: parsed.event,
        articleId: parsed.articleId,
        visitorKey,
        cohort: parsed.cohort,
        detail: parsed.detail,
        surface: parsed.surface,
      });
    }
  } catch {
    return NextResponse.json({ ok: false, error: "unavailable" }, { status: 503 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(VISITOR_COOKIE, visitorKey, visitorCookieOptions());
  return response;
}
