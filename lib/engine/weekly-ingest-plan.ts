/** Vercel Pro cron / function cap. One isolate cannot finish 75 sequential sources. */
export const VERCEL_CRON_MAX_MS = 300_000;

/**
 * Stop starting new sources with this much wall time used, so the current
 * source plus function teardown can finish inside the 300s cap.
 */
export const WEEKLY_SOURCE_BUDGET_MS = 220_000;

/** A `running` ingest_runs row older than this was killed by the cap. Retry it. */
export const STALE_RUNNING_MS = VERCEL_CRON_MAX_MS;

export const WEEKLY_CRON_WEEKDAY = 1;
export const WEEKLY_CRON_HOUR_UTC = 6;

/**
 * Sequential Monday slots. 06:00 UTC is the start of the week (unchanged).
 * Later slots resume from ingest_runs — they never run sources in parallel.
 * 06:12–06:20 is left for intelligence-ingest (`15 6 * * 1`, 300s cap).
 */
export const WEEKLY_CRON_SLOTS = [
  { slot: 1, path: "/api/cron/ingest", schedule: "0 6 * * 1" },
  { slot: 2, path: "/api/cron/ingest-2", schedule: "6 6 * * 1" },
  { slot: 3, path: "/api/cron/ingest-3", schedule: "21 6 * * 1" },
  { slot: 4, path: "/api/cron/ingest-4", schedule: "27 6 * * 1" },
  { slot: 5, path: "/api/cron/ingest-5", schedule: "33 6 * * 1" },
] as const;

export type IngestRunRecord = {
  id?: number;
  sourceId: string;
  startedAt: number;
  finishedAt: number | null;
  status: string;
};

export type WeeklyBatchPlan = {
  action: "locked" | "complete" | "ingest";
  remainingIds: string[];
  firstOfWeek: boolean;
  staleRunIds: number[];
  lockSourceId: string | null;
  completedCount: number;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Monday 06:00 UTC of the current weekly cycle. Next live run after this work: 12 Oct 2026. */
export function weeklyWindowStart(nowMs: number): number {
  const now = new Date(nowMs);
  const daysSinceMonday = (now.getUTCDay() + 6) % 7;
  const start = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - daysSinceMonday,
    WEEKLY_CRON_HOUR_UTC,
    0,
    0,
    0,
  );
  return nowMs < start ? start - WEEK_MS : start;
}

export function isTerminalRunStatus(status: string): boolean {
  return status === "ok" || status === "error";
}

export function completedSourceIdsThisWeek(
  runs: IngestRunRecord[],
  windowStart: number,
): Set<string> {
  const done = new Set<string>();
  for (const run of runs) {
    if (run.startedAt < windowStart) continue;
    if (isTerminalRunStatus(run.status)) done.add(run.sourceId);
  }
  return done;
}

export function freshLockSourceId(
  runs: IngestRunRecord[],
  windowStart: number,
  nowMs: number,
  staleMs = STALE_RUNNING_MS,
): string | null {
  let lock: { sourceId: string; startedAt: number } | null = null;
  for (const run of runs) {
    if (run.startedAt < windowStart) continue;
    if (run.status !== "running") continue;
    if (nowMs - run.startedAt >= staleMs) continue;
    if (!lock || run.startedAt > lock.startedAt) {
      lock = { sourceId: run.sourceId, startedAt: run.startedAt };
    }
  }
  return lock?.sourceId ?? null;
}

export function staleRunningRunIds(
  runs: IngestRunRecord[],
  windowStart: number,
  nowMs: number,
  staleMs = STALE_RUNNING_MS,
): number[] {
  const ids: number[] = [];
  for (const run of runs) {
    if (run.id == null) continue;
    if (run.startedAt < windowStart) continue;
    if (run.status !== "running") continue;
    if (nowMs - run.startedAt >= staleMs) ids.push(run.id);
  }
  return ids;
}

export function remainingSourceIds(orderedIds: string[], completed: Set<string>): string[] {
  return orderedIds.filter((id) => !completed.has(id));
}

export function shouldStartNextSource(
  batchStartedAt: number,
  nowMs: number,
  budgetMs = WEEKLY_SOURCE_BUDGET_MS,
): boolean {
  return nowMs - batchStartedAt < budgetMs;
}

/** Wave list first, then extra ingestible ids (desk YouTube) in stable order. */
export function orderSourceIds(waveIds: readonly string[], ingestibleIds: string[]): string[] {
  const pending = new Set(ingestibleIds);
  const ordered: string[] = [];
  for (const id of waveIds) {
    if (!pending.has(id)) continue;
    ordered.push(id);
    pending.delete(id);
  }
  return [...ordered, ...[...pending].sort()];
}

/**
 * Title-dedup in persistItems is in-memory per source. Parallel source
 * ingest would race duplicateGroupId and the full-table purge/extract
 * passes. Keep one source at a time unless those are rewritten.
 */
export function planWeeklyBatch(input: {
  sourceIds: string[];
  runs: IngestRunRecord[];
  windowStart: number;
  nowMs: number;
}): WeeklyBatchPlan {
  const staleRunIds = staleRunningRunIds(input.runs, input.windowStart, input.nowMs);
  const liveRuns = input.runs.filter((run) => !staleRunIds.includes(run.id ?? -1));
  const lockSourceId = freshLockSourceId(liveRuns, input.windowStart, input.nowMs);
  const completed = completedSourceIdsThisWeek(liveRuns, input.windowStart);
  const remainingIds = remainingSourceIds(input.sourceIds, completed);
  const firstOfWeek = completed.size === 0;
  if (lockSourceId) {
    return {
      action: "locked",
      remainingIds,
      firstOfWeek,
      staleRunIds,
      lockSourceId,
      completedCount: completed.size,
    };
  }
  if (!remainingIds.length) {
    return {
      action: "complete",
      remainingIds,
      firstOfWeek,
      staleRunIds,
      lockSourceId: null,
      completedCount: completed.size,
    };
  }
  return {
    action: "ingest",
    remainingIds,
    firstOfWeek,
    staleRunIds,
    lockSourceId: null,
    completedCount: completed.size,
  };
}
