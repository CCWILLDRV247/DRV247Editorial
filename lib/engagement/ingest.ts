import { ENGAGEMENT_EVENTS, type ExperienceFeedbackEventData } from "./events";
import {
  IMPRESSION_EVENT,
  parseImpressionWritePayload,
  type ImpressionSurface,
} from "./impressions";

export const ENGAGEMENT_WRITE_EVENTS = [
  "interested",
  "less_like_this",
  "save",
  "unsave",
  "share",
  "outbound",
  "story_open",
  "experience_feedback",
  IMPRESSION_EVENT,
] as const;

export type EngagementWriteEvent = (typeof ENGAGEMENT_WRITE_EVENTS)[number];

export const VISITOR_COOKIE = "drv247-visitor";
export const ENGAGEMENT_RATE_LIMIT = 40;
export const ENGAGEMENT_RATE_WINDOW_MS = 10 * 60 * 1000;

export function visitorCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    secure: Boolean(process.env.VERCEL),
  };
}

const ANALYTICS_TO_WRITE: Record<string, EngagementWriteEvent> = {
  [ENGAGEMENT_EVENTS.interested]: "interested",
  [ENGAGEMENT_EVENTS.lessLike]: "less_like_this",
  [ENGAGEMENT_EVENTS.save]: "save",
  [ENGAGEMENT_EVENTS.unsave]: "unsave",
  [ENGAGEMENT_EVENTS.share]: "share",
  [ENGAGEMENT_EVENTS.outbound]: "outbound",
  [ENGAGEMENT_EVENTS.open]: "story_open",
  [ENGAGEMENT_EVENTS.feedback]: "experience_feedback",
};

export type EngagementWritePayload = {
  event: EngagementWriteEvent;
  articleId: number | null;
  articleIds?: number[];
  cohort?: string;
  surface?: ImpressionSurface;
  detail?: string;
};

export function isEngagementWriteEvent(value: string): value is EngagementWriteEvent {
  return (ENGAGEMENT_WRITE_EVENTS as readonly string[]).includes(value);
}

export function writeEventFromAnalyticsName(name: string): EngagementWriteEvent | null {
  return ANALYTICS_TO_WRITE[name] ?? null;
}

export function sanitizeCohort(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const token = value.replace(/\s+/g, " ").trim();
  if (!token || token.length > 80) return undefined;
  if (/[<>\u0000-\u001f]/.test(token)) return undefined;
  return token;
}

export function feedbackDetail(data: Pick<ExperienceFeedbackEventData, "rating" | "reason">): string {
  return `${data.rating}:${data.reason}`;
}

export function parseFeedbackDetail(detail: string | null | undefined): {
  rating: string;
  reason: string;
} | null {
  if (!detail) return null;
  const [rating, reason] = detail.split(":");
  if (!rating || !reason) return null;
  return { rating, reason };
}

export function parseEngagementWritePayload(input: unknown): EngagementWritePayload | { error: string } {
  if (!input || typeof input !== "object") return { error: "Expected a JSON object." };
  const body = input as {
    event?: unknown;
    articleId?: unknown;
    articleIds?: unknown;
    cohort?: unknown;
    surface?: unknown;
    detail?: unknown;
    rating?: unknown;
    reason?: unknown;
  };
  const event = typeof body.event === "string" ? body.event : "";
  if (!isEngagementWriteEvent(event)) return { error: "Unknown event." };

  if (event === IMPRESSION_EVENT) {
    const parsed = parseImpressionWritePayload(body);
    if ("error" in parsed) return parsed;
    return {
      event: parsed.event,
      articleId: parsed.articleId,
      articleIds: parsed.articleIds,
      surface: parsed.surface,
      ...(sanitizeCohort(body.cohort) ? { cohort: sanitizeCohort(body.cohort) } : {}),
    };
  }

  let articleId: number | null = null;
  if (body.articleId != null && body.articleId !== "") {
    const id = typeof body.articleId === "number" ? body.articleId : Number(body.articleId);
    if (!Number.isInteger(id) || id <= 0) return { error: "articleId must be a positive integer." };
    articleId = id;
  }
  if (event !== "experience_feedback" && articleId == null) {
    return { error: "articleId is required for this event." };
  }
  if (event === "experience_feedback") {
    articleId = null;
  }

  const rating = typeof body.rating === "string" ? body.rating : undefined;
  const reason = typeof body.reason === "string" ? body.reason : undefined;
  const detail =
    typeof body.detail === "string" && body.detail.trim()
      ? body.detail.trim().slice(0, 80)
      : rating && reason
        ? feedbackDetail({
            rating: rating as ExperienceFeedbackEventData["rating"],
            reason: reason as ExperienceFeedbackEventData["reason"],
          })
        : undefined;

  return {
    event,
    articleId,
    ...(sanitizeCohort(body.cohort) ? { cohort: sanitizeCohort(body.cohort) } : {}),
    ...(detail ? { detail } : {}),
  };
}

export function visitorKeyFromCookieHeader(cookieHeader: string | null | undefined): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${VISITOR_COOKIE}=([^;]+)`));
  const value = match?.[1] ? decodeURIComponent(match[1]) : "";
  return isVisitorKey(value) ? value : null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isVisitorKey(value: string | null | undefined): value is string {
  return Boolean(value && UUID_RE.test(value));
}

export function createVisitorKey(random: () => number = Math.random): string {
  // RFC4122-ish UUID without pulling node:crypto into the client helper.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const n = Math.floor(random() * 16);
    const value = char === "x" ? n : (n & 0x3) | 0x8;
    return value.toString(16);
  });
}
