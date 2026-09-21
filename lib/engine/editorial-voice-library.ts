import type { ContentPrimary } from "../../config/magazine-nav";
import type { EditorialInterlude, EditorialInterludeType } from "./editorial-interlude";

/** Primary categories — same slugs as magazine nav / content primaries. */
export const EDITORIAL_INTERLUDE_CATEGORIES = [
  "cars",
  "culture",
  "driving",
  "events",
  "motorsport",
] as const satisfies readonly ContentPrimary[];

/** Interest and editorial tags drawn from existing personalisation vocabulary. */
export const EDITORIAL_INTERLUDE_TAGS = [
  "Classic",
  "Performance",
  "Air-cooled",
  "JDM",
  "Modified",
  "Motorsport",
  "Road Trips",
  "design",
  "collecting",
  "restoration",
  "craftsmanship",
  "garage",
  "ownership",
  "nostalgia",
  "events",
] as const;

export type EditorialInterludeCategory = (typeof EDITORIAL_INTERLUDE_CATEGORIES)[number];
export type EditorialInterludeTag = (typeof EDITORIAL_INTERLUDE_TAGS)[number];

/**
 * Tagging logic (library pass):
 * - `categories` — primary nav lens when a line clearly belongs to Cars / Culture / Driving / Events / Motorsport
 * - `tags` — interest/editorial hooks from existing taxonomy (Classic, JDM, garage, etc.)
 * - `marques` — only when the copy is genuinely marque-specific (kept rare)
 * - untagged entries are deliberate broad lines usable across the desk
 */
