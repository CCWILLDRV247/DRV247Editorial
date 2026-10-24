/** Eligible impression = a served article id to a visitor on a UTC day. Not a viewport observer. */

export const IMPRESSION_EVENT = "impression" as const;

export const IMPRESSION_SURFACES = ["home", "category", "editorial_api"] as const;
export type ImpressionSurface = (typeof IMPRESSION_SURFACES)[number];

export const IMPRESSION_BATCH_MAX = 80;
export const IMPRESSION_RATE_FLOOR = 8;
export const RAW_EVENT_RETENTION_DAYS = 90;

export const DESK_WINDOWS = [7, 14, 28] as const;
export type DeskWindowDays = (typeof DESK_WINDOWS)[number];

const SURFACE_SET = new Set<string>(IMPRESSION_SURFACES);

export function utcDayFromMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addUtcDays(day: string, delta: number): string {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

export function uniquePositiveIds(ids: readonly (number | null | undefined)[]): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const id of ids) {
    if (!Number.isInteger(id) || !id || id <= 0 || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function isImpressionSurface(value: unknown): value is ImpressionSurface {
  return typeof value === "string" && SURFACE_SET.has(value);
}

export function parseArticleIdList(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return uniquePositiveIds(
    value.map((item) => (typeof item === "number" ? item : Number(item))),
  );
}

export type ImpressionWritePayload = {
  event: typeof IMPRESSION_EVENT;
  articleId: number;
  articleIds: number[];
  surface: ImpressionSurface;
};

export function parseImpressionWritePayload(
  input: Record<string, unknown>,
): ImpressionWritePayload | { error: string } {
  const fromList = parseArticleIdList(input.articleIds);
  const single =
    input.articleId != null && input.articleId !== ""
      ? typeof input.articleId === "number"
        ? input.articleId
        : Number(input.articleId)
      : null;
  const articleIds = uniquePositiveIds([...fromList, single]);
  if (articleIds.length === 0) return { error: "articleId is required for this event." };
  if (articleIds.length > IMPRESSION_BATCH_MAX) {
    return { error: `At most ${IMPRESSION_BATCH_MAX} article ids per impression batch.` };
  }
  if (!isImpressionSurface(input.surface)) {
    return { error: "surface must be home, category, or editorial_api." };
  }
  return {
    event: IMPRESSION_EVENT,
    articleId: articleIds[0],
    articleIds,
    surface: input.surface,
  };
}

export function impressionDedupKey(input: {
  visitorKey: string;
  articleId: number;
  dayUtc: string;
  surface: ImpressionSurface;
}): string {
  return `${input.visitorKey}:${input.articleId}:${input.dayUtc}:${input.surface}`;
}

export function intelligenceWindow(days: DeskWindowDays, now = Date.now()) {
  const endDay = utcDayFromMs(now);
  const startDay = addUtcDays(endDay, -(days - 1));
  const previousEndDay = addUtcDays(startDay, -1);
  const previousStartDay = addUtcDays(previousEndDay, -(days - 1));
  return {
    days,
    startDay,
    endDay,
    previousStartDay,
    previousEndDay,
    startMs: Date.parse(`${startDay}T00:00:00.000Z`),
    endMs: Date.parse(`${endDay}T23:59:59.999Z`),
    label: `Last ${days} days (UTC)`,
    previousLabel: `Prior ${days} days (UTC)`,
  };
}

export function parseDeskWindow(value: unknown): DeskWindowDays {
  const days = typeof value === "number" ? value : Number(value);
  return DESK_WINDOWS.includes(days as DeskWindowDays) ? (days as DeskWindowDays) : 7;
}

export function dayIsWithin(day: string, startDay: string, endDay: string): boolean {
  return day >= startDay && day <= endDay;
}
