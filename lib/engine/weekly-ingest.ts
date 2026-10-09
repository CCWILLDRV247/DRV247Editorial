import { eq, gte } from "drizzle-orm";
import { ENABLED_SOURCE_IDS } from "@/config/wave1-sources";
import { getDb } from "@/lib/db";
import { ingestionRuns, mediaSources, type MediaSource } from "@/lib/db/schema";
import {
  extractMissingImages,
  extractMissingSummaries,
  ingestMediaSource,
  purgeEditorialIneligibleArticles,
  purgeMerchArticles,
  purgeNonEditorialArticles,
  purgeNonEnglishArticles,
  type SourceIngestResult,
} from "@/lib/engine/pipeline";
import { isIngestibleMediaSource } from "@/lib/engine/youtube-sources";
import {
  WEEKLY_SOURCE_BUDGET_MS,
  orderSourceIds,
  planWeeklyBatch,
  shouldStartNextSource,
  weeklyWindowStart,
} from "@/lib/engine/weekly-ingest-plan";

export {
  STALE_RUNNING_MS,
  VERCEL_CRON_MAX_MS,
  WEEKLY_CRON_HOUR_UTC,
  WEEKLY_CRON_SLOTS,
  WEEKLY_CRON_WEEKDAY,
  WEEKLY_SOURCE_BUDGET_MS,
  completedSourceIdsThisWeek,
  orderSourceIds,
  planWeeklyBatch,
  remainingSourceIds,
  shouldStartNextSource,
  weeklyWindowStart,
  type IngestRunRecord,
  type WeeklyBatchPlan,
} from "@/lib/engine/weekly-ingest-plan";

export type WeeklyCronResult = {
  pipeline: "culture";
  schedule: "weekly";
  slot: number;
  windowStart: number;
  status: "locked" | "complete" | "partial";
  remaining: number;
  completedBefore: number;
  results: SourceIngestResult[];
  purged: boolean;
  extractedMissing: boolean;
  lockSourceId?: string;
};

export function orderIngestibleSources(sources: MediaSource[]): MediaSource[] {
  const ingestible = sources.filter((source) => isIngestibleMediaSource(source));
  const byId = new Map(ingestible.map((source) => [source.id, source]));
  return orderSourceIds(
    ENABLED_SOURCE_IDS,
    ingestible.map((source) => source.id),
  )
    .map((id) => byId.get(id))
    .filter((source): source is MediaSource => Boolean(source));
}

export async function ingestWeeklyCronBatch(options: {
  slot: number;
  nowMs?: number;
  budgetMs?: number;
}): Promise<WeeklyCronResult> {
  const nowMs = options.nowMs ?? Date.now();
  const budgetMs = options.budgetMs ?? WEEKLY_SOURCE_BUDGET_MS;
  const windowStart = weeklyWindowStart(nowMs);
  const db = await getDb();
  const sources = orderIngestibleSources(await db.select().from(mediaSources));
  const runs = await db
    .select()
    .from(ingestionRuns)
    .where(gte(ingestionRuns.startedAt, windowStart));
  const plan = planWeeklyBatch({
    sourceIds: sources.map((source) => source.id),
    runs,
    windowStart,
    nowMs,
  });

  for (const id of plan.staleRunIds) {
    await db
      .update(ingestionRuns)
      .set({
        status: "timeout",
        finishedAt: nowMs,
        errorMessage: "Timed out (Vercel 300s cap)",
      })
      .where(eq(ingestionRuns.id, id));
  }

  if (plan.action === "locked") {
    return {
      pipeline: "culture",
      schedule: "weekly",
      slot: options.slot,
      windowStart,
      status: "locked",
      remaining: plan.remainingIds.length,
      completedBefore: plan.completedCount,
      results: [],
      purged: false,
      extractedMissing: false,
      lockSourceId: plan.lockSourceId ?? undefined,
    };
  }

  if (plan.action === "complete") {
    return {
      pipeline: "culture",
      schedule: "weekly",
      slot: options.slot,
      windowStart,
      status: "complete",
      remaining: 0,
      completedBefore: plan.completedCount,
      results: [],
      purged: false,
      extractedMissing: false,
    };
  }

  let purged = false;
  if (plan.firstOfWeek) {
    await purgeNonEnglishArticles();
    await purgeMerchArticles();
    await purgeNonEditorialArticles();
    await purgeEditorialIneligibleArticles();
    purged = true;
  }

  const byId = new Map(sources.map((source) => [source.id, source]));
  const results: SourceIngestResult[] = [];
  const batchStartedAt = Date.now();
  for (const id of plan.remainingIds) {
    if (!shouldStartNextSource(batchStartedAt, Date.now(), budgetMs)) break;
    const source = byId.get(id);
    if (!source) continue;
    results.push(await ingestMediaSource(source));
  }

  const remainingAfter = plan.remainingIds.length - results.length;
  let extractedMissing = false;
  if (remainingAfter === 0 && results.length > 0) {
    await extractMissingSummaries();
    await extractMissingImages();
    extractedMissing = true;
  }

  return {
    pipeline: "culture",
    schedule: "weekly",
    slot: options.slot,
    windowStart,
    status: remainingAfter === 0 ? "complete" : "partial",
    remaining: remainingAfter,
    completedBefore: plan.completedCount,
    results,
    purged,
    extractedMissing,
  };
}
