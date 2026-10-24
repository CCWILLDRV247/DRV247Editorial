/** `/story/[id]` teaser type and excerpt — existing copy only, never a new summary. */

export const STORY_TEASER_RELEVANCE_HINT = "Relevance — not a quality rating";

export const STORY_TEASER = {
  copy: "px-7 pt-6 md:px-8 md:pt-8 lg:px-0 lg:max-w-3xl",
  community: "mb-3 text-[12px] font-medium uppercase tracking-[0.06em] text-[#1b1d1f]/45",
  meta: "text-[13px] leading-5 text-[#1b1d1f]/55",
  headline:
    "mt-3 font-display text-[clamp(2rem,8.5vw,2.5rem)] font-bold leading-[1.1] tracking-[-0.02em] text-[#1b1d1f] md:text-[2.5rem] lg:text-[2.75rem] lg:leading-[1.08]",
  excerpt: "mt-4 text-[17px] leading-[1.5] text-[#1b1d1f]",
  deskNote: "mt-4 text-[16px] leading-[1.5] text-[#1b1d1f]/80",
  toolbar: "flex w-full min-w-0 items-center gap-1",
  hit: "inline-flex h-11 min-h-11 min-w-11 items-center justify-center touch-manipulation",
  toolText:
    "inline-flex h-11 min-h-11 min-w-11 items-center justify-center rounded-[5px] px-2.5 font-display text-[13px] font-extrabold uppercase leading-none text-[#1b1d1f] touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1b1d1f]",
  toolIcon:
    "inline-flex size-11 min-h-11 min-w-11 items-center justify-center rounded-[5px] text-[#1b1d1f] touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1b1d1f]",
} as const;

export function foldTeaserText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\s\u00a0]+/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function normalizeTeaserText(value: string | null | undefined): string {
  return value?.replace(/[\s\u00a0]+/g, " ").trim() ?? "";
}

export function teaserTextRepeats(left: string, right: string): boolean {
  const a = foldTeaserText(left);
  const b = foldTeaserText(right);
  return Boolean(a) && a === b;
}

/**
 * One short excerpt for the teaser. Prefer the feed summary, else the stored
 * extract. Skip either string when it repeats the title. Never invent copy.
 */
export function storyTeaserExcerpt(input: {
  title: string;
  summary?: string | null;
  aiSummary?: string | null;
}): string | null {
  const title = normalizeTeaserText(input.title);
  const summary = normalizeTeaserText(input.summary);
  const extract = normalizeTeaserText(input.aiSummary);
  if (summary && !teaserTextRepeats(summary, title)) return summary;
  if (extract && !teaserTextRepeats(extract, title) && !teaserTextRepeats(extract, summary)) {
    return extract;
  }
  return null;
}
