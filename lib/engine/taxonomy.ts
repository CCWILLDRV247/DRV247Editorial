import {
  CONTENT_PRIMARY_SLUGS,
  type ContentPrimary,
} from "../../config/magazine-nav";

export const PRIMARY_PRIORITY: readonly ContentPrimary[] = [
  "events",
  "motorsport",
  "driving",
  "culture",
  "cars",
];

export const CULTURE_PUBLICATIONS = new Set([
  "bonnet magazine",
  "bonnet",
  "the road rat",
  "magneto",
  "the intercooler",
  "ramp",
  "auto & design",
  "octane",
  "classic driver",
]);

/** Detailed editorial categories stay in the DB; these map them into one primary. */
export const SECONDARY_TO_PRIMARY: Record<string, ContentPrimary> = {
  "New Cars": "cars",
  Classics: "cars",
  Classic: "cars",
  Collector: "cars",
  Performance: "cars",
  Modified: "cars",
  Restoration: "cars",
  Buying: "cars",
  Market: "cars",
  Engineering: "cars",
  Technology: "cars",
  "Car Culture": "culture",
  Design: "culture",
  Lifestyle: "culture",
  People: "culture",
  Interviews: "culture",
  History: "culture",
  Photography: "culture",
  Art: "culture",
  Fashion: "culture",
  Architecture: "culture",
  Features: "culture",
  "Road Trips": "driving",
  Driving: "driving",
  Experiences: "driving",
  Touring: "driving",
  Roads: "driving",
  Travel: "driving",
  "Owner Stories": "driving",
  Motorsport: "motorsport",
  Racing: "motorsport",
  Competition: "motorsport",
  Track: "motorsport",
  "Historic Racing": "motorsport",
  Drivers: "motorsport",
  Teams: "motorsport",
  Championships: "motorsport",
  Events: "events",
  Shows: "events",
  Meets: "events",
  Concours: "events",
  Concourse: "events",
  Auctions: "events",
  "Motorsport Events": "events",
  Launches: "events",
  Gatherings: "events",
};

export const INTEREST_TO_PRIMARY: Record<string, ContentPrimary> = {
  Classic: "cars",
  Performance: "cars",
  "Sports Cars": "cars",
  Supercars: "cars",
  "Modern Classics": "cars",
  Modified: "cars",
  Tuning: "cars",
  Restoration: "cars",
  "Collector Cars": "cars",
  Collecting: "cars",
  Detailing: "cars",
  "Engine Swaps": "cars",
  JDM: "culture",
  Euro: "culture",
  American: "culture",
  Motorsport: "motorsport",
  Rally: "motorsport",
  Drift: "motorsport",
  "Drag Racing": "motorsport",
  Track: "motorsport",
  Design: "culture",
  "Automotive Design": "culture",
  "Car Culture": "culture",
  Photography: "culture",
  "Road Trips": "driving",
  Events: "events",
};

export const SECONDARY_TAXONOMY: { slug: string; name: string; primary: ContentPrimary }[] = [
  { slug: "new-cars", name: "New Cars", primary: "cars" },
  { slug: "classic", name: "Classic", primary: "cars" },
  { slug: "collector", name: "Collector", primary: "cars" },
  { slug: "performance", name: "Performance", primary: "cars" },
  { slug: "modified", name: "Modified", primary: "cars" },
  { slug: "restoration", name: "Restoration", primary: "cars" },
  { slug: "buying", name: "Buying", primary: "cars" },
  { slug: "market", name: "Market", primary: "cars" },
  { slug: "engineering", name: "Engineering", primary: "cars" },
  { slug: "technology", name: "Technology", primary: "cars" },
  { slug: "car-culture", name: "Car Culture", primary: "culture" },
  { slug: "design", name: "Design", primary: "culture" },
  { slug: "lifestyle", name: "Lifestyle", primary: "culture" },
  { slug: "people", name: "People", primary: "culture" },
  { slug: "interviews", name: "Interviews", primary: "culture" },
  { slug: "history", name: "History", primary: "culture" },
  { slug: "photography", name: "Photography", primary: "culture" },
  { slug: "art", name: "Art", primary: "culture" },
  { slug: "fashion", name: "Fashion", primary: "culture" },
  { slug: "architecture", name: "Architecture", primary: "culture" },
  { slug: "features", name: "Features", primary: "culture" },
  { slug: "road-trips", name: "Road Trips", primary: "driving" },
  { slug: "driving", name: "Driving", primary: "driving" },
  { slug: "experiences", name: "Experiences", primary: "driving" },
  { slug: "touring", name: "Touring", primary: "driving" },
  { slug: "roads", name: "Roads", primary: "driving" },
  { slug: "travel", name: "Travel", primary: "driving" },
  { slug: "owner-stories", name: "Owner Stories", primary: "driving" },
  { slug: "motorsport", name: "Motorsport", primary: "motorsport" },
  { slug: "racing", name: "Racing", primary: "motorsport" },
  { slug: "competition", name: "Competition", primary: "motorsport" },
  { slug: "track", name: "Track", primary: "motorsport" },
  { slug: "historic-racing", name: "Historic Racing", primary: "motorsport" },
  { slug: "drivers", name: "Drivers", primary: "motorsport" },
  { slug: "teams", name: "Teams", primary: "motorsport" },
  { slug: "championships", name: "Championships", primary: "motorsport" },
  { slug: "events", name: "Events", primary: "events" },
  { slug: "shows", name: "Shows", primary: "events" },
  { slug: "meets", name: "Meets", primary: "events" },
  { slug: "concours", name: "Concours", primary: "events" },
  { slug: "auctions", name: "Auctions", primary: "events" },
  { slug: "motorsport-events", name: "Motorsport Events", primary: "events" },
  { slug: "launches", name: "Launches", primary: "events" },
  { slug: "gatherings", name: "Gatherings", primary: "events" },
];

