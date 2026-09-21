import type { EditorialInterludeType } from "./editorial-interlude";
import type { HomepageInterludeSlotId } from "./interlude-selection";

/** Visual weight for homepage interludes — one system, subtle variation. */
export type InterludeCompositionVariant = "statement" | "pause" | "whisper" | "accent";

const SLOT_VARIANT: Record<HomepageInterludeSlotId, InterludeCompositionVariant> = {
  "before-categories": "statement",
  "after-picks": "pause",
  "mid-categories": "whisper",
  "before-view-all": "whisper",
};

export function interludeCompositionVariant(
  slot: HomepageInterludeSlotId,
  type: EditorialInterludeType,
): InterludeCompositionVariant {
  const base = SLOT_VARIANT[slot];
  if (slot === "mid-categories" && (type === "PROVOCATION" || type === "SHORT_PUNCH")) {
    return "accent";
  }
  if (slot === "before-view-all" && type === "TRANSITION") {
    return "pause";
  }
  return base;
}

/** Vertical rhythm tokens for homepage composition (Tailwind class fragments). */
export const HOMEPAGE_COMPOSITION = {
  pageGap: "gap-14 md:gap-[4.5rem]",
  heroGap: "gap-9 md:gap-11",
  railGap: "gap-12 md:gap-[3.25rem]",
  picksLead: "mt-6 md:mt-10",
} as const;
