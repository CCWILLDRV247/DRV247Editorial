export const LABEL_FLOORS = {
  cohortUniqueVisitors: 8,
  articleCohortVisitors: 5,
} as const;

export type LabelEventRow = {
  event: string;
  articleId: number | null;
  visitorKey: string;
  cohort?: string | null;
};

const LABEL_EVENTS = new Set(["interested", "save"]);

function normCohort(value: string | null | undefined): string {
  return (value ?? "").trim();
}

export function contextualCommunityLabel(
  articleId: number,
  rows: readonly LabelEventRow[],
): string | null {
  if (!Number.isInteger(articleId) || articleId <= 0) return null;

  const byCohort = new Map<string, { visitors: Set<string>; articleVisitors: Set<string> }>();
  for (const row of rows) {
    const cohort = normCohort(row.cohort);
    if (!cohort) continue;
    const bucket = byCohort.get(cohort) ?? {
      visitors: new Set<string>(),
      articleVisitors: new Set<string>(),
    };
    bucket.visitors.add(row.visitorKey);
    if (row.articleId === articleId && LABEL_EVENTS.has(row.event)) {
      bucket.articleVisitors.add(row.visitorKey);
    }
    byCohort.set(cohort, bucket);
  }

  const qualified = [...byCohort.entries()]
    .filter(
      ([, bucket]) =>
        bucket.visitors.size >= LABEL_FLOORS.cohortUniqueVisitors &&
        bucket.articleVisitors.size >= LABEL_FLOORS.articleCohortVisitors,
    )
    .sort((left, right) => right[1].articleVisitors.size - left[1].articleVisitors.size);

  const winner = qualified[0];
  if (!winner) return null;
  return `Marked by ${winner[0]} readers`;
}
