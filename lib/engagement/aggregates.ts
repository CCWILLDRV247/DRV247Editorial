import { and, eq, gte, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { getDb } from "@/lib/db";
import { engagementEvents } from "@/lib/db/schema";
import { contextualCommunityLabel, type LabelEventRow } from "./labels";
import { ENGAGEMENT_RATE_LIMIT, ENGAGEMENT_RATE_WINDOW_MS } from "./ingest";
import { utcDayFromMs, type ImpressionSurface } from "./impressions";
import {
  evaluateTrendingGate,
  trendingWindowStart,
  type TrendingEventRow,
  type TrendingSnapshot,
} from "./trending";

export type EngagementEventInsert = {
  event: string;
  articleId: number | null;
  visitorKey: string;
  cohort?: string;
  createdAt?: number;
  surface?: string | null;
  detail?: string | null;
  dayUtc?: string | null;
};

async function loadWindowRows(since: number): Promise<(TrendingEventRow & LabelEventRow)[]> {
  const db = await getDb();
  const rows = await db
    .select({
      event: engagementEvents.event,
      articleId: engagementEvents.articleId,
      visitorKey: engagementEvents.visitorKey,
      cohort: engagementEvents.cohort,
    })
    .from(engagementEvents)
    .where(gte(engagementEvents.createdAt, since));
  return rows.map((row) => ({
    event: row.event,
    articleId: row.articleId,
    visitorKey: row.visitorKey,
    cohort: row.cohort,
  }));
}

export async function insertEngagementEvent(input: EngagementEventInsert): Promise<void> {
  const db = await getDb();
  const createdAt = input.createdAt ?? Date.now();
  await db.insert(engagementEvents).values({
    event: input.event,
    articleId: input.articleId,
    visitorKey: input.visitorKey,
    cohort: input.cohort ?? null,
    createdAt,
    surface: input.surface ?? null,
    detail: input.detail ?? null,
    dayUtc: input.dayUtc ?? utcDayFromMs(createdAt),
  });
}

export async function insertImpressionBatch(input: {
  articleIds: readonly number[];
  visitorKey: string;
  surface: ImpressionSurface;
  cohort?: string;
  createdAt?: number;
}): Promise<number> {
  if (input.articleIds.length === 0) return 0;
  const db = await getDb();
  const createdAt = input.createdAt ?? Date.now();
  const dayUtc = utcDayFromMs(createdAt);
  const values = input.articleIds.map((articleId) => ({
    event: "impression",
    articleId,
    visitorKey: input.visitorKey,
    cohort: input.cohort ?? null,
    createdAt,
    surface: input.surface,
    detail: null,
    dayUtc,
  }));
  const inserted = await db
    .insert(engagementEvents)
    .values(values)
    .onConflictDoNothing();
  return Number((inserted as { rowsAffected?: number }).rowsAffected ?? values.length);
}

export async function countVisitorWrites(visitorKey: string, since: number): Promise<number> {
  const db = await getDb();
  const [row] = await db
    .select({ n: sql<number>`count(*)` })
    .from(engagementEvents)
    .where(and(eq(engagementEvents.visitorKey, visitorKey), gte(engagementEvents.createdAt, since)));
  return Number(row?.n ?? 0);
}

export async function visitorIsRateLimited(visitorKey: string, now = Date.now()): Promise<boolean> {
  const count = await countVisitorWrites(visitorKey, now - ENGAGEMENT_RATE_WINDOW_MS);
  return count >= ENGAGEMENT_RATE_LIMIT;
}

export async function loadTrendingSnapshot(now = Date.now()): Promise<TrendingSnapshot> {
  try {
    const rows = await loadWindowRows(trendingWindowStart(now));
    return evaluateTrendingGate(rows, now);
  } catch {
    return evaluateTrendingGate([], now);
  }
}

export const getCachedTrendingSnapshot = unstable_cache(
  async () => loadTrendingSnapshot(),
  ["engagement-trending-snapshot"],
  { revalidate: 60, tags: ["engagement"] },
);

export async function communityLabelForArticle(articleId: number, now = Date.now()): Promise<string | null> {
  try {
    const rows = await loadWindowRows(trendingWindowStart(now));
    return contextualCommunityLabel(articleId, rows);
  } catch {
    return null;
  }
}

export type EngagementReport = {
  totalEvents: number;
  byEvent: { event: string; count: number }[];
  topArticles: { articleId: number; count: number }[];
  trending: TrendingSnapshot;
};

export async function loadEngagementReport(now = Date.now()): Promise<EngagementReport> {
  const db = await getDb();
  const [totalRow] = await db
    .select({ n: sql<number>`count(*)` })
    .from(engagementEvents);
  const byEventRows = await db
    .select({
      event: engagementEvents.event,
      count: sql<number>`count(*)`,
    })
    .from(engagementEvents)
    .groupBy(engagementEvents.event);
  const topRows = await db
    .select({
      articleId: engagementEvents.articleId,
      count: sql<number>`count(*)`,
    })
    .from(engagementEvents)
    .where(sql`${engagementEvents.articleId} is not null`)
    .groupBy(engagementEvents.articleId)
    .orderBy(sql`count(*) desc`)
    .limit(12);
  const trending = await loadTrendingSnapshot(now);
  return {
    totalEvents: Number(totalRow?.n ?? 0),
    byEvent: byEventRows
      .map((row) => ({ event: row.event, count: Number(row.count) }))
      .sort((left, right) => right.count - left.count || left.event.localeCompare(right.event)),
    topArticles: topRows
      .filter((row): row is { articleId: number; count: number } => row.articleId != null)
      .map((row) => ({ articleId: row.articleId, count: Number(row.count) })),
    trending,
  };
}
