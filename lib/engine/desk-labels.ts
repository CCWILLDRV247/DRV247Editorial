export const DESK_CURATOR = "DRV247 Picks";

export const PICKS_SECTION_HEADING = "DRV247 Picks";
export const PICKS_SECTION_DEK = "The stuff we're looking at this week.";

/** Small controlled vocabulary. Voice, not taxonomy sprawl. */
export const DESK_LABELS = [
  { slug: "from-the-desk", name: "From the Desk" },
  { slug: "deep-cut", name: "Deep Cut" },
  { slug: "worth-a-look", name: "Worth a Look" },
  { slug: "one-for-the-garage", name: "One for the Garage" },
  { slug: "road-worth-taking", name: "Road Worth Taking" },
] as const;

export type DeskLabelSlug = (typeof DESK_LABELS)[number]["slug"];
export type DeskLabelName = (typeof DESK_LABELS)[number]["name"];

export type DeskPublic = {
  id: number;
  articleId: number;
  label: DeskLabelSlug;
  labelName: DeskLabelName;
  note: string | null;
  curator: string;
  selectedAt: number;
  expiresAt: number | null;
  featured: boolean;
  category: string | null;
  active: boolean;
  sortOrder: number;
};

const LABEL_BY_SLUG = new Map(DESK_LABELS.map((label) => [label.slug, label]));

export function isDeskLabelSlug(value: string): value is DeskLabelSlug {
  return LABEL_BY_SLUG.has(value as DeskLabelSlug);
}

export function deskLabelName(slug: string): DeskLabelName {
  return LABEL_BY_SLUG.get(slug as DeskLabelSlug)?.name ?? "From the Desk";
}

/** Never invent a note. Empty or missing stays null. */
export function deskNote(raw: string | null | undefined): string | null {
  const note = raw?.trim() ?? "";
  return note ? note : null;
}

export function isDeskPickLive(
  pick: { active: boolean; expiresAt?: number | null },
  now = Date.now(),
): boolean {
  if (!pick.active) return false;
  if (pick.expiresAt && pick.expiresAt <= now) return false;
  return true;
}

export function toDeskPublic(pick: {
  id: number;
  articleId: number;
  note?: string | null;
  curator?: string | null;
  selectedAt: number;
  expiresAt?: number | null;
  featured: boolean;
  category?: string | null;
  label: string;
  active: boolean;
  sortOrder?: number | null;
}): DeskPublic {
  const slug = isDeskLabelSlug(pick.label) ? pick.label : "from-the-desk";
  return {
    id: pick.id,
    articleId: pick.articleId,
    label: slug,
    labelName: deskLabelName(slug),
    note: deskNote(pick.note),
    curator: pick.curator || DESK_CURATOR,
    selectedAt: pick.selectedAt,
    expiresAt: pick.expiresAt ?? null,
    featured: Boolean(pick.featured),
    category: pick.category?.trim() || null,
    active: Boolean(pick.active),
    sortOrder: pick.sortOrder ?? 0,
  };
}

export function liveDeskByArticle<T extends Parameters<typeof toDeskPublic>[0]>(
  picks: T[],
  now = Date.now(),
) {
  const map = new Map<number, DeskPublic>();
  for (const pick of picks) {
    if (!isDeskPickLive(pick, now)) continue;
    map.set(pick.articleId, toDeskPublic(pick));
  }
  return map;
}

export function selectHomepagePicks<
  T extends { featured: boolean; selectedAt: number; sortOrder?: number | null },
>(picks: T[], limit = 3): T[] {
  return [...picks]
    .sort(
      (a, b) =>
        (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
        Number(b.featured) - Number(a.featured) ||
        b.selectedAt - a.selectedAt,
    )
    .slice(0, Math.max(0, limit));
}

/** Homepage pick IDs — reserve in For You lanes so Picks own the story once. */
export function pickArticleIds(picks: Pick<DeskPublic, "articleId">[]): Set<number> {
  return new Set(picks.map((pick) => pick.articleId));
}
