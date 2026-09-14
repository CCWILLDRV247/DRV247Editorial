import { count } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { categories, sources, type SourceType } from "./schema";
import * as schema from "./schema";

type Db = BetterSQLite3Database<typeof schema>;

export const STARTING_CATEGORIES = [
  { slug: "racing", name: "Racing" },
  { slug: "classic", name: "Classic" },
  { slug: "modified", name: "Modified" },
  { slug: "concourse", name: "Concourse" },
  { slug: "culture", name: "Culture" },
  { slug: "desk", name: "Desk" },
] as const;

const SEED_SOURCES: {
  name: string;
  type: SourceType;
  identifier: string;
  categorySlug: string;
}[] = [
  {
    name: "Motorsport.com F1",
    type: "rss",
    identifier: "https://www.motorsport.com/rss/f1/news/",
    categorySlug: "racing",
  },
  {
    name: "RACER",
    type: "rss",
    identifier: "https://racer.com/feed/",
    categorySlug: "racing",
  },
  {
    name: "Hemmings",
    type: "rss",
    identifier: "https://www.hemmings.com/stories/feed/",
    categorySlug: "classic",
  },
  {
    name: "Petrolicious",
    type: "rss",
    identifier: "https://petrolicious.com/feed",
    categorySlug: "classic",
  },
  {
    name: "Speedhunters",
    type: "rss",
    identifier: "https://www.speedhunters.com/feed/",
    categorySlug: "modified",
  },
  {
    name: "Hagerty Media",
    type: "rss",
    identifier: "https://www.hagerty.com/media/feed/",
    categorySlug: "concourse",
  },
  {
    name: "Jalopnik",
    type: "rss",
    identifier: "https://jalopnik.com/rss",
    categorySlug: "culture",
  },
  {
    name: "The Drive",
    type: "rss",
    identifier: "https://www.thedrive.com/feeds/rss",
    categorySlug: "culture",
  },
  {
    name: "Goodwood Road & Racing",
    type: "youtube",
    identifier: "UCKvn9VBLAiGrUQ9X6Qd9vIw",
    categorySlug: "concourse",
  },
  {
    name: "NewsAPI — car culture",
    type: "newsapi",
    identifier: "classic cars OR restomod OR motorsport culture",
    categorySlug: "culture",
  },
];

export const CATEGORY_COPY: Record<
  string,
  { kicker: string; dek: string; blurb: string; interstitial: string }
> = {
  racing: {
    kicker: "This week's stories",
    dek: "Catch up on what's been happening out there",
    blurb:
      "Grid reports, rally notes, and the weekend's motorsport from the feeds we actually read.",
    interstitial: "IF IN DOUBT FLAT OUT",
  },
  classic: {
    kicker: "This week's stories",
    dek: "The last of the analog machines",
    blurb:
      "A hand-picked desk of barn finds, restorations, and the cars that still smell like petrol.",
    interstitial: "THEIR LAST FAST DAYS",
  },
  modified: {
    kicker: "This week's stories",
    dek: "Built, not bought",
    blurb:
      "Liberty Walk, restomods, and the shops that refuse to leave a car alone.",
    interstitial: "REDEFINED LBWK",
  },
  concourse: {
    kicker: "This week's stories",
    dek: "Catch up on what's been happening out there",
    blurb:
      "A hand-picked selection of shows, lawns, and judging days — enjoy the car, share the passion.",
    interstitial: "THE TRUTH SHALL SET YOU FREE",
  },
  culture: {
    kicker: "This week's stories",
    dek: "Cars as a way of life",
    blurb:
      "The essays, columns, and oddities that make this more than a results sheet.",
    interstitial: "DRIVE IT LIKE YOU STOLE IT",
  },
  desk: {
    kicker: "Unfiled",
    dek: "Stories waiting on a category",
    blurb: "The catch-all for feeds that haven't been assigned a desk yet.",
    interstitial: "HOLD THE FRONT PAGE",
  },
  home: {
    kicker: "This week's stories",
    dek: "Catch up on what's been happening out there",
    blurb:
      "Racing, classics, modified metal, concourse lawns, and car culture — pulled from the feeds, not rewritten.",
    interstitial: "THE TRUTH SHALL SET YOU FREE",
  },
};

export function seedIfEmpty(db: Db) {
  const [{ value }] = db.select({ value: count() }).from(categories).all();
  if (value > 0) return;

  const now = Date.now();
  db.insert(categories).values([...STARTING_CATEGORIES]).run();

  const rows = db.select().from(categories).all();
  const bySlug = new Map(rows.map((row) => [row.slug, row.id]));

  db.insert(sources)
    .values(
      SEED_SOURCES.map((source) => ({
        name: source.name,
        type: source.type,
        identifier: source.identifier,
        defaultCategoryId: bySlug.get(source.categorySlug) ?? bySlug.get("desk")!,
        enabled: true,
        lastFetchStatus: "idle" as const,
        createdAt: now,
      })),
    )
    .run();
}
