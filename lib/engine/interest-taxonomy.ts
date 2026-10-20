/**
 * DRV247 user interest labels — shared with the Titanium app filter UI and backend.
 *
 * Product source of truth is normally `com.fizix.driveclub` in `~/Documents/DriveClub_R296`
 * (not available on cloud agents). This list is derived from in-repo product briefs
 * (`editorial-metadata-brief`, For You profile copy) until that constants file is linked.
 */
export const DRV247_USER_INTERESTS = [
  "Air-cooled",
  "American",
  "Automotive Design",
  "Car Culture",
  "Classics",
  "Collecting",
  "Detailing",
  "Drag Racing",
  "Drift",
  "Engineering",
  "Euro",
  "Events",
  "JDM",
  "Modern Classics",
  "Modified",
  "Motorsport",
  "Performance",
  "Photography",
  "Rally",
  "Restoration",
  "Road Trips",
  "Sports Cars",
  "Supercars",
  "Track",
  "Tuning",
] as const;

export type UserInterest = (typeof DRV247_USER_INTERESTS)[number];

/** Editorial ingest + filter catalog. Same strings as product; legacy DB values normalize via aliases. */
export const INTEREST_TAXONOMY = DRV247_USER_INTERESTS;

export type Interest = UserInterest;

const USER_INTEREST_SET = new Set<string>(DRV247_USER_INTERESTS);

/**
 * Maps legacy editorial strings, URL params, API snake_case, and product synonyms
 * to {@link DRV247_USER_INTERESTS} display labels.
 */
export const INTEREST_ALIASES: Record<string, UserInterest | string> = {
  classic: "Classics",
  classics: "Classics",
  "collector cars": "Collecting",
  collector: "Collecting",
  collecting: "Collecting",
  design: "Automotive Design",
  "automotive design": "Automotive Design",
  "car culture": "Car Culture",
  culture: "Car Culture",
  "road trip": "Road Trips",
  "road trips": "Road Trips",
  roadtrips: "Road Trips",
  "drag racing": "Drag Racing",
  "engine swaps": "Modified",
  "engine swap": "Modified",
  "modern classics": "Modern Classics",
  "sports cars": "Sports Cars",
  "air-cooled": "Air-cooled",
  "air cooled": "Air-cooled",
  aircooled: "Air-cooled",
  performance: "Performance",
  modified: "Modified",
  motorsport: "Motorsport",
  jdm: "JDM",
  tuning: "Tuning",
  restoration: "Restoration",
  detailing: "Detailing",
  photography: "Photography",
  events: "Events",
  engineering: "Engineering",
  euro: "Euro",
  american: "American",
  rally: "Rally",
  drift: "Drift",
  track: "Track",
  supercars: "Supercars",
  // snake_case (editorial taxonomy doc / API)
  sports_cars: "Sports Cars",
  car_culture: "Car Culture",
  road_trips: "Road Trips",
  drag_racing: "Drag Racing",
};

function normKey(value: string) {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

/** Normalize any interest token to the canonical product display string when known. */
export function canonicalInterest(value: string): string {
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (!trimmed) return trimmed;
  if (USER_INTEREST_SET.has(trimmed)) return trimmed;
  const alias = INTEREST_ALIASES[normKey(trimmed)];
  if (alias) return alias;
  return trimmed;
}

export function isKnownInterest(value: string): value is Interest {
  return USER_INTEREST_SET.has(canonicalInterest(value));
}

/** Dedupe and normalize interest rows for persistence / API output. */
export function normalizeInterestList(values: string[]): Interest[] {
  const out: Interest[] = [];
  const seen = new Set<string>();
  for (const raw of values) {
    const canonical = canonicalInterest(raw);
    if (!USER_INTEREST_SET.has(canonical)) continue;
    const key = normKey(canonical);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(canonical as Interest);
  }
  return out;
}
