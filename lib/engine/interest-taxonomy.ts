/**
 * DRV247 user interest labels — must match the Titanium app filter UI exactly.
 *
 * Verified by Chris, 20 Oct 2026 (app product strings). Legacy typo **Tunning**
 * in URLs/DB aliases to **Tuning**.
 */
export const DRV247_USER_INTERESTS = [
  "4x4",
  "Aircooled",
  "Camper/Bus",
  "Classic",
  "Drifting",
  "Electric",
  "Hot Rod",
  "JDM",
  "Lightweight",
  "Luxury",
  "Modern",
  "Modified",
  "Motorsport",
  "Muscle",
  "OEM+",
  "Performance",
  "Restoration",
  "Sports Cars",
  "Styling",
  "Supercars",
  "Track",
  "Tuning",
  "VAG",
] as const;

export type UserInterest = (typeof DRV247_USER_INTERESTS)[number];

/** Filter UI + ingest persistence target list (product labels only). */
export const INTEREST_TAXONOMY = DRV247_USER_INTERESTS;

export type Interest = UserInterest;

const USER_INTEREST_SET = new Set<string>(DRV247_USER_INTERESTS);

/**
 * Legacy editorial / URL / API tokens → product display string.
 * Editorial-only tags are folded into the nearest product interest for matching.
 */
export const INTEREST_ALIASES: Record<string, UserInterest> = {
  // Product spelling variants
  aircooled: "Aircooled",
  "air-cooled": "Aircooled",
  "air cooled": "Aircooled",
  tuning: "Tuning",
  tunning: "Tuning",
  "camper/bus": "Camper/Bus",
  camper: "Camper/Bus",
  "oem+": "OEM+",
  "oem plus": "OEM+",
  "4x4": "4x4",
  // Editorial plural / alternate classic
  classics: "Classic",
  // Editorial-only → product
  "collector cars": "Classic",
  collector: "Classic",
  collecting: "Classic",
  "modern classics": "Modern",
  "automotive design": "Styling",
  design: "Styling",
  "car culture": "Styling",
  culture: "Styling",
  detailing: "Styling",
  photography: "Styling",
  "road trip": "Camper/Bus",
  "road trips": "Camper/Bus",
  roadtrips: "Camper/Bus",
  events: "Motorsport",
  engineering: "OEM+",
  euro: "VAG",
  american: "Muscle",
  rally: "Motorsport",
  "drag racing": "Motorsport",
  drift: "Drifting",
  drifting: "Drifting",
  "engine swap": "Modified",
  "engine swaps": "Modified",
  // snake_case API
  sports_cars: "Sports Cars",
  car_culture: "Styling",
  road_trips: "Camper/Bus",
  drag_racing: "Motorsport",
  air_cooled: "Aircooled",
  hot_rod: "Hot Rod",
  // Normalized keys (normKey lowercases)
  classic: "Classic",
  performance: "Performance",
  modified: "Modified",
  motorsport: "Motorsport",
  jdm: "JDM",
  restoration: "Restoration",
  track: "Track",
  supercars: "Supercars",
  styling: "Styling",
  muscle: "Muscle",
  luxury: "Luxury",
  modern: "Modern",
  lightweight: "Lightweight",
  electric: "Electric",
  vag: "VAG",
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
