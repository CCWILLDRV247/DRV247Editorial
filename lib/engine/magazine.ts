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

export function listMagazineStories(options?: {
  navSlug?: string;
  userId?: string;
  limit?: number;
}): StoryDto[] {
  const articles = listEditorial({
    userId: options?.userId ?? "demo-chris",
    limit: 80,
  });
  const filtered = options?.navSlug
    ? articles.filter((article) => articleMatchesNav(article, options.navSlug!))
    : articles;
  return filtered.slice(0, options?.limit ?? 24).map(toMagazineStory);
}

export function getMagazineStory(id: number): StoryDto | null {
  const article = getEditorial(id);
  return article ? toMagazineStory(article) : null;
}
