import type { InterludeCompositionVariant } from "./editorial-composition";

/** Applied once to all interlude copy (type + variant labels). */
export const INTERLUDE_TYPE_SCALE = 1.2;

export type InterludeVariantTypography = {
  section: string;
  label: string;
  type: string;
  rule?: string;
};

/**
 * Single source for homepage variant + category feed interlude typography.
 * All clamps and label px values are baseline × {@link INTERLUDE_TYPE_SCALE}.
 */
export const INTERLUDE_VARIANT_TYPOGRAPHY: Record<
  InterludeCompositionVariant,
  InterludeVariantTypography
> = {
  statement: {
    section: "py-14 md:py-[4.5rem]",
    label:
      "mb-5 font-display text-[13px] font-bold uppercase tracking-[0.16em] text-[#1b1d1f]/50 md:mb-6",
    type: "max-w-[13ch] text-[clamp(3.3rem,19.2vw,9rem)] leading-[0.66] md:max-w-[16ch] md:text-[clamp(4.8rem,13.2vw,10.2rem)] md:leading-[0.64]",
  },
  pause: {
    section: "py-12 md:py-16",
    label:
      "mb-4 font-display text-[12px] font-bold uppercase tracking-[0.14em] text-[#1b1d1f]/40",
    type: "max-w-[15ch] text-[clamp(3rem,16.8vw,7.8rem)] leading-[0.68] md:max-w-[18ch]",
  },
  whisper: {
    section: "py-10 md:py-14",
    label:
      "mb-3 font-display text-[12px] font-bold uppercase tracking-[0.12em] text-[#1b1d1f]/35 md:text-right",
    type: "max-w-[14ch] text-[clamp(2.7rem,13.2vw,6.6rem)] leading-[0.7] md:ml-auto md:max-w-[16ch] md:text-right",
  },
  accent: {
    section: "py-10 md:py-12",
    label:
      "mb-3 font-display text-[12px] font-bold uppercase tracking-[0.14em] text-[#b91c1c]/70",
    type: "max-w-[16ch] text-[clamp(3rem,15.6vw,7.2rem)] leading-[0.67]",
  },
};

/** Category feeds and legacy `Interstitial` (`size="default"`). */
export const INTERLUDE_FEED_TYPOGRAPHY = {
  type: "max-w-[14ch] text-[clamp(3.3rem,14.4vw,10.08rem)] leading-[0.62] md:max-w-none",
  editorialThoughtMax: "max-w-[18ch] md:max-w-[22ch]",
} as const;
