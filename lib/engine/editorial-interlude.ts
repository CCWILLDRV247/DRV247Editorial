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

/** Curated seed set — first entry is the existing homepage truth line. */
export const EDITORIAL_INTERLUDES: EditorialInterlude[] = [
  {
    id: "truth-shall-set-you-free",
    text: "THE TRUTH SHALL SET YOU FREE",
    type: "STATEMENT",
    tone: "confident",
    priority: 100,
    active: true,
    placement: ["home-before-categories"],
  },
  {
    id: "some-cars-under-your-skin",
    text: "SOME CARS JUST GET UNDER YOUR SKIN.",
    type: "OBSERVATION",
    tone: "warm",
    priority: 80,
    active: true,
    tags: ["culture", "classic"],
  },
  {
    id: "how-much-power-too-much",
    text: "HOW MUCH POWER IS TOO MUCH?",
    type: "PROVOCATION",
    tone: "provocative",
    priority: 75,
    active: true,
    tags: ["performance", "motorsport"],
  },
  {
    id: "best-builds-never-finished",
    text: "THE BEST BUILDS ARE NEVER FINISHED.",
    type: "OBSERVATION",
    tone: "knowing",
    priority: 70,
    active: true,
    tags: ["modified", "garage"],
  },
  {
    id: "garage-to-grid",
    text: "FROM THE GARAGE TO THE GRID.",
    type: "TRANSITION",
    tone: "kinetic",
    priority: 65,
    active: true,
    categories: ["driving", "motorsport"],
  },
  {
    id: "more-louder-faster",
    text: "MORE. LOUDER. FASTER.",
    type: "SHORT_PUNCH",
    tone: "bold",
    priority: 60,
    active: true,
    tags: ["performance"],
  },
  {
    id: "built-to-be-remembered",
    text: "SOME CARS ARE BUILT TO BE DRIVEN. OTHERS ARE BUILT TO BE REMEMBERED.",
    type: "EDITORIAL_THOUGHT",
    tone: "reflective",
    priority: 55,
    active: true,
    categories: ["culture", "cars"],
  },
];

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
