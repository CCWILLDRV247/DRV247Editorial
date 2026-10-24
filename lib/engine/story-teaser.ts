/** `/story/[id]` teaser type and excerpt — existing copy only, never a new summary. */

export const STORY_TEASER_RELEVANCE_HINT = "Relevance — not a quality rating";

export const STORY_TEASER = {
  copy: "px-5 pt-6 sm:px-7 md:px-8 md:pt-8 lg:px-0 lg:max-w-3xl",
  community: "mb-3 text-[12px] font-medium uppercase tracking-[0.06em] text-[#1b1d1f]/45",
  meta: "text-[13px] leading-5 text-[#1b1d1f]/55",
  headline:
    "mt-3 break-words font-display text-[clamp(2.75rem,9vw,5rem)] font-black uppercase leading-[0.62] tracking-[-0.02em] text-[#1b1d1f] lg:text-[clamp(2.75rem,5vw,4rem)]",
  excerpt: "mt-4 text-[17px] leading-[1.5] text-[#1b1d1f]",
  deskNote: "mt-4 text-[16px] leading-[1.5] text-[#1b1d1f]/80",
  toolbar: "flex w-full min-w-0 items-center justify-between gap-2",
  pills: "flex shrink-0 items-center gap-2",
  icons: "flex shrink-0 items-center",
  toolPill:
    "inline-flex h-11 min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-[#1b1d1f] bg-white px-3 text-[13px] font-medium leading-none text-[#1b1d1f] touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1b1d1f]",
  toolPillOn:
    "inline-flex h-11 min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border-2 border-[#1b1d1f] bg-white px-3 text-[13px] font-medium leading-none text-[#1b1d1f] touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1b1d1f]",
  toolIcon:
    "inline-flex size-11 min-h-11 min-w-11 shrink-0 items-center justify-center bg-transparent text-[#1b1d1f] touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1b1d1f]",
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
