import type { Metadata } from "next";
import { CATEGORY_COPY } from "@/lib/db/seed";
import { EDITORIAL_SITE_URL } from "./site";
import { robotsForPersonalizedView } from "./personalization";

const DEFAULT_DESCRIPTION =
  "Drive 24/7 editorial — For You, Cars, Culture, Driving, and Events. Summaries and the original link. Never the full article.";

const DEFAULT_OG_IMAGE = `${EDITORIAL_SITE_URL}/apple-touch-icon.png`;

export function editorialCanonicalPath(path: string): string {
  if (!path.startsWith("/")) return `${EDITORIAL_SITE_URL}/${path}`;
  return `${EDITORIAL_SITE_URL}${path === "/" ? "" : path}`;
}

function baseOpenGraph(
  title: string,
  description: string,
  url: string,
  imageUrl?: string | null,
): Metadata["openGraph"] {
  return {
    title,
    description,
    url,
    siteName: "DRV247 Editorial",
    locale: "en_GB",
    images: [{ url: imageUrl || DEFAULT_OG_IMAGE, alt: title }],
  };
}

function baseTwitter(title: string, description: string, imageUrl?: string | null): Metadata["twitter"] {
  return {
    card: "summary_large_image",
    title,
    description,
    images: [imageUrl || DEFAULT_OG_IMAGE],
  };
}

export const POLICY_META = {
  title: "Editorial policy",
  description:
    "What DRV247 Editorial indexes, why we only show teasers, how we treat source robots.txt, and how a publisher can opt out.",
  path: "/policy",
} as const;

export function buildPolicyMetadata(): Metadata {
  const { title, description, path } = POLICY_META;
  const canonical = editorialCanonicalPath(path);
  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: {
      ...baseOpenGraph(title, description, canonical),
      type: "website",
    },
    twitter: baseTwitter(title, description),
  };
}

export function buildHomeMetadata(
  searchParams: Record<string, string | string[] | undefined>,
): Metadata {
  const copy = CATEGORY_COPY.home;
  const title = "For You";
  const description = copy?.blurb ?? DEFAULT_DESCRIPTION;
  const canonical = editorialCanonicalPath("/");
  return {
    title,
    description,
    alternates: { canonical },
    robots: robotsForPersonalizedView(searchParams),
    openGraph: {
      ...baseOpenGraph(title, description, canonical),
      type: "website",
    },
    twitter: baseTwitter(title, description),
  };
}

export function buildCategoryMetadata(
  slug: string,
  categoryName: string,
  searchParams: Record<string, string | string[] | undefined>,
): Metadata {
  const copy = CATEGORY_COPY[slug];
  const title = categoryName;
  const description = copy?.blurb ?? copy?.dek ?? DEFAULT_DESCRIPTION;
  const canonical = editorialCanonicalPath(`/category/${slug}`);
  return {
    title,
    description,
    alternates: { canonical },
    robots: robotsForPersonalizedView(searchParams),
    openGraph: {
      ...baseOpenGraph(title, description, canonical),
      type: "website",
    },
    twitter: baseTwitter(title, description),
  };
}

export type StoryMetadataInput = {
  id: number;
  title: string;
  summary: string;
  imageUrl: string | null;
  publishedAt: string;
  publicationName: string;
};

export function buildStoryMetadata(
  story: StoryMetadataInput,
  searchParams: Record<string, string | string[] | undefined>,
): Metadata {
  const title = story.title;
  const description = story.summary.trim() || DEFAULT_DESCRIPTION;
  const canonical = editorialCanonicalPath(`/story/${story.id}`);
  return {
    title,
    description,
    alternates: { canonical },
    robots: robotsForPersonalizedView(searchParams),
    openGraph: {
      ...baseOpenGraph(title, description, canonical, story.imageUrl),
      type: "article",
      publishedTime: story.publishedAt,
      authors: [story.publicationName],
    },
    twitter: baseTwitter(title, description, story.imageUrl),
  };
}
