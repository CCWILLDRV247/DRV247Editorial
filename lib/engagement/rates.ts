import { TRENDING_WEIGHTS } from "./trending";
import { IMPRESSION_RATE_FLOOR } from "./impressions";

export const RATE_WEIGHTS = TRENDING_WEIGHTS;

export const RATE_ACTIONS = ["open", "outbound", "save", "share"] as const;
export type RateAction = (typeof RATE_ACTIONS)[number];

export type ExposureCounts = {
  impressionUniques: number;
  openUniques: number;
  outboundUniques: number;
  saveUniques: number;
  shareUniques: number;
  interestedUniques?: number;
  lessLikeUniques?: number;
  returningUniques?: number;
};

export type ExposureRates = ExposureCounts & {
  sufficient: boolean;
  openRate: number | null;
  outboundRate: number | null;
  saveRate: number | null;
  shareRate: number | null;
  interestedRate: number | null;
  lessLikeRate: number | null;
  returningRate: number | null;
  weightedScore: number | null;
};

function ratio(numer: number | undefined, denom: number): number | null {
  if (denom <= 0) return null;
  return (numer ?? 0) / denom;
}

/** Rates vs impression uniques. Weighted score only ships with the component rates. */
export function exposureRates(
  counts: ExposureCounts,
  floor = IMPRESSION_RATE_FLOOR,
): ExposureRates {
  const impressionUniques = counts.impressionUniques;
  const sufficient = impressionUniques >= floor;
  const openRate = ratio(counts.openUniques, impressionUniques);
  const outboundRate = ratio(counts.outboundUniques, impressionUniques);
  const saveRate = ratio(counts.saveUniques, impressionUniques);
  const shareRate = ratio(counts.shareUniques, impressionUniques);
  const interestedRate = ratio(counts.interestedUniques, impressionUniques);
  const lessLikeRate = ratio(counts.lessLikeUniques, impressionUniques);
  const returningRate = ratio(counts.returningUniques, impressionUniques);
  const weightedScore =
    sufficient &&
    openRate != null &&
    outboundRate != null &&
    saveRate != null &&
    shareRate != null
      ? (interestedRate ?? 0) * RATE_WEIGHTS.interested +
        saveRate * RATE_WEIGHTS.save +
        shareRate * RATE_WEIGHTS.share +
        outboundRate * RATE_WEIGHTS.outbound +
        (lessLikeRate ?? 0) * RATE_WEIGHTS.less_like_this
      : null;
  return {
    ...counts,
    sufficient,
    openRate,
    outboundRate,
    saveRate,
    shareRate,
    interestedRate,
    lessLikeRate,
    returningRate,
    weightedScore,
  };
}

export function formatRate(value: number | null): string {
  if (value == null) return "—";
  return `${Math.round(value * 1000) / 10}%`;
}

export function formatWeighted(value: number | null): string {
  if (value == null) return "—";
  return (Math.round(value * 1000) / 1000).toString();
}

export type RankedExposure<T extends ExposureRates> = {
  ranked: T[];
  insufficient: T[];
};

export function rankByOpenRate<T extends ExposureRates>(
  rows: readonly T[],
  floor = IMPRESSION_RATE_FLOOR,
): RankedExposure<T> {
  const ranked = rows
    .filter((row) => row.impressionUniques >= floor)
    .sort((left, right) => {
      const delta = (right.openRate ?? 0) - (left.openRate ?? 0);
      if (delta !== 0) return delta;
      return right.impressionUniques - left.impressionUniques;
    });
  const insufficient = rows
    .filter((row) => row.impressionUniques < floor)
    .sort((left, right) => right.impressionUniques - left.impressionUniques);
  return { ranked, insufficient };
}

export const INSUFFICIENT_DATA_COPY =
  "Insufficient data — fewer than 8 impression uniques in this window.";
