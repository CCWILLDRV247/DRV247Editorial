import type { CategoryLane } from "@/components/category-carousel";
import type { StoryDto } from "@/lib/stories";
import { unstable_cache } from "next/cache";
import {
  LEGACY_NAV_TO_PRIMARY,
  MAGAZINE_NAV,
  MOBILE_NAV_SLUGS,
  PRIMARY_NAV,
  contentPrimaryBySlug,
  type ContentPrimary,
} from "../../config/magazine-nav";
import { decodeXmlEntities, isUsableArticleImage } from "../text";
import { countArticlesByPrimary } from "./article-primary";
import {
  forYouTestIsActive,
  forYouTestSearchString,
  type ForYouTestProfile,
} from "./for-you-test";
import { getEditorial, listEditorial, listDeskHomepage, type EditorialDto } from "./queries";
import { classifyPrimary } from "./taxonomy";
import { curateForYouHome } from "./for-you-home";
import { contextFromTestProfile } from "./personalize";
import { pickArticleIds } from "./desk";
import {
  HOMEPAGE_CATEGORY_SLUGS,
  HOMEPAGE_CATEGORY_STORY_MAX,
} from "./homepage-hierarchy";
import { selectHomepageInterludes } from "./interlude-selection";
import {
  emptyOpenerRecent,
  lastWeekOpenerIds,
  type OpenerRecentState,
} from "./opener-recent";
import { printModuleForYou } from "./print";
import {
  pickRelevanceExplanation,
  type ExplanationLane,
} from "./relevance-explanation";
import {
  applyWeeklyHomepageOpening,
  CATEGORY_PAGE_OPENING_MAX,
  FOR_YOU_OPENING_MAX,
  prependOpening,
  selectOpeningStories,
  type FreshnessCard,
} from "./weekly-freshness";

type FreshArticle = EditorialDto & FreshnessCard;

function withFreshness(article: EditorialDto): FreshArticle {
  return { ...article, deskPick: Boolean(article.desk) };
}

function matchesProfileVehicle(article: EditorialDto, profile?: ForYouTestProfile) {
  const make = profile?.make?.trim().toLowerCase();
  const model = profile?.model?.trim().toLowerCase();
  if (!make && !model) return true;
  if (make && article.makes.some((item) => item.toLowerCase() === make)) return true;
  if (model && article.models.some((item) => item.toLowerCase() === model)) return true;
  return false;
}

function openerCacheKey(openerRecent?: OpenerRecentState) {
  const state = openerRecent ?? emptyOpenerRecent();
  return `${state.weekStart}:${lastWeekOpenerIds(state).join(",")}`;
}

export { MAGAZINE_NAV, PRIMARY_NAV } from "../../config/magazine-nav";

export function primaryForArticle(article: EditorialDto): ContentPrimary {
  if (article.primaryCategory) {
    const known = contentPrimaryBySlug(article.primaryCategory);
    if (known) return known.slug as ContentPrimary;
  }
  return classifyPrimary({
    title: article.title,
    excerpt: article.excerpt,
    publication: article.publication,
    categories: article.categories,
    interests: article.interests,
  });
}

export function articleMatchesNav(article: EditorialDto, slug: string) {
  if (slug === "for-you") return true;
  const target = LEGACY_NAV_TO_PRIMARY[slug] ?? slug;
  return primaryForArticle(article) === target;
}

export function navForArticle(article: EditorialDto) {
  return contentPrimaryBySlug(primaryForArticle(article)) ?? MAGAZINE_NAV[1];
}

export function tagForArticle(article: EditorialDto) {
  const named = article.categories.find((category) => category.toLowerCase() !== "news");
  if (named) return named;
  return navForArticle(article).name;
}

export { isVideoStory } from "./video-story";

