import type { CategoryLane } from "@/components/category-carousel";
import type { StoryDto } from "@/lib/stories";
import { unstable_cache, unstable_noStore as noStore } from "next/cache";
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
  parseForYouTestProfile,
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
  pickRelevanceExplanation,
  type ExplanationLane,
} from "./relevance-explanation";

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

export async function listMagazineStories(options?: {
  navSlug?: string;
  testProfile?: ForYouTestProfile;
  limit?: number;
}): Promise<StoryDto[]> {
  const navSlug = options?.navSlug ?? "for-you";
  const limit = options?.limit ?? 24;
  const testProfile =
    options?.testProfile && forYouTestIsActive(options.testProfile) ? options.testProfile : undefined;
  if (testProfile) {
    noStore();
    const articles = await listEditorial({
      section: navSlug && navSlug !== "for-you" ? navSlug : "for-you",
      testProfile,
      limit: 80,
    });
    return articles.slice(0, limit).map((article) => toMagazineStory(article));
  }
  const key = JSON.stringify({
    navSlug,
    limit,
    profile: "default",
  });
  return unstable_cache(
    async (cacheKey: string) => {
      const parsed = JSON.parse(cacheKey) as { navSlug: string; limit: number; profile: string };
      const testProfile =
        parsed.profile === "default"
          ? undefined
          : parseForYouTestProfile(new URLSearchParams(parsed.profile));
      const articles = await listEditorial({
        section: parsed.navSlug && parsed.navSlug !== "for-you" ? parsed.navSlug : "for-you",
        testProfile,
        limit: 80,
      });
      return articles.slice(0, parsed.limit).map((article) => toMagazineStory(article));
    },
    ["magazine-stories"],
    { revalidate: 60, tags: ["editorial"] },
  )(key);
}

export async function getMagazineStory(id: number): Promise<StoryDto | null> {
  return unstable_cache(
    async (articleId: number) => {
      const article = await getEditorial(articleId);
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

async function getMagazineHomeFresh(testProfile?: ForYouTestProfile) {
  const deskArticles = await listDeskHomepage(3);
  const picks = uniqueStories(deskArticles.map((article) => toMagazineStory(article)));
  const pickIds = pickArticleIds(
    deskArticles.map((article) => article.desk).filter((desk): desk is NonNullable<typeof desk> => Boolean(desk)),
  );
  const ranked = await listEditorial({
    section: "for-you",
    testProfile: forYouTestIsActive(testProfile ?? { interests: [] }) ? testProfile : undefined,
    limit: 80,
  });
  const plan = curateForYouHome(ranked, testProfile, pickIds);
  const byId = new Map(ranked.map((article) => [article.id, article]));
  const personalized = forYouTestIsActive(testProfile ?? { interests: [] });
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
  const forYourCar = { ...plan.forYourCar, stories: toStories(plan.forYourCar.stories, "vehicle") };
  const yourInterests = {
    ...plan.yourInterests,
    stories: toStories(plan.yourInterests.stories, "interests"),
  };
  const discover = {
    ...plan.discover,
    stories: toStories(plan.discover.stories, "discover").filter((story) => !pickIds.has(story.id)),
  };
  const featuredIds = new Set(
    [...forYourCar.stories, ...yourInterests.stories, ...discover.stories, ...picks].map(
      (story) => story.id,
    ),
  );
  const carousels: CategoryLane[] = HOMEPAGE_CATEGORY_SLUGS.flatMap((slug) => {
    const nav = MAGAZINE_NAV.find((item) => item.slug === slug);
    if (!nav) return [];
    const lane = ranked
      .filter((article) => articleMatchesNav(article, nav.slug))
      .slice(0, 12)
      .map((article) => toMagazineStory(article, { lane: "carousel", showExplanation: false }));
    const fresh = lane.filter((story) => !featuredIds.has(story.id));
    const stories = uniqueStories([...fresh, ...lane]).slice(0, HOMEPAGE_CATEGORY_STORY_MAX);
    if (stories.length === 0) return [];
    return [{ slug: nav.slug, name: nav.name, stories }];
  });
  const carouselArticles = HOMEPAGE_CATEGORY_SLUGS.flatMap((slug) => {
    const nav = MAGAZINE_NAV.find((item) => item.slug === slug);
    if (!nav) return [];
    const articles = ranked
      .filter((article) => articleMatchesNav(article, nav.slug))
      .slice(0, HOMEPAGE_CATEGORY_STORY_MAX);
    if (articles.length === 0) return [];
    return [{ slug: nav.slug, articles }];
  });
  const interludes = selectHomepageInterludes({
    picks: deskArticles,
    forYourCar: plan.forYourCar.stories
      .map((item) => byId.get(item.id))
      .filter((article): article is EditorialDto => Boolean(article)),
    yourInterests: plan.yourInterests.stories
      .map((item) => byId.get(item.id))
      .filter((article): article is EditorialDto => Boolean(article)),
    carousels: carouselArticles,
    profile: testProfile,
  });
  return {
    copy: plan.copy,
    forYourCar,
    yourInterests,
    discover,
    picks,
    carousels,
    interludes,
    stories: [...forYourCar.stories, ...yourInterests.stories, ...discover.stories],
  };
}

export async function getMagazineHome(testProfile?: ForYouTestProfile) {
  if (testProfile && forYouTestIsActive(testProfile)) {
    noStore();
    return getMagazineHomeFresh(testProfile);
  }
  const key = "default";
  return unstable_cache(
    async (cacheKey: string) => {
      const profile =
        cacheKey === "default" ? undefined : parseForYouTestProfile(new URLSearchParams(cacheKey));
      return getMagazineHomeFresh(profile);
    },
    ["magazine-home"],
    { revalidate: 60, tags: ["editorial"] },
  )(key);
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