export const EDITORIAL_VOICE_LIBRARY: EditorialInterlude[] = [
  // —— Seed set (Task 1) — preserved verbatim, first entries ——
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
    tags: ["Classic", "ownership"],
    categories: ["culture"],
  },
  {
    id: "how-much-power-too-much",
    text: "HOW MUCH POWER IS TOO MUCH?",
    type: "PROVOCATION",
    tone: "provocative",
    priority: 75,
    active: true,
    tags: ["Performance", "Motorsport"],
    categories: ["motorsport"],
  },
  {
    id: "best-builds-never-finished",
    text: "THE BEST BUILDS ARE NEVER FINISHED.",
    type: "OBSERVATION",
    tone: "knowing",
    priority: 70,
    active: true,
    tags: ["Modified", "garage"],
    categories: ["cars"],
  },
  {
    id: "garage-to-grid",
    text: "FROM THE GARAGE TO THE GRID.",
    type: "TRANSITION",
    tone: "kinetic",
    priority: 65,
    active: true,
    categories: ["driving", "motorsport"],
    tags: ["Motorsport", "garage"],
  },
  {
    id: "more-louder-faster",
    text: "MORE. LOUDER. FASTER.",
    type: "SHORT_PUNCH",
    tone: "bold",
    priority: 60,
    active: true,
    tags: ["Performance"],
    categories: ["motorsport"],
  },
  {
    id: "built-to-be-remembered",
    text: "SOME CARS ARE BUILT TO BE DRIVEN. OTHERS ARE BUILT TO BE REMEMBERED.",
    type: "EDITORIAL_THOUGHT",
    tone: "reflective",
    priority: 55,
    active: true,
    categories: ["culture", "cars"],
    tags: ["collecting", "Classic"],
  },

  // —— STATEMENT ——
  {
    id: "no-permission-to-care",
    text: "YOU DO NOT NEED PERMISSION TO CARE ABOUT CARS.",
    type: "STATEMENT",
    tone: "assured",
    priority: 54,
    active: true,
    tags: ["ownership"],
  },
  {
    id: "desk-never-neutral",
    text: "THE DESK IS NEVER NEUTRAL.",
    type: "STATEMENT",
    tone: "editorial",
    priority: 53,
    active: true,
  },
  {
    id: "good-taste-motoring-skill",
    text: "GOOD TASTE IS A MOTORING SKILL.",
    type: "STATEMENT",
    tone: "knowing",
    priority: 52,
    active: true,
    categories: ["culture"],
    tags: ["design"],
  },
  {
    id: "read-world-through-wheels",
    text: "WE READ THE WORLD THROUGH WHEELS.",
    type: "STATEMENT",
    tone: "curious",
    priority: 51,
    active: true,
    categories: ["culture", "driving"],
  },
  {
    id: "if-it-moves-you",
    text: "IF IT MOVES YOU, IT COUNTS.",
    type: "STATEMENT",
    tone: "open",
    priority: 50,
    active: true,
    tags: ["ownership"],
  },

  // —— OBSERVATION ——
  {
    id: "patina-better-story",
    text: "PATINA TELLS A BETTER STORY THAN A RESPRAY.",
    type: "OBSERVATION",
    tone: "warm",
    priority: 49,
    active: true,
    categories: ["cars", "culture"],
    tags: ["Classic", "restoration"],
  },
  {
    id: "long-journey-feels-short",
    text: "THE RIGHT CAR MAKES A LONG JOURNEY FEEL SHORT.",
    type: "OBSERVATION",
    tone: "lyrical",
    priority: 48,
    active: true,
    categories: ["driving"],
    tags: ["Road Trips"],
  },
  {
    id: "naming-colour-art",
    text: "NAMING A COLOUR IS AN UNDERRATED ART FORM.",
    type: "OBSERVATION",
    tone: "dry",
    priority: 47,
    active: true,
    categories: ["culture", "cars"],
    tags: ["design"],
  },
  {
    id: "garage-chair-unused",
    text: "EVERY GARAGE HAS A CHAIR THAT NEVER GETS USED.",
    type: "OBSERVATION",
    tone: "knowing",
    priority: 46,
    active: true,
    tags: ["garage", "ownership"],
    categories: ["cars"],
  },
  {
    id: "restoring-archaeology-therapy",
    text: "RESTORING A CAR IS PART ARCHAEOLOGY, PART THERAPY.",
    type: "OBSERVATION",
    tone: "reflective",
    priority: 45,
    active: true,
    tags: ["restoration", "craftsmanship"],
    categories: ["cars"],
  },
  {
    id: "miles-or-stories",
    text: "SOME PEOPLE COLLECT MILES. OTHERS COLLECT STORIES.",
    type: "OBSERVATION",
    tone: "balanced",
    priority: 44,
    active: true,
    tags: ["collecting", "Road Trips"],
    categories: ["driving", "culture"],
  },
  {
    id: "flat-six-has-opinions",
    text: "THE FLAT-SIX HAS OPINIONS.",
    type: "OBSERVATION",
    tone: "dry",
    priority: 43,
    active: true,
    tags: ["Air-cooled"],
    marques: ["Porsche"],
    categories: ["cars"],
  },
  {
    id: "concours-quietest-argument",
    text: "A CONCOURS LAWN IS THE QUIETEST ARGUMENT IN MOTORING.",
    type: "OBSERVATION",
    tone: "wry",
    priority: 42,
    active: true,
    categories: ["events", "culture"],
    tags: ["collecting", "Classic"],
  },

  // —— PROVOCATION ——
  {
    id: "restomod-compliment-or-crime",
    text: "IS RESTOMOD A COMPLIMENT OR A CRIME?",
    type: "PROVOCATION",
    tone: "debating",
    priority: 41,
    active: true,
    tags: ["Modified", "Classic"],
    categories: ["cars"],
  },
  {
    id: "practical-become-insult",
    text: "WHEN DID 'PRACTICAL' BECOME AN INSULT?",
    type: "PROVOCATION",
    tone: "sharp",
    priority: 40,
    active: true,
    categories: ["cars", "culture"],
    tags: ["design"],
  },
  {
    id: "buy-to-keep",
    text: "DOES ANYONE STILL BUY A CAR TO KEEP IT?",
    type: "PROVOCATION",
    tone: "questioning",
    priority: 39,
    active: true,
    tags: ["ownership", "collecting"],
    categories: ["culture"],
  },
  {
    id: "too-much-brake-dust",
    text: "WHAT COUNTS AS TOO MUCH BRAKE DUST?",
    type: "PROVOCATION",
    tone: "dry",
    priority: 38,
    active: true,
    tags: ["Performance"],
    categories: ["motorsport", "driving"],
  },
  {
    id: "driving-less-talking-more",
    text: "ARE WE DRIVING LESS, OR JUST TALKING MORE?",
    type: "PROVOCATION",
    tone: "skeptical",
    priority: 37,
    active: true,
    categories: ["driving", "culture"],
  },
  {
    id: "manual-still-matters",
    text: "IF YOU CAN STILL ROW YOUR OWN GEARS, SHOULD YOU?",
    type: "PROVOCATION",
    tone: "provocative",
    priority: 36,
    active: true,
    categories: ["driving"],
    tags: ["Performance"],
  },

  // —— TRANSITION ——
  {
    id: "workshop-to-weekend",
    text: "FROM THE WORKSHOP TO THE WEEKEND.",
    type: "TRANSITION",
    tone: "kinetic",
    priority: 35,
    active: true,
    tags: ["garage"],
    categories: ["cars", "driving"],
  },
  {
    id: "catalogue-to-open-road",
    text: "FROM THE AUCTION CATALOGUE TO THE OPEN ROAD.",
    type: "TRANSITION",
    tone: "aspirational",
    priority: 34,
    active: true,
    categories: ["events", "driving"],
    tags: ["collecting", "Road Trips"],
  },
  {
    id: "blueprint-to-burnout",
    text: "FROM BLUEPRINT TO BURNOUT.",
    type: "TRANSITION",
    tone: "bold",
    priority: 33,
    active: true,
    categories: ["cars"],
    tags: ["craftsmanship", "Modified"],
  },
  {
    id: "before-flag-after-formation",
    text: "BEFORE THE FLAG, AFTER THE FORMATION LAP.",
    type: "TRANSITION",
    tone: "tense",
    priority: 32,
    active: true,
    categories: ["motorsport", "events"],
    tags: ["Motorsport"],
  },

  // —— SHORT_PUNCH ——
  {
    id: "still-not-for-sale",
    text: "STILL NOT FOR SALE.",
    type: "SHORT_PUNCH",
    tone: "defiant",
    priority: 31,
    active: true,
    tags: ["ownership", "collecting"],
  },
  {
    id: "keys-map-go",
    text: "KEYS. MAP. GO.",
    type: "SHORT_PUNCH",
    tone: "direct",
    priority: 30,
    active: true,
    categories: ["driving"],
    tags: ["Road Trips"],
  },
  {
    id: "choose-long-way",
    text: "CHOOSE THE LONG WAY.",
    type: "SHORT_PUNCH",
    tone: "confident",
    priority: 29,
    active: true,
    categories: ["driving"],
    tags: ["Road Trips"],
  },
  {
    id: "glance-back-keep-going",
    text: "GLANCE BACK. KEEP GOING.",
    type: "SHORT_PUNCH",
    tone: "kinetic",
    priority: 28,
    active: true,
    categories: ["driving", "motorsport"],
  },

  // —— EDITORIAL_THOUGHT ——
  {
    id: "museum-or-lifeline",
    text: "A CAR CAN BE A MUSEUM PIECE. OR A LIFELINE. RARELY BOTH.",
    type: "EDITORIAL_THOUGHT",
    tone: "reflective",
    priority: 27,
    active: true,
    categories: ["culture", "cars"],
    tags: ["collecting", "ownership"],
  },
  {
    id: "design-dates-engineering-endures",
    text: "DESIGN DATES. ENGINEERING ENDURES. TASTE DECIDES WHICH YOU NOTICE.",
    type: "EDITORIAL_THOUGHT",
    tone: "measured",
    priority: 26,
    active: true,
    categories: ["culture", "cars"],
    tags: ["design", "craftsmanship"],
  },
  {
    id: "meet-still-talk-about",
    text: "THE BEST MEET IS THE ONE YOU STILL TALK ABOUT IN NOVEMBER.",
    type: "EDITORIAL_THOUGHT",
    tone: "warm",
    priority: 25,
    active: true,
    categories: ["events", "culture"],
    tags: ["events", "nostalgia"],
  },
  {
    id: "trim-code-vs-drive",
    text: "NOBODY REMEMBERS THE INTERIOR TRIM CODE. EVERYONE REMEMBERS THE DRIVE.",
    type: "EDITORIAL_THOUGHT",
    tone: "knowing",
    priority: 24,
    active: true,
    categories: ["driving", "culture"],
    tags: ["ownership"],
  },
  {
    id: "collecting-not-hoarding",
    text: "COLLECTING IS NOT HOARDING WHEN THE STORIES ARE WORTH KEEPING.",
    type: "EDITORIAL_THOUGHT",
    tone: "assured",
    priority: 23,
    active: true,
    tags: ["collecting", "Classic"],
    categories: ["culture"],
  },
  {
    id: "road-opinions-memories",
    text: "THE ROAD IS WHERE OPINIONS BECOME MEMORIES.",
    type: "EDITORIAL_THOUGHT",
    tone: "reflective",
    priority: 22,
    active: true,
    categories: ["driving"],
    tags: ["Road Trips", "ownership"],
  },
];

