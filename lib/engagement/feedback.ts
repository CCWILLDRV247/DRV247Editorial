import type { ExperienceFeedbackRating } from "./events";

export const EXPERIENCE_FEEDBACK_STORAGE_KEY = "drv247-experience-feedback";
export const EXPERIENCE_FEEDBACK_MIN_DWELL_MS = 20_000;
export const EXPERIENCE_FEEDBACK_SCROLL_RATIO = 0.45;
/** Ignore restored / layout scroll so the bar cannot flash on first paint. */
export const EXPERIENCE_FEEDBACK_SCROLL_ARM_MS = 1_000;
export const EXPERIENCE_FEEDBACK_DISMISS_MS = 14 * 24 * 60 * 60 * 1000;

export const EXPERIENCE_FEEDBACK_RATINGS = ["useful", "not_for_me", "browsing"] as const;

export const MEANINGFUL_ENGAGE_EVENT = "drv247-meaningful-engage";

export type ExperienceFeedbackStored = {
  status: "submitted" | "dismissed";
  rating?: ExperienceFeedbackRating;
  at: number;
};

export function parseExperienceFeedbackStored(
  raw: string | null | undefined,
): ExperienceFeedbackStored | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ExperienceFeedbackStored>;
    if (parsed.status !== "submitted" && parsed.status !== "dismissed") return null;
    if (typeof parsed.at !== "number" || !Number.isFinite(parsed.at)) return null;
    const rating = parsed.rating;
    if (rating !== undefined && !isExperienceFeedbackRating(rating)) return null;
    return {
      status: parsed.status,
      at: parsed.at,
      ...(rating ? { rating } : {}),
    };
  } catch {
    return null;
  }
}

export function isExperienceFeedbackRating(value: string): value is ExperienceFeedbackRating {
  return (EXPERIENCE_FEEDBACK_RATINGS as readonly string[]).includes(value);
}

export function alreadyRespondedToExperienceFeedback(
  stored: ExperienceFeedbackStored | null,
  now = Date.now(),
): boolean {
  if (!stored) return false;
  if (stored.status === "submitted") return true;
  return now - stored.at < EXPERIENCE_FEEDBACK_DISMISS_MS;
}

/** Pure gate. First paint is always off. */
export function shouldShowExperienceFeedback(input: {
  firstPaint: boolean;
  dwellMs: number;
  scrolledPast: boolean;
  explicitEngage: boolean;
  alreadyResponded: boolean;
  scrollArmed?: boolean;
  minDwellMs?: number;
}): boolean {
  if (input.firstPaint) return false;
  if (input.alreadyResponded) return false;
  const minDwell = input.minDwellMs ?? EXPERIENCE_FEEDBACK_MIN_DWELL_MS;
  const scrolled = input.scrolledPast && input.scrollArmed !== false;
  return input.explicitEngage || scrolled || input.dwellMs >= minDwell;
}

export function readExperienceFeedbackStored(): ExperienceFeedbackStored | null {
  if (typeof window === "undefined") return null;
  return parseExperienceFeedbackStored(window.localStorage.getItem(EXPERIENCE_FEEDBACK_STORAGE_KEY));
}

export function writeExperienceFeedbackStored(value: ExperienceFeedbackStored): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(EXPERIENCE_FEEDBACK_STORAGE_KEY, JSON.stringify(value));
}

export function signalMeaningfulEngage(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(MEANINGFUL_ENGAGE_EVENT));
}
