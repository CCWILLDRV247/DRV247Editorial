import type { StoryDto } from "@/lib/stories";
import { MAGAZINE_NAV, NAV_KEYWORDS } from "../../config/magazine-nav";
import { getEditorial, listEditorial, type EditorialDto } from "./queries";

export { MAGAZINE_NAV } from "../../config/magazine-nav";

function haystack(article: EditorialDto) {
  return [...article.categories, ...article.interests, article.publication, article.title]
    .join(" ")
    .toLowerCase();
}

export function articleMatchesNav(article: EditorialDto, slug: string) {
  const keywords = NAV_KEYWORDS[slug];
  if (!keywords) return true;
  const text = haystack(article);
  return keywords.some((keyword) => text.includes(keyword));
}

export function navForArticle(article: EditorialDto) {
  const match = MAGAZINE_NAV.find((item) => articleMatchesNav(article, item.slug));
  return match ?? MAGAZINE_NAV[4];
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
    imageUrl: article.imageUrl,
    canonicalUrl: article.canonicalUrl,
    publishedAt: article.publishedAt,
    hidden: false,
    category: { id: 0, slug: nav.slug, name: tagForArticle(article) },
    source: { id: 0, name: article.publication, type: article.ingestionMethod },
  };
}

export function resolveImageUrl(raw: string | null | undefined, baseUrl: string): string | null {
  if (!raw?.trim()) return null;
  try {
    return new URL(raw.trim(), baseUrl).toString();
  } catch {
    return null;
  }
}

export async function listMagazineStories(options?: {
  navSlug?: string;
  userId?: string;
  limit?: number;
}): Promise<StoryDto[]> {
  const articles = await listEditorial({
    userId: options?.userId ?? "demo-chris",
    limit: 80,
  });
  const filtered = options?.navSlug
    ? articles.filter((article) => articleMatchesNav(article, options.navSlug!))
    : articles;
  return filtered.slice(0, options?.limit ?? 24).map(toMagazineStory);
}

export async function getMagazineStory(id: number): Promise<StoryDto | null> {
  const article = await getEditorial(id);
  return article ? toMagazineStory(article) : null;
}

function uniqueStories(stories: StoryDto[]) {
  const seen = new Set<number>();
  return stories.filter((story) => {
    if (seen.has(story.id)) return false;
    seen.add(story.id);
    return true;
  });
}

export async function getMagazineHome() {
  const ranked = await listEditorial({ userId: "demo-chris", limit: 80 });
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
  });
  return { stories, carousels };
}