export function toMagazineStory(
  article: EditorialDto,
  options?: {
    lane?: ExplanationLane;
    vehicles?: ReturnType<typeof contextFromTestProfile>["vehicles"];
    showExplanation?: boolean;
  },
): StoryDto {
  const nav = navForArticle(article);
  const imageUrl = resolveImageUrl(article.imageUrl, article.canonicalUrl);
  const imageSources = article.imageSources
    .map((url) => resolveImageUrl(url, article.canonicalUrl))
    .filter((url): url is string => Boolean(url && url !== imageUrl));
  const relevanceExplanation =
    options?.showExplanation === false
      ? null
      : pickRelevanceExplanation({
          why: article.why,
          rankSignals: article.rankSignals,
          vehicleTier: article.vehicleTier,
          lane: options?.lane ?? "none",
          vehicles: options?.vehicles,
        });
  return {
    id: article.id,
    title: article.title,
    summary: article.excerpt,
    aiSummary: article.aiSummary,
    imageUrl,
    imageSources,
    canonicalUrl: article.canonicalUrl,
    publishedAt: article.publishedAt,
    hidden: false,
    relevanceExplanation,
    category: { id: 0, slug: nav.slug, name: nav.name },
    source: { id: 0, name: article.publication, type: article.ingestionMethod },
    desk: article.desk
      ? {
          label: article.desk.label,
          labelName: article.desk.labelName,
          note: article.desk.note,
          curator: article.desk.curator,
          featured: article.desk.featured,
        }
      : null,
  };
}

export function resolveImageUrl(raw: string | null | undefined, baseUrl: string): string | null {
  if (!isUsableArticleImage(raw)) return null;
  try {
    const cleaned = decodeXmlEntities(raw.trim()).trim();
    const url = new URL(cleaned, baseUrl);
    if (url.protocol === "http:") url.protocol = "https:";
    return url.toString();
  } catch {
    return null;
  }
}

export function magazineCacheKey(testProfile?: ForYouTestProfile) {
  if (testProfile && forYouTestIsActive(testProfile)) {
    return forYouTestSearchString(testProfile) || "default";
  }
  return "default";
}

const MAGAZINE_TTL_MS = 60_000;

const magazineMemo = globalThis as unknown as {
  drvMagazineHome?: Map<string, { at: number; value: Awaited<ReturnType<typeof getMagazineHomeFresh>> }>;
  drvMagazineStories?: Map<string, { at: number; value: StoryDto[] }>;
};

function memoGet<T>(
  store: Map<string, { at: number; value: T }> | undefined,
  key: string,
  ttl: number,
): T | undefined {
  const hit = store?.get(key);
  if (!hit) return undefined;
  if (Date.now() - hit.at >= ttl) {
    store?.delete(key);
    return undefined;
  }
  return hit.value;
}

export async function listMagazineStories(options?: {
  navSlug?: string;
  testProfile?: ForYouTestProfile;
  limit?: number;
  openerRecent?: OpenerRecentState;
}): Promise<StoryDto[]> {
  const navSlug = options?.navSlug ?? "for-you";
  const limit = options?.limit ?? 24;
  const testProfile =
    options?.testProfile && forYouTestIsActive(options.testProfile) ? options.testProfile : undefined;
  const openerRecent = options?.openerRecent ?? emptyOpenerRecent();
  const key = JSON.stringify({
    navSlug,
    limit,
    profile: magazineCacheKey(testProfile),
    openers: openerCacheKey(openerRecent),
  });
  const cached = memoGet(magazineMemo.drvMagazineStories, key, MAGAZINE_TTL_MS);
  if (cached) return cached;
  const articles = await listEditorial({
    section: navSlug && navSlug !== "for-you" ? navSlug : "for-you",
    testProfile,
    limit: 80,
  });
  const fresh = articles.map(withFreshness);
  const opening = selectOpeningStories(fresh, fresh, {
    count: CATEGORY_PAGE_OPENING_MAX,
    lastWeekOpenerIds: lastWeekOpenerIds(openerRecent),
    avoidStaleDeskLead: true,
  });
  const stories = prependOpening(opening, fresh)
    .slice(0, limit)
    .map((article) => toMagazineStory(article));
  (magazineMemo.drvMagazineStories ??= new Map()).set(key, { at: Date.now(), value: stories });
  return stories;
}

