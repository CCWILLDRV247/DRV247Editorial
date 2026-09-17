import type { StoryDto } from "@/lib/stories";
import { unstable_cache } from "next/cache";
import {
  LEGACY_NAV_TO_PRIMARY,
  MAGAZINE_NAV,
  MOBILE_MOTORSPORT_MORE_BELOW,
  PRIMARY_NAV,
  contentPrimaryBySlug,
  type ContentPrimary,
} from "../../config/magazine-nav";
import { decodeXmlEntities } from "../text";
import { countArticlesByPrimary } from "./article-primary";
import {
  forYouTestIsActive,
  forYouTestSearchString,
  parseForYouTestProfile,
  type ForYouTestProfile,
} from "./for-you-test";
import { getEditorial, listEditorial, type EditorialDto } from "./queries";
import { classifyPrimary } from "./taxonomy";

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

export function toMagazineStory(article: EditorialDto): StoryDto {
  const nav = navForArticle(article);
  return {
    id: article.id,
    title: article.title,
    summary: article.excerpt,
    aiSummary: article.aiSummary,
    imageUrl: resolveImageUrl(article.imageUrl, article.canonicalUrl),
    canonicalUrl: article.canonicalUrl,
    publishedAt: article.publishedAt,
    hidden: false,
    category: { id: 0, slug: nav.slug, name: nav.name },
    source: { id: 0, name: article.publication, type: article.ingestionMethod },
  };
}

export function resolveImageUrl(raw: string | null | undefined, baseUrl: string): string | null {
  if (!raw?.trim()) return null;
  try {
    const cleaned = decodeXmlEntities(raw.trim()).trim();
    if (!cleaned || /^(data|javascript):/i.test(cleaned)) return null;
    return new URL(cleaned, baseUrl).toString();
  } catch {
    return null;
  }
}

export async function listMagazineStories(options?: {
  navSlug?: string;
  testProfile?: ForYouTestProfile;
  limit?: number;
}): Promise<StoryDto[]> {
  const key = JSON.stringify({
    navSlug: options?.navSlug ?? "for-you",
    limit: options?.limit ?? 24,
    profile:
      options?.testProfile && forYouTestIsActive(options.testProfile)
        ? forYouTestSearchString(options.testProfile)
        : "default",
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
      return articles.slice(0, parsed.limit).map(toMagazineStory);
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
  const ranked = await listEditorial({
    section: "for-you",
    testProfile: forYouTestIsActive(testProfile ?? { interests: [] }) ? testProfile : undefined,
    limit: 80,
  });
  const stories = uniqueStories(ranked.map(toMagazineStory)).slice(0, 24);
  const featuredIds = new Set(stories.slice(0, 6).map((story) => story.id));
  const carousels = MAGAZINE_NAV.map((nav) => {
    const lane = ranked
      .filter((article) => articleMatchesNav(article, nav.slug))
      .slice(0, 16)
      .map(toMagazineStory);
    const fresh = lane.filter((story) => !featuredIds.has(story.id));
    return {
      slug: nav.slug,
      name: nav.name,
      stories: uniqueStories([...fresh, ...lane]).slice(0, 8),
    };
  }).filter((lane) => lane.stories.length > 0);
  return { stories, carousels };
}

export async function getMagazineHome(testProfile?: ForYouTestProfile) {
  const key =
    testProfile && forYouTestIsActive(testProfile) ? forYouTestSearchString(testProfile) : "default";
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
  const motorsportCount = counts.motorsport ?? 0;
  const motorsportInMore = motorsportCount < MOBILE_MOTORSPORT_MORE_BELOW;
  const desktop = PRIMARY_NAV;
  const mobile = motorsportInMore
    ? PRIMARY_NAV.filter((item) => item.slug !== "motorsport")
    : PRIMARY_NAV;
  const more = motorsportInMore ? PRIMARY_NAV.filter((item) => item.slug === "motorsport") : [];
  return { desktop, mobile, more, counts, motorsportInMore };
}