export const EDITORIAL_VOICE_SEED_IDS = [
  "truth-shall-set-you-free",
  "some-cars-under-your-skin",
  "how-much-power-too-much",
  "best-builds-never-finished",
  "garage-to-grid",
  "more-louder-faster",
  "built-to-be-remembered",
] as const;

export function editorialInterludeTypeBreakdown(
  library: EditorialInterlude[] = EDITORIAL_VOICE_LIBRARY,
): Record<EditorialInterludeType, number> {
  const counts: Record<EditorialInterludeType, number> = {
    STATEMENT: 0,
    OBSERVATION: 0,
    PROVOCATION: 0,
    TRANSITION: 0,
    EDITORIAL_THOUGHT: 0,
    SHORT_PUNCH: 0,
  };
  for (const item of library) {
    if (item.active) counts[item.type] += 1;
  }
  return counts;
}

export function interludesForCategory(
  category: EditorialInterludeCategory,
  library: EditorialInterlude[] = EDITORIAL_VOICE_LIBRARY,
): EditorialInterlude[] {
  return library.filter(
    (item) => item.active && (item.categories?.includes(category) || !item.categories?.length),
  );
}

export function interludesForTag(
  tag: string,
  library: EditorialInterlude[] = EDITORIAL_VOICE_LIBRARY,
): EditorialInterlude[] {
  const key = tag.toLowerCase();
  return library.filter(
    (item) =>
      item.active &&
      item.tags?.some((candidate) => candidate.toLowerCase() === key),
  );
}
