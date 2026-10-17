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

/**
 * Desktop magazine measure (≥1024px / `lg`).
 * Mobile class strings stay identical so phone layout does not regress.
 */
export const MAGAZINE_LAYOUT = {
  /**
   * Centered page column. The only desktop left gutter (`lg:pl-8`) lives here
   * so hero, type, rails, Picks, and Print share one edge. Right stays open.
   */
  page: "mx-auto w-full min-w-0 max-w-3xl md:max-w-6xl lg:max-w-[1080px] lg:pl-8",
  /** Story teaser uses the same left edge as For You. */
  reading: "mx-auto w-full min-w-0 max-w-3xl lg:max-w-[1080px] lg:pl-8",
  header: "mx-auto max-w-6xl px-4 md:px-6 lg:max-w-[1080px] lg:px-8",
  /** Phone gutters only — flush to the page edge from 1024px up. */
  gutter:
    "min-w-0 pl-[calc(10px+env(safe-area-inset-left,0px))] pr-[calc(10px+env(safe-area-inset-right,0px))] lg:px-0",
  rail: "mt-4 flex min-w-0 gap-2.5 overflow-x-auto pb-2 snap-x snap-mandatory [scrollbar-width:thin] md:mt-5 md:gap-2 lg:gap-3 lg:pl-0 lg:pr-0",
  /** One story on desktop — fill the magazine measure instead of a 260px tile. */
  railSolo: "mt-4 min-w-0 md:mt-5 lg:mt-5",
  storyRailCard: "w-[200px] shrink-0 snap-start md:w-[220px] lg:w-[260px]",
  storyRailCardSolo:
    "w-[200px] shrink-0 snap-start md:w-[220px] lg:flex lg:w-full lg:max-w-none lg:shrink lg:items-start lg:gap-6",
  storyRailImage:
    "relative h-[220px] overflow-hidden rounded-[12px] bg-[#1b1d1f] md:h-[240px] lg:h-[300px]",
  storyRailImageSolo:
    "relative h-[220px] overflow-hidden rounded-[12px] bg-[#1b1d1f] md:h-[240px] lg:h-[300px] lg:w-[min(58%,640px)] lg:shrink-0",
  pickRailCard: "w-[218px] shrink-0 lg:w-[260px]",
  pickRailCardSolo: "w-[218px] shrink-0 lg:w-full lg:max-w-none",
  pickRailImage:
    "relative h-[219px] overflow-hidden rounded-[12px] bg-[#cfcfcf] lg:h-[300px]",
  printRailCard: "w-[9.75rem] shrink-0 snap-start md:w-[11.5rem] lg:w-[260px]",
  heroHeight: "lg:h-[420px] lg:rounded-xl",
  storyHeroMedia:
    "relative h-[553px] w-full overflow-hidden bg-[#1b1d1f] md:rounded-xl lg:h-[420px]",
  storyCard: "h-[500px] lg:h-[380px]",
  /**
   * Type and tiles inside the Picks grey band. Mobile keeps the 10px gutter;
   * desktop adds space from the band edge without moving the band itself.
   */
  picksInner:
    "min-w-0 pl-[calc(10px+env(safe-area-inset-left,0px))] pr-[calc(10px+env(safe-area-inset-right,0px))] lg:pl-8 lg:pr-0",
  featuredPick: "block",
  railTitle:
    "mt-2 line-clamp-2 font-display text-base font-extrabold uppercase leading-[0.92] tracking-[-0.02em] text-[#1b1d1f] md:text-[18px] lg:text-[20px] lg:leading-[0.88]",
  railTitleSolo:
    "mt-2 line-clamp-2 font-display text-base font-extrabold uppercase leading-[0.92] tracking-[-0.02em] text-[#1b1d1f] md:text-[18px] lg:mt-0 lg:flex-1 lg:text-[20px] lg:leading-[0.88]",
} as const;

export function isSoloMagazineRail(count: number) {
  return count === 1;
}

/** Vertical rhythm tokens for homepage composition (Tailwind class fragments). */
export const HOMEPAGE_COMPOSITION = {
  pageGap: "gap-14 md:gap-[4.5rem]",
  heroGap: "gap-18 md:gap-22",
  railGap: "gap-12 md:gap-[3.25rem]",
  picksLead: "mt-6 md:mt-10",
  /** Parent pageGap + this = heroGap before the Picks heading (72px / 88px). */
  picksAboveHeading: "mt-4 md:mt-4",
  /** Full-width Picks band — magazine light grey `#f6f6f6`, not a card tint. */
  picksBand:
    "relative z-10 min-w-0 overflow-visible bg-[#f6f6f6] py-8 md:py-10 shadow-[100vw_0_0_0_#f6f6f6,-100vw_0_0_0_#f6f6f6]",
  /** Matches SectionIntro dek — e.g. “Ferrari F355 GTB · Classic · Performance”. */
  sectionTitle:
    "font-display text-[35px] font-extrabold uppercase leading-[0.64] tracking-[-0.02em] text-[#1b1d1f] lg:text-[40px] lg:leading-[0.66]",
} as const;
