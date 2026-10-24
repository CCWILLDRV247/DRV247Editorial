import { isKnownInterest } from "@/lib/engine/interest-taxonomy";
import {
  RAW_EVENT_RETENTION_DAYS,
  addUtcDays,
  dayIsWithin,
  utcDayFromMs,
} from "./impressions";
import { parseFeedbackDetail } from "./ingest";
import { mergeFirstDay } from "./returning";

export const RATE_EVENT_COLUMNS = [
  "impression",
  "story_open",
  "outbound",
  "save",
  "share",
  "interested",
  "less_like_this",
] as const;

export type RateEventName = (typeof RATE_EVENT_COLUMNS)[number];

export type RawEngagementRow = {
  event: string;
  articleId: number | null;
  visitorKey: string;
  createdAt: number;
  dayUtc?: string | null;
  surface?: string | null;
  detail?: string | null;
};

export type DailyTouch = {
  day: string;
  articleId: number;
  visitorKey: string;
  event: RateEventName;
};

export type DailyArticleRollup = {
  day: string;
  articleId: number;
  impressionUniques: number;
  openUniques: number;
  outboundUniques: number;
  saveUniques: number;
  shareUniques: number;
  interestedUniques: number;
  lessLikeUniques: number;
  returningUniques: number;
};

export type DailyDimKind = "interest" | "marque" | "category" | "publisher" | "feedback" | "site";

export type DailyDimRollup = {
  day: string;
  dimKind: DailyDimKind;
  dimValue: string;
  impressionUniques: number;
  openUniques: number;
  outboundUniques: number;
  saveUniques: number;
  shareUniques: number;
  interestedUniques: number;
  lessLikeUniques: number;
  returningUniques: number;
  eventCount: number;
};

export type ArticleDimension = {
  interests: string[];
  marques: string[];
  category: string | null;
  publisher: string | null;
};

export type VisitorFirstDay = Map<string, string>;

const RATE_EVENT_SET = new Set<string>(RATE_EVENT_COLUMNS);

export function eventDayUtc(row: RawEngagementRow): string {
  return row.dayUtc || utcDayFromMs(row.createdAt);
}

export function isRateEvent(event: string): event is RateEventName {
  return RATE_EVENT_SET.has(event);
}

export function rawRetentionCutoff(now = Date.now()): number {
  return Date.parse(`${addUtcDays(utcDayFromMs(now), -RAW_EVENT_RETENTION_DAYS)}T00:00:00.000Z`);
}

export function buildVisitorFirstDays(
  rows: readonly RawEngagementRow[],
  existing: VisitorFirstDay = new Map(),
): VisitorFirstDay {
  const next = new Map(existing);
  for (const row of rows) {
    if (row.event !== "impression" || row.articleId == null) continue;
    const day = eventDayUtc(row);
    next.set(row.visitorKey, mergeFirstDay(next.get(row.visitorKey), day));
  }
  return next;
}