export const PRIMARY_META: {
  slug: ContentPrimary;
  name: string;
  description: string;
  sortOrder: number;
}[] = [
  { slug: "cars", name: "Cars", description: "The cars themselves — new, classic, modified, market.", sortOrder: 1 },
  { slug: "culture", name: "Culture", description: "Design, people, history, and automotive culture.", sortOrder: 2 },
  { slug: "driving", name: "Driving", description: "Road trips, touring, and owner experiences.", sortOrder: 3 },
  { slug: "motorsport", name: "Motorsport", description: "Racing, historic competition, drivers, and teams.", sortOrder: 4 },
  { slug: "events", name: "Events", description: "Shows, concours, auctions, and gatherings.", sortOrder: 5 },
];

const EVENT_KEYWORDS = [
  "concours",
  "concourse",
  "auction",
  "car show",
  "motor show",
  "goodwood revival",
  "villa d'este",
  "retromobile",
  "amelia island",
  "gathering",
  "meet ",
  "meets",
];

const MOTORSPORT_KEYWORDS = [
  "motorsport",
  "grand prix",
  "formula 1",
  "formula one",
  "championship",
  "rally",
  "le mans",
  "historic racing",
  "racing history",
  "grid ",
  " race ",
  "races",
  "racing",
];

const DRIVING_KEYWORDS = [
  "road trip",
  "road-trip",
  "touring",
  "stelvio",
  "alpine pass",
  "owner stor",
  "at the wheel",
  "behind the wheel",
  "best roads",
  "drive across",
];

const CULTURE_KEYWORDS = [
  "designer",
  "designers",
  "design story",
  "lifestyle",
  "photography",
  "photographer",
  "interview",
  "architecture",
  "fashion",
  "car culture",
  "building a",
];

const CARS_KEYWORDS = [
  "restoration",
  "restomod",
  "for sale",
  "buyer's",
  "buyers guide",
  "market",
  "unveils",
  "new model",
  "road car",
  "analogue",
];

export type ClassifyInput = {
  title: string;
  excerpt?: string;
  publication?: string;
  categories?: string[];
  interests?: string[];
  contentTypes?: string[];
  scenes?: string[];
};

function haystack(input: ClassifyInput) {
  return [
    input.title,
    input.excerpt,
    input.publication,
    ...(input.categories ?? []),
    ...(input.interests ?? []),
    ...(input.contentTypes ?? []),
    ...(input.scenes ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function keywordHits(text: string, needles: string[]) {
  return needles.reduce((count, needle) => (text.includes(needle) ? count + 1 : count), 0);
}

const BUILD_SCENES = new Set(["JDM", "Drift", "Stance", "Tuning", "Restomod", "Underground"]);

export function classifyPrimaryDetailed(input: ClassifyInput): {
  primary: ContentPrimary;
  confidence: number;
  scores: Record<ContentPrimary, number>;
} {
  const scores: Record<ContentPrimary, number> = {
    events: 0,
    motorsport: 0,
    driving: 0,
    culture: 0,
    cars: 0,
  };

  for (const category of input.categories ?? []) {
    if (category.toLowerCase() === "news" || category.toLowerCase() === "video") continue;
    const primary = SECONDARY_TO_PRIMARY[category];
    if (primary) scores[primary] += 4;
  }
  for (const interest of input.interests ?? []) {
    const primary = INTEREST_TO_PRIMARY[interest];
    if (primary) scores[primary] += 2;
  }

  const text = haystack(input);
  scores.events += keywordHits(text, EVENT_KEYWORDS) * 3;
  scores.motorsport += keywordHits(text, MOTORSPORT_KEYWORDS) * 3;
  scores.driving += keywordHits(text, DRIVING_KEYWORDS) * 3;
  scores.culture += keywordHits(text, CULTURE_KEYWORDS) * 2;
  scores.cars += keywordHits(text, CARS_KEYWORDS) * 2;

  const hasBuild = (input.contentTypes ?? []).includes("Build");
  const sceneHit = (input.scenes ?? []).some((scene) => BUILD_SCENES.has(scene));
  if (hasBuild && sceneHit) scores.culture += 8;
  else if (hasBuild) scores.cars += 3;

  const pub = (input.publication ?? "").toLowerCase().trim();
  if (
    CULTURE_PUBLICATIONS.has(pub) &&
    scores.events < 3 &&
    scores.motorsport < 3 &&
    scores.driving < 3
  ) {
    scores.culture += 2;
  }

  let best: ContentPrimary = "culture";
  let bestScore = -1;
  for (const slug of PRIMARY_PRIORITY) {
    if (scores[slug] > bestScore) {
      best = slug;
      bestScore = scores[slug];
    }
  }
  if (bestScore <= 0) {
    return { primary: "culture", confidence: 50, scores };
  }
  const sorted = Object.values(scores).sort((a, b) => b - a);
  const lead = sorted[0] ?? 0;
  const runner = sorted[1] ?? 0;
  const confidence = Math.max(55, Math.min(95, 58 + lead * 3 + Math.max(0, lead - runner) * 2));
  return { primary: best, confidence, scores };
}

export function classifyPrimary(input: ClassifyInput): ContentPrimary {
  return classifyPrimaryDetailed(input).primary;
}

export function isContentPrimary(value: string): value is ContentPrimary {
  return (CONTENT_PRIMARY_SLUGS as readonly string[]).includes(value);
}

export function secondariesForPrimary(primary: ContentPrimary) {
  return SECONDARY_TAXONOMY.filter((item) => item.primary === primary).map((item) => item.name);
}
