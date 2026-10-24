import { NextResponse } from "next/server";
import { insertEngagementEvent, visitorIsRateLimited } from "@/lib/engagement/aggregates";
import {
  createVisitorKey,
  isVisitorKey,
  parseEngagementWritePayload,
  VISITOR_COOKIE,
} from "@/lib/engagement/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function visitorCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    secure: Boolean(process.env.VERCEL),
  };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = parseEngagementWritePayload(body);
  if ("error" in parsed) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  const incoming = request.headers.get("cookie") ?? "";
  const cookieMatch = incoming.match(new RegExp(`(?:^|;\\s*)${VISITOR_COOKIE}=([^;]+)`));
  let visitorKey = cookieMatch?.[1] ? decodeURIComponent(cookieMatch[1]) : "";
  if (!isVisitorKey(visitorKey)) visitorKey = createVisitorKey();

  try {
    if (await visitorIsRateLimited(visitorKey)) {
      return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
    }
    await insertEngagementEvent({
      event: parsed.event,
      articleId: parsed.articleId,
      visitorKey,
      cohort: parsed.cohort,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "unavailable" }, { status: 503 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(VISITOR_COOKIE, visitorKey, visitorCookieOptions());
  return response;
}
