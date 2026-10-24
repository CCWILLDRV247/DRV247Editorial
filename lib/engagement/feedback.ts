import type {
  ExperienceFeedbackRating,
  ExperienceFeedbackReason,
  ExperienceFeedbackSurface,
} from "./events";

export const EXPERIENCE_FEEDBACK_STORAGE_KEY = "drv247-experience-feedback";
export const EXPERIENCE_FEEDBACK_MIN_DWELL_MS = 20_000;
export const EXPERIENCE_FEEDBACK_SCROLL_RATIO = 0.45;
/** Ignore restored / layout scroll so the panel cannot flash on first paint. */
export const EXPERIENCE_FEEDBACK_SCROLL_ARM_MS = 1_000;
export const EXPERIENCE_FEEDBACK_DISMISS_MS = 14 * 24 * 60 * 60 * 1000;

export const EXPERIENCE_FEEDBACK_PROMPT = "How’s your DRV247 experience?";
export const EXPERIENCE_FEEDBACK_ENJOY_PROMPT = "What are you enjoying most?";
export const EXPERIENCE_FEEDBACK_IMPROVE_PROMPT = "What could we improve?";

export const EXPERIENCE_FEEDBACK_RATINGS = ["not_great", "okay", "good", "love_it"] as const;

export const EXPERIENCE_FEEDBACK_RATING_LABELS: Record<ExperienceFeedbackRating, string> = {
  not_great: "Not great",
  okay: "Okay",
  good: "Good",
  love_it: "Love it",
};

export const EXPERIENCE_FEEDBACK_REASONS = [
  "discovery",
  "personalisation",
  "sources",
  "pace",
  "layout",
] as const;

export const EXPERIENCE_FEEDBACK_REASON_LABELS: Record<ExperienceFeedbackReason, string> = {
  discovery: "Discovery",
  personalisation: "Personalisation",
  sources: "Mix of sources",
  pace: "Pace",
  layout: "Layout",
};

export const MEANINGFUL_ENGAGE_EVENT = "drv247-meaningful-engage";

export type ExperienceFeedbackStored = {
  status: "submitted" | "dismissed";
  rating?: ExperienceFeedbackRating;
  reason?: ExperienceFeedbackReason;
  at: number;
};

export function experienceFollowUpPrompt(rating: ExperienceFeedbackRating): string {
  return rating === "good" || rating === "love_it"
    ? EXPERIENCE_FEEDBACK_ENJOY_PROMPT
    : EXPERIENCE_FEEDBACK_IMPROVE_PROMPT;
}

export function experienceFeedbackCopy(): string[] {
  return [
    EXPERIENCE_FEEDBACK_PROMPT,
    EXPERIENCE_FEEDBACK_ENJOY_PROMPT,
    EXPERIENCE_FEEDBACK_IMPROVE_PROMPT,
    ...Object.values(EXPERIENCE_FEEDBACK_RATING_LABELS),
    ...Object.values(EXPERIENCE_FEEDBACK_REASON_LABELS),
  ];
}

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
    const reason = parsed.reason;
    if (reason !== undefined && !isExperienceFeedbackReason(reason)) return null;
    return {
      status: parsed.status,
      at: parsed.at,
      ...(rating ? { rating } : {}),
      ...(reason ? { reason } : {}),
    };
  } catch {
    return null;
  }
}

export function isExperienceFeedbackRating(value: string): value is ExperienceFeedbackRating {
  return (EXPERIENCE_FEEDBACK_RATINGS as readonly string[]).includes(value);
}

export function isExperienceFeedbackReason(value: string): value is ExperienceFeedbackReason {
  return (EXPERIENCE_FEEDBACK_REASONS as readonly string[]).includes(value);
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

export function experienceFeedbackSurface(pathname: string): ExperienceFeedbackSurface {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/category/")) return "category";
  if (pathname.startsWith("/story/")) return "story";
  if (pathname === "/saved") return "saved";
  return "other";
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
