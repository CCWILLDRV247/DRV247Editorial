import { count, eq } from "drizzle-orm";
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
  if (value === 0) {
    db.insert(categories).values([...STARTING_CATEGORIES]).run();
  }

  const rows = db.select().from(categories).all();
  const bySlug = new Map(rows.map((row) => [row.slug, row.id]));
  const existing = db.select().from(sources).all();
  const byName = new Map(existing.map((row) => [row.name, row]));
  const now = Date.now();

  for (const source of SEED_SOURCES) {
    const current =
      byName.get(source.name) ??
      (source.replaces ? byName.get(source.replaces) : undefined);
    const categoryId = bySlug.get(source.categorySlug) ?? bySlug.get("desk")!;
    if (current) {
      db.update(sources)
        .set({
          name: source.name,
          type: source.type,
          identifier: source.identifier,
          defaultCategoryId: categoryId,
          enabled: true,
        })
        .where(eq(sources.id, current.id))
        .run();
    } else {
      db.insert(sources)
        .values({
          name: source.name,
          type: source.type,
          identifier: source.identifier,
          defaultCategoryId: categoryId,
          enabled: true,
          lastFetchStatus: "idle",
          createdAt: now,
        })
        .run();
    }
  }
}
