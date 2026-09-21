export type EditorialInterludeType =
  | "STATEMENT"
  | "PROVOCATION"
  | "OBSERVATION"
  | "TRANSITION"
  | "EDITORIAL_THOUGHT"
  | "SHORT_PUNCH";

export type EditorialInterludePlacement =
  | "home-before-categories"
  | "category-feed"
  | "story-feed";

export type EditorialInterlude = {
  id: string;
  text: string;
  type: EditorialInterludeType;
  categories?: string[];
  tags?: string[];
  marques?: string[];
  tone?: string;
  priority: number;
  active: boolean;
  imageUrl?: string;
  background?: string;
  placement?: EditorialInterludePlacement[];
};

export {
  EDITORIAL_INTERLUDE_CATEGORIES,
  EDITORIAL_INTERLUDE_TAGS,
  EDITORIAL_VOICE_LIBRARY,
  EDITORIAL_VOICE_SEED_IDS,
  editorialInterludeTypeBreakdown,
  interludesForCategory,
  interludesForTag,
} from "./editorial-voice-library";
export type {
  EditorialInterludeCategory,
  EditorialInterludeTag,
} from "./editorial-voice-library";

import { EDITORIAL_VOICE_LIBRARY } from "./editorial-voice-library";

/** Full curated voice library — seed lines remain first. */
export const EDITORIAL_INTERLUDES = EDITORIAL_VOICE_LIBRARY;

/** Static homepage slots — no dynamic selection in this pass. */
export const HOMEPAGE_INTERLUDE_SLOTS = {
  "before-categories": "truth-shall-set-you-free",
} as const satisfies Record<string, string>;

export type HomepageInterludeSlot = keyof typeof HOMEPAGE_INTERLUDE_SLOTS;

const interludeById = new Map(EDITORIAL_INTERLUDES.map((item) => [item.id, item]));

export function getEditorialInterlude(id: string): EditorialInterlude | undefined {
  return interludeById.get(id);
}

export function listActiveEditorialInterludes(): EditorialInterlude[] {
  return EDITORIAL_INTERLUDES.filter((item) => item.active).sort(
    (a, b) => b.priority - a.priority,
  );
}

export function interludeForHomepageSlot(
  slot: HomepageInterludeSlot,
): EditorialInterlude | undefined {
  const id = HOMEPAGE_INTERLUDE_SLOTS[slot];
  const interlude = getEditorialInterlude(id);
  return interlude?.active ? interlude : undefined;
}

export function interludeFromText(text: string): EditorialInterlude {
  const match = EDITORIAL_INTERLUDES.find(
    (item) => item.text.toUpperCase() === text.trim().toUpperCase(),
  );
  if (match) return match;
  return {
    id: "inline",
    text: text.trim(),
    type: "STATEMENT",
    priority: 0,
    active: true,
  };
}