export function buildDailyTouches(rows: readonly RawEngagementRow[]): DailyTouch[] {
  const seen = new Set<string>();
  const out: DailyTouch[] = [];
  for (const row of rows) {
    if (!isRateEvent(row.event) || row.articleId == null) continue;
    const day = eventDayUtc(row);
    const key = `${day}:${row.articleId}:${row.visitorKey}:${row.event}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      day,
      articleId: row.articleId,
      visitorKey: row.visitorKey,
      event: row.event,
    });
  }
  return out;
}

function emptyArticle(day: string, articleId: number): DailyArticleRollup {
  return {
    day,
    articleId,
    impressionUniques: 0,
    openUniques: 0,
    outboundUniques: 0,
    saveUniques: 0,
    shareUniques: 0,
    interestedUniques: 0,
    lessLikeUniques: 0,
    returningUniques: 0,
  };
}

function bumpEvent(row: DailyArticleRollup, event: RateEventName) {
  if (event === "impression") row.impressionUniques += 1;
  else if (event === "story_open") row.openUniques += 1;
  else if (event === "outbound") row.outboundUniques += 1;
  else if (event === "save") row.saveUniques += 1;
  else if (event === "share") row.shareUniques += 1;
  else if (event === "interested") row.interestedUniques += 1;
  else if (event === "less_like_this") row.lessLikeUniques += 1;
}

export function buildDailyArticles(
  touches: readonly DailyTouch[],
  firstDays: VisitorFirstDay = new Map(),
): DailyArticleRollup[] {
  const byKey = new Map<string, DailyArticleRollup>();
  const returningSeen = new Set<string>();
  for (const touch of touches) {
    const key = `${touch.day}:${touch.articleId}`;
    const row = byKey.get(key) ?? emptyArticle(touch.day, touch.articleId);
    bumpEvent(row, touch.event);
    if (touch.event === "impression") {
      const first = firstDays.get(touch.visitorKey);
      const returnKey = `${key}:${touch.visitorKey}`;
      if (first && first < touch.day && !returningSeen.has(returnKey)) {
        row.returningUniques += 1;
        returningSeen.add(returnKey);
      }
    }
    byKey.set(key, row);
  }
  return [...byKey.values()].sort((left, right) =>
    left.day === right.day ? left.articleId - right.articleId : left.day.localeCompare(right.day),
  );
}

function emptyDim(day: string, dimKind: DailyDimKind, dimValue: string): DailyDimRollup {
  return {
    day,
    dimKind,
    dimValue,
    impressionUniques: 0,
    openUniques: 0,
    outboundUniques: 0,
    saveUniques: 0,
    shareUniques: 0,
    interestedUniques: 0,
    lessLikeUniques: 0,
    returningUniques: 0,
    eventCount: 0,
  };
}

function dimPairsForArticle(meta: ArticleDimension | undefined): { kind: DailyDimKind; value: string }[] {
  if (!meta) return [];
  const pairs: { kind: DailyDimKind; value: string }[] = [];
  for (const interest of meta.interests) {
    if (isKnownInterest(interest)) pairs.push({ kind: "interest", value: interest });
  }
  for (const marque of meta.marques) {
    const name = marque.replace(/\s+/g, " ").trim();
    if (name) pairs.push({ kind: "marque", value: name });
  }
  if (meta.category) pairs.push({ kind: "category", value: meta.category });
  if (meta.publisher) pairs.push({ kind: "publisher", value: meta.publisher });
  return pairs;
}

export function buildDailyDims(
  touches: readonly DailyTouch[],
  metaByArticle: ReadonlyMap<number, ArticleDimension>,
  firstDays: VisitorFirstDay = new Map(),
  feedbackRows: readonly RawEngagementRow[] = [],
): DailyDimRollup[] {
  const byKey = new Map<string, DailyDimRollup>();
  const uniqueSeen = new Set<string>();
  const returningSeen = new Set<string>();

  function dimRow(day: string, kind: DailyDimKind, value: string): DailyDimRollup {
    const key = `${day}:${kind}:${value}`;
    const row = byKey.get(key) ?? emptyDim(day, kind, value);
    byKey.set(key, row);
    return row;
  }

  for (const touch of touches) {
    const pairs = [{ kind: "site" as const, value: "all" }, ...dimPairsForArticle(metaByArticle.get(touch.articleId))];
    for (const pair of pairs) {
      const row = dimRow(touch.day, pair.kind, pair.value);
      row.eventCount += 1;
      const uniqueKey = `${touch.day}:${pair.kind}:${pair.value}:${touch.visitorKey}:${touch.event}`;
      if (uniqueSeen.has(uniqueKey)) continue;
      uniqueSeen.add(uniqueKey);
      if (touch.event === "impression") row.impressionUniques += 1;
      else if (touch.event === "story_open") row.openUniques += 1;
      else if (touch.event === "outbound") row.outboundUniques += 1;
      else if (touch.event === "save") row.saveUniques += 1;
      else if (touch.event === "share") row.shareUniques += 1;
      else if (touch.event === "interested") row.interestedUniques += 1;
      else if (touch.event === "less_like_this") row.lessLikeUniques += 1;
      if (touch.event === "impression") {
        const first = firstDays.get(touch.visitorKey);
        const returnKey = `${touch.day}:${pair.kind}:${pair.value}:${touch.visitorKey}`;
        if (first && first < touch.day && !returningSeen.has(returnKey)) {
          row.returningUniques += 1;
          returningSeen.add(returnKey);
        }
      }
    }
  }

  for (const row of feedbackRows) {
    if (row.event !== "experience_feedback") continue;
    const day = eventDayUtc(row);
    const parsed = parseFeedbackDetail(row.detail);
    const values = parsed
      ? [`rating:${parsed.rating}`, `reason:${parsed.reason}`, `theme:${parsed.rating}/${parsed.reason}`]
      : ["theme:unspecified"];
    for (const value of values) {
      const dim = dimRow(day, "feedback", value);
      dim.eventCount += 1;
      const uniqueKey = `${day}:feedback:${value}:${row.visitorKey}:experience_feedback`;
      if (uniqueSeen.has(uniqueKey)) continue;
      uniqueSeen.add(uniqueKey);
      dim.impressionUniques += 1;
    }
  }

  return [...byKey.values()].sort((left, right) => {
    if (left.day !== right.day) return left.day.localeCompare(right.day);
    if (left.dimKind !== right.dimKind) return left.dimKind.localeCompare(right.dimKind);
    return left.dimValue.localeCompare(right.dimValue);
  });
}

export function filterTouchesForWindow(
  touches: readonly DailyTouch[],
  startDay: string,
  endDay: string,
): DailyTouch[] {
  return touches.filter((touch) => dayIsWithin(touch.day, startDay, endDay));
}

function collapseTouchesForWindow(
  touches: readonly DailyTouch[],
  windowStartDay: string,
): DailyTouch[] {
  const seen = new Set<string>();
  const out: DailyTouch[] = [];
  for (const touch of touches) {
    const key = `${touch.articleId}:${touch.visitorKey}:${touch.event}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...touch, day: windowStartDay });
  }
  return out;
}

export function windowArticleCounts(
  touches: readonly DailyTouch[],
  firstDays: VisitorFirstDay,
  windowStartDay: string,
): DailyArticleRollup[] {
  const returningFirst: VisitorFirstDay = new Map();
  for (const [visitor, first] of firstDays) {
    if (first < windowStartDay) returningFirst.set(visitor, first);
  }
  return buildDailyArticles(collapseTouchesForWindow(touches, windowStartDay), returningFirst);
}

export function windowDimCounts(
  touches: readonly DailyTouch[],
  metaByArticle: ReadonlyMap<number, ArticleDimension>,
  firstDays: VisitorFirstDay,
  windowStartDay: string,
  feedbackRows: readonly RawEngagementRow[] = [],
): DailyDimRollup[] {
  const returningFirst: VisitorFirstDay = new Map();
  for (const [visitor, first] of firstDays) {
    if (first < windowStartDay) returningFirst.set(visitor, first);
  }
  return buildDailyDims(
    collapseTouchesForWindow(touches, windowStartDay),
    metaByArticle,
    returningFirst,
    feedbackRows.map((row) => ({ ...row, dayUtc: windowStartDay })),
  );
}
