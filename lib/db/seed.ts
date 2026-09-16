import { count } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { categories, sources, type SourceType } from "./schema";
import * as schema from "./schema";

type Db = LibSQLDatabase<typeof schema>;

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
  replaces?: string;
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
    name: "Classic & Sports Car",
    type: "rss",
    identifier: "https://www.classicandsportscar.com/rss.xml",
    categorySlug: "classic",
    replaces: "Hemmings",
  },
  {
    name: "Petrolicious",
    type: "rss",
    identifier: "https://www.petrolicious.com/blogs/articles.atom",
    categorySlug: "classic",
  },
  {
    name: "Hot Rod",
    type: "rss",
    identifier: "https://www.hotrod.com/rss/all.xml/",
    categorySlug: "modified",
    replaces: "Speedhunters",
  },
  {
    name: "EngineLabs",
    type: "rss",
    identifier: "https://www.enginelabs.com/feed/",
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
    name: "The Truth About Cars",
    type: "rss",
    identifier: "https://www.thetruthaboutcars.com/feed/",
    categorySlug: "culture",
    replaces: "The Drive",
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
  cars: {
    kicker: "This week's stories",
    dek: "The cars themselves",
    blurb:
      "Classics, new metal, restorations, and the machines the desk keeps coming back to.",
    interstitial: "THEIR LAST FAST DAYS",
  },
  driving: {
    kicker: "This week's stories",
    dek: "Roads worth taking",
    blurb: "Tours, owner miles, and the drives that stay with you after the keys go back.",
    interstitial: "IF IN DOUBT FLAT OUT",
  },
  motorsport: {
    kicker: "This week's stories",
    dek: "Grid, rally, and historic racing",
    blurb: "Competition stories kept apart from road-car performance.",
    interstitial: "IF IN DOUBT FLAT OUT",
  },
  events: {
    kicker: "This week's stories",
    dek: "Shows, lawns, and judging days",
    blurb: "A hand-picked selection of gatherings — enjoy the car, share the passion.",
    interstitial: "THE TRUTH SHALL SET YOU FREE",
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
    blurb: "A personalised mix for your car and interests.",
    interstitial: "THE TRUTH SHALL SET YOU FREE",
  },
};

export async function seedIfEmpty(db: Db) {
  const [{ value }] = await db.select({ value: count() }).from(categories);
  if (value === 0) {
    await db.insert(categories).values([...STARTING_CATEGORIES]);
  }

  const existing = await db.select().from(sources);
  if (existing.length) return;

  const rows = await db.select().from(categories);
  const bySlug = new Map(rows.map((row) => [row.slug, row.id]));
  const now = Date.now();

  for (const source of SEED_SOURCES) {
    const categoryId = bySlug.get(source.categorySlug) ?? bySlug.get("desk")!;
    await db.insert(sources).values({
      name: source.name,
      type: source.type,
      identifier: source.identifier,
      defaultCategoryId: categoryId,
      enabled: true,
      lastFetchStatus: "idle",
      createdAt: now,
    });
  }
}
