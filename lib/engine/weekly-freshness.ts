import { HOMEPAGE_LEAD_CARD_MAX } from "./homepage-hierarchy";

/** Hero + secondary leads on For You (UI currently shows hero + HOMEPAGE_LEAD_CARD_MAX). */
export const FOR_YOU_OPENING_MAX = 1 + HOMEPAGE_LEAD_CARD_MAX;
/** Category StoryFeed: hero + two lead cards. */
export const CATEGORY_PAGE_OPENING_MAX = 3;
export const RAIL_OPENER_MAX = 1;
export const THIS_WEEK_DAYS = 7;
export const LATEST_INGEST_WINDOW_MS = 24 * 60 * 60 * 1000;

export type FreshnessCard = {
  id: number;
  publication: string;
  publishedAt: string | number;
  firstSeen?: number | null;
  lastProcessed?: number | null;
  deskPick?: boolean;
};

export type OpeningPickOptions = {
  count: number;
  now?: number;
  lastWeekOpenerIds?: ReadonlySet<number> | readonly number[];
  usedPublications?: Set<string>;
  usedIds?: Set<number>;
  /** Skip a stale Desk pick in the visual lead when this-week stories exist. */
  avoidStaleDeskLead?: boolean;
};

function toMs(value: string | number | null | undefined): number {
  if (value == null || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function publicationKey(publication: string | null | undefined): string {
  return (publication ?? "").trim().toLowerCase();
}

export function latestIngestAt(cards: readonly FreshnessCard[]): number {
  let latest = 0;
  for (const card of cards) {
    latest = Math.max(latest, card.firstSeen ?? 0, card.lastProcessed ?? 0);
  }
  return latest;
}

export function isFromLatestIngest(
  card: FreshnessCard,
  ingestAt: number,
  windowMs = LATEST_INGEST_WINDOW_MS,
): boolean {
  if (ingestAt <= 0) return false;
  const seen = Math.max(card.firstSeen ?? 0, card.lastProcessed ?? 0);
  return seen > 0 && Math.abs(ingestAt - seen) <= windowMs;
}

export function isThisWeekStory(
  card: FreshnessCard,
  now = Date.now(),
  ingestAt = 0,
): boolean {
  const weekAgo = now - THIS_WEEK_DAYS * 86_400_000;
  if (toMs(card.publishedAt) >= weekAgo) return true;
  if ((card.firstSeen ?? 0) >= weekAgo) return true;
  return isFromLatestIngest(card, ingestAt);
}

function lastWeekSet(ids: OpeningPickOptions["lastWeekOpenerIds"]): Set<number> {
  if (!ids) return new Set();
  return ids instanceof Set ? ids : new Set(ids);
}

function isStaleDeskBlocked(
  card: FreshnessCard,
  thisWeekExists: boolean,
  now: number,
  ingestAt: number,
  avoidStaleDeskLead: boolean,
): boolean {
  if (!avoidStaleDeskLead || !card.deskPick || !thisWeekExists) return false;
  return !isThisWeekStory(card, now, ingestAt);
}

/**
 * Fill `count` lead slots: this-week first (latest ingest or published/first-seen in 7 days),
 * unique publication, no last-week opener. Remaining slots come from normal rank.
 */
export function selectOpeningStories<T extends FreshnessCard>(
  preferred: readonly T[],
  fallback: readonly T[] = preferred,
  options: OpeningPickOptions,
): T[] {
  const count = Math.max(0, options.count);
  if (count === 0) return [];
  const now = options.now ?? Date.now();
  const pool = uniqueById([...preferred, ...fallback]);
  const ingestAt = latestIngestAt(pool);
  const thisWeek = pool.filter((card) => isThisWeekStory(card, now, ingestAt));
  const thisWeekExists = thisWeek.length > 0;
  const lastWeek = lastWeekSet(options.lastWeekOpenerIds);
  const usedIds = options.usedIds ?? new Set<number>();
  const usedPublications = options.usedPublications ?? new Set<string>();
  const picked: T[] = [];
  const avoidDesk = options.avoidStaleDeskLead !== false;

  const tryTake = (
    source: readonly T[],
    opts: { thisWeekOnly: boolean; skipLastWeek: boolean; uniquePub: boolean; skipStaleDesk: boolean },
  ) => {
    for (const card of source) {
      if (picked.length >= count) return;
      if (usedIds.has(card.id)) continue;
      if (opts.thisWeekOnly && !isThisWeekStory(card, now, ingestAt)) continue;
      if (opts.skipLastWeek && lastWeek.has(card.id)) continue;
      if (opts.skipStaleDesk && isStaleDeskBlocked(card, thisWeekExists, now, ingestAt, avoidDesk)) continue;
      const pub = publicationKey(card.publication);
      if (opts.uniquePub && pub && usedPublications.has(pub)) continue;
      picked.push(card);
      usedIds.add(card.id);
      if (pub) usedPublications.add(pub);
    }
  };

  tryTake(thisWeek, { thisWeekOnly: true, skipLastWeek: true, uniquePub: true, skipStaleDesk: true });
  tryTake(preferred, { thisWeekOnly: true, skipLastWeek: true, uniquePub: true, skipStaleDesk: true });
  tryTake(thisWeek, { thisWeekOnly: true, skipLastWeek: false, uniquePub: true, skipStaleDesk: true });
  tryTake(preferred, { thisWeekOnly: false, skipLastWeek: true, uniquePub: true, skipStaleDesk: true });
  tryTake(fallback, { thisWeekOnly: false, skipLastWeek: true, uniquePub: true, skipStaleDesk: true });
  tryTake(preferred, { thisWeekOnly: false, skipLastWeek: false, uniquePub: true, skipStaleDesk: false });
  tryTake(fallback, { thisWeekOnly: false, skipLastWeek: false, uniquePub: false, skipStaleDesk: false });

  return picked;
}

function uniqueById<T extends { id: number }>(items: readonly T[]): T[] {
  const seen = new Set<number>();
  const out: T[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

export function prependOpening<T extends { id: number }>(opening: readonly T[], rest: readonly T[]): T[] {
  const used = new Set(opening.map((item) => item.id));
  return [...opening, ...rest.filter((item) => !used.has(item.id))];
}

export type WeeklyRail<T> = { slug: string; stories: T[] };

/**
 * Pin For You opening cards and the first card of each story rail.
 * Below-the-fold order stays the incoming rank (12-day half-life untouched).
 */
export function applyWeeklyHomepageOpening<T extends FreshnessCard>(input: {
  forYou: readonly T[];
  ranked: readonly T[];
  rails: readonly WeeklyRail<T>[];
  lastWeekOpenerIds?: readonly number[];
  forYouCount?: number;
  now?: number;
}): { forYou: T[]; rails: WeeklyRail<T>[]; openerIds: number[] } {
  const usedIds = new Set<number>();
  const usedPublications = new Set<string>();
  const lastWeek = lastWeekSet(input.lastWeekOpenerIds);
  const forYouCount = input.forYouCount ?? FOR_YOU_OPENING_MAX;
  const preferred = input.forYou.length ? input.forYou : input.ranked;
  const opening = selectOpeningStories(preferred, input.ranked, {
    count: forYouCount,
    now: input.now,
    lastWeekOpenerIds: lastWeek,
    usedIds,
    usedPublications,
    avoidStaleDeskLead: true,
  });
  const forYou = prependOpening(opening, preferred);

  const rails = input.rails.map((rail) => {
    const opener = selectOpeningStories(rail.stories, rail.stories, {
      count: RAIL_OPENER_MAX,
      now: input.now,
      lastWeekOpenerIds: lastWeek,
      usedIds,
      usedPublications,
      avoidStaleDeskLead: true,
    });
    return { slug: rail.slug, stories: prependOpening(opener, rail.stories) };
  });

  const openerIds = [
    ...opening.map((card) => card.id),
    ...rails.flatMap((rail) => (rail.stories[0] ? [rail.stories[0].id] : [])),
  ];
  return { forYou, rails, openerIds };
}
