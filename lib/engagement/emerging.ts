import { DRV247_USER_INTERESTS } from "@/lib/engine/interest-taxonomy";
import { IMPRESSION_RATE_FLOOR } from "./impressions";
import { formatRate, type ExposureRates } from "./rates";

const INTEREST_SET = new Set<string>(DRV247_USER_INTERESTS);

export type DimRateRow = ExposureRates & {
  dimKind: "interest" | "marque" | "category" | "publisher" | "feedback" | "site";
  dimValue: string;
};

export type EmergingInterest = DimRateRow & {
  previous: ExposureRates;
  openRateDelta: number | null;
  sufficientBoth: boolean;
};

export function knownInterestLabel(value: string): string | null {
  return INTEREST_SET.has(value) ? value : null;
}

/** Window-over-window open-rate delta. Taxonomy interests only. Internal Desk. */
export function emergingInterests(
  current: readonly DimRateRow[],
  previous: readonly DimRateRow[],
  floor = IMPRESSION_RATE_FLOOR,
): EmergingInterest[] {
  const prevByValue = new Map(
    previous.filter((row) => row.dimKind === "interest").map((row) => [row.dimValue, row]),
  );
  const out: EmergingInterest[] = [];
  for (const row of current) {
    if (row.dimKind !== "interest") continue;
    if (!INTEREST_SET.has(row.dimValue)) continue;
    const prior = prevByValue.get(row.dimValue);
    const sufficientBoth = Boolean(
      row.impressionUniques >= floor && prior && prior.impressionUniques >= floor,
    );
    const openRateDelta =
      sufficientBoth && row.openRate != null && prior?.openRate != null
        ? row.openRate - prior.openRate
        : null;
    out.push({
      ...row,
      previous:
        prior ??
        ({
          impressionUniques: 0,
          openUniques: 0,
          outboundUniques: 0,
          saveUniques: 0,
          shareUniques: 0,
          sufficient: false,
          openRate: null,
          outboundRate: null,
          saveRate: null,
          shareRate: null,
          interestedRate: null,
          lessLikeRate: null,
          returningRate: null,
          weightedScore: null,
        } satisfies ExposureRates),
      openRateDelta,
      sufficientBoth,
    });
  }
  return out.sort((left, right) => {
    if (left.sufficientBoth !== right.sufficientBoth) return left.sufficientBoth ? -1 : 1;
    return (right.openRateDelta ?? -Infinity) - (left.openRateDelta ?? -Infinity);
  });
}

export type ArticleRateRow = ExposureRates & {
  articleId: number;
  title?: string;
  publication?: string;
};

export function deskRecommendations(input: {
  windowDays: number;
  publishers: readonly DimRateRow[];
  interests: readonly EmergingInterest[];
  content: readonly ArticleRateRow[];
  floor?: number;
}): string[] {
  const floor = input.floor ?? IMPRESSION_RATE_FLOOR;
  const days = input.windowDays;
  const recs: string[] = [];

  const rankedPublishers = [...input.publishers]
    .filter((row) => row.dimKind === "publisher" && row.impressionUniques >= floor)
    .sort((left, right) => (right.openRate ?? 0) - (left.openRate ?? 0));
  const topPublisher = rankedPublishers[0];
  const lowPublisher = rankedPublishers[rankedPublishers.length - 1];
  if (topPublisher && topPublisher.openRate != null) {
    recs.push(
      `Publisher ${topPublisher.dimValue} open rate is ${formatRate(topPublisher.openRate)} (n=${topPublisher.impressionUniques} impression uniques) over the last ${days} days.`,
    );
  }
  if (
    lowPublisher &&
    topPublisher &&
    lowPublisher.dimValue !== topPublisher.dimValue &&
    lowPublisher.openRate != null
  ) {
    recs.push(
      `Publisher ${lowPublisher.dimValue} open rate is ${formatRate(lowPublisher.openRate)} (n=${lowPublisher.impressionUniques} impression uniques) over the last ${days} days — lowest among publishers that clear the floor.`,
    );
  }

  const rising = input.interests.find(
    (row) => row.sufficientBoth && row.openRateDelta != null && row.openRateDelta > 0,
  );
  if (rising && rising.openRateDelta != null) {
    recs.push(
      `Interest ${rising.dimValue} open rate moved ${formatRate(rising.openRateDelta)} vs the prior ${days} days (n=${rising.impressionUniques}).`,
    );
  }

  const rankedContent = [...input.content]
    .filter((row) => row.impressionUniques >= floor)
    .sort((left, right) => (right.openRate ?? 0) - (left.openRate ?? 0));
  const high = rankedContent[0];
  const low = rankedContent[rankedContent.length - 1];
  if (high && high.openRate != null) {
    const label = high.title ? `"${high.title}"` : `article ${high.articleId}`;
    recs.push(
      `${label} open rate is ${formatRate(high.openRate)} (n=${high.impressionUniques} impression uniques) over the last ${days} days.`,
    );
  }
  if (low && high && low.articleId !== high.articleId && low.openRate != null) {
    const label = low.title ? `"${low.title}"` : `article ${low.articleId}`;
    recs.push(
      `${label} open rate is ${formatRate(low.openRate)} (n=${low.impressionUniques} impression uniques) over the last ${days} days — underperforming among titles that clear the floor.`,
    );
  }

  return recs.slice(0, 5);
}