export async function getMagazineStory(id: number): Promise<StoryDto | null> {
  return unstable_cache(
    async (articleId: number) => {
      const article = await getEditorial(articleId, { related: false });
      return article ? toMagazineStory(article) : null;
    },
    ["magazine-story"],
    { revalidate: 60, tags: ["editorial"] },
  )(id);
}

function uniqueStories(stories: StoryDto[]) {
  const seen = new Set<number>();
  return stories.filter((story) => {
    if (seen.has(story.id)) return false;
    seen.add(story.id);
    return true;
  });
}

async function getMagazineHomeFresh(
  testProfile?: ForYouTestProfile,
  recentIds: readonly string[] = [],
  openerRecent: OpenerRecentState = emptyOpenerRecent(),
) {
  const personalized = forYouTestIsActive(testProfile ?? { interests: [] });
  const [deskArticles, ranked] = await Promise.all([
    listDeskHomepage(3),
    listEditorial({
      section: "for-you",
      testProfile: personalized ? testProfile : undefined,
      limit: 80,
    }),
  ]);
  const picks = uniqueStories(deskArticles.map((article) => toMagazineStory(article)));
  const pickIds = pickArticleIds(
    deskArticles.map((article) => article.desk).filter((desk): desk is NonNullable<typeof desk> => Boolean(desk)),
  );
  const plan = curateForYouHome(ranked, testProfile, pickIds);
  const byId = new Map(ranked.map((article) => [article.id, article]));
  const resolveFresh = (items: { id: number }[]) =>
    items
      .map((item) => byId.get(item.id))
      .filter((article): article is EditorialDto => Boolean(article))
      .map(withFreshness);
  const rankedFresh = ranked.filter((article) => !pickIds.has(article.id)).map(withFreshness);
  const vehicleFresh = resolveFresh(plan.forYourCar.stories);
  const discoverFresh = resolveFresh(plan.discover.stories).filter((article) => !pickIds.has(article.id));
  const forYouPreferred = vehicleFresh.length ? vehicleFresh : personalized ? [] : rankedFresh;
  const forYouRanked = vehicleFresh.length
    ? rankedFresh.filter(
        (article) =>
          matchesProfileVehicle(article, testProfile) || vehicleFresh.some((item) => item.id === article.id),
      )
    : rankedFresh;
  const railSource = HOMEPAGE_CATEGORY_SLUGS.flatMap((slug) => {
    const nav = MAGAZINE_NAV.find((item) => item.slug === slug);
    if (!nav) return [];
    const stories = ranked.filter((article) => articleMatchesNav(article, nav.slug)).slice(0, 12).map(withFreshness);
    if (stories.length === 0) return [];
    return [{ slug: nav.slug, stories }];
  });
  const pinned = applyWeeklyHomepageOpening({
    forYou: forYouPreferred,
    ranked: forYouRanked.length ? forYouRanked : rankedFresh,
    rails: railSource,
    lastWeekOpenerIds: lastWeekOpenerIds(openerRecent),
    forYouCount: FOR_YOU_OPENING_MAX,
  });
  const vehicles =
    personalized && testProfile ? contextFromTestProfile(testProfile).vehicles : [];
  const storyOpts = (lane: ExplanationLane) => ({
    lane,
    vehicles,
    showExplanation: personalized,
  });
  const toStories = (articles: { id: number }[], lane: ExplanationLane) =>
    uniqueStories(
      articles
        .map((item) => byId.get(item.id))
        .filter((article): article is EditorialDto => Boolean(article))
        .map((article) => toMagazineStory(article, storyOpts(lane))),
    );
  const forYourCar = {
    ...plan.forYourCar,
    empty: vehicleFresh.length
      ? plan.forYourCar.empty
      : pinned.forYou.length
        ? undefined
        : plan.forYourCar.empty,
    stories: toStories(pinned.forYou, "vehicle"),
  };
  const yourInterests = {
    ...plan.yourInterests,
    stories: toStories(plan.yourInterests.stories, "interests"),
  };
  const discover = {
    ...plan.discover,
    stories: toStories(discoverFresh, "discover").filter((story) => !pickIds.has(story.id)),
  };
  const featuredIds = new Set(
    [...forYourCar.stories, ...yourInterests.stories, ...discover.stories, ...picks].map(
      (story) => story.id,
    ),
  );
  const carousels: CategoryLane[] = pinned.rails.flatMap((rail) => {
    const nav = MAGAZINE_NAV.find((item) => item.slug === rail.slug);
    if (!nav) return [];
    const lane = rail.stories.map((article) =>
      toMagazineStory(article, { lane: "carousel", showExplanation: false }),
    );
    const opener = lane[0];
    const rest = lane.filter((story) => story.id !== opener?.id && !featuredIds.has(story.id));
    const stories = uniqueStories([...(opener ? [opener] : []), ...rest, ...lane]).slice(
      0,
      HOMEPAGE_CATEGORY_STORY_MAX,
    );
    if (stories.length === 0) return [];
    return [{ slug: nav.slug, name: nav.name, stories }];
  });
  const carouselArticles = HOMEPAGE_CATEGORY_SLUGS.flatMap((slug) => {
    const nav = MAGAZINE_NAV.find((item) => item.slug === slug);
    if (!nav) return [];
    const pinnedRail = pinned.rails.find((rail) => rail.slug === slug);
    const articles = (pinnedRail?.stories ?? ranked.filter((article) => articleMatchesNav(article, nav.slug))).slice(
      0,
      HOMEPAGE_CATEGORY_STORY_MAX,
    );
    if (articles.length === 0) return [];
    return [{ slug: nav.slug, articles }];
  });
  const interludes = selectHomepageInterludes({
    picks: deskArticles,
    forYourCar: pinned.forYou
      .map((item) => byId.get(item.id))
      .filter((article): article is EditorialDto => Boolean(article)),
    yourInterests: plan.yourInterests.stories
      .map((item) => byId.get(item.id))
      .filter((article): article is EditorialDto => Boolean(article)),
    carousels: carouselArticles,
    profile: testProfile,
    recentIds,
  });
  return {
    copy: plan.copy,
    forYourCar,
    yourInterests,
    discover,
    picks,
    carousels,
    interludes,
    print: printModuleForYou(testProfile),
    stories: [...forYourCar.stories, ...yourInterests.stories, ...discover.stories],
  };
}

export async function getMagazineHome(
  testProfile?: ForYouTestProfile,
  recentIds: readonly string[] = [],
  openerRecent: OpenerRecentState = emptyOpenerRecent(),
) {
  const key = `${magazineCacheKey(testProfile)}|open:${openerCacheKey(openerRecent)}`;
  const cached = memoGet(magazineMemo.drvMagazineHome, key, MAGAZINE_TTL_MS);
  if (cached) return cached;
  const value = await getMagazineHomeFresh(testProfile, recentIds, openerRecent);
  (magazineMemo.drvMagazineHome ??= new Map()).set(key, { at: Date.now(), value });
  return value;
}

export async function getMagazineNav() {
  const counts = await countArticlesByPrimary();
  const desktop = PRIMARY_NAV;
  const mobile = PRIMARY_NAV.filter((item) =>
    (MOBILE_NAV_SLUGS as readonly string[]).includes(item.slug),
  );
  const more = PRIMARY_NAV.filter(
    (item) => !(MOBILE_NAV_SLUGS as readonly string[]).includes(item.slug),
  );
  return { desktop, mobile, more, counts, motorsportInMore: false };
}
