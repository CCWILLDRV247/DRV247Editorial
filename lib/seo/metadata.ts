import type { Metadata } from "next";
import { CATEGORY_COPY } from "@/lib/db/seed";
import { EDITORIAL_SITE_URL } from "./site";
import { robotsForPersonalizedView } from "./personalization";

/** Primary SERP / social copy for the editorial product (not legal footer text). */
export const EDITORIAL_SITE_TITLE = "DRV247 Editorial";
export const EDITORIAL_SITE_DESCRIPTION =
  "UK and European car culture in one place — curated automotive editorial across Cars, Culture, Driving, Motorsport, and Events. Teasers and links to the originals; never the full article.";

const DEFAULT_DESCRIPTION = EDITORIAL_SITE_DESCRIPTION;

const DEFAULT_OG_IMAGE = `${EDITORIAL_SITE_URL}/apple-touch-icon.png`;

/** Root layout defaults — inherited when a route omits fields. */
export function buildRootLayoutMetadata(): Pick<
  Metadata,
  "title" | "description" | "openGraph" | "twitter"
> {
  return {
    title: {
      default: EDITORIAL_SITE_TITLE,
      template: `%s · ${EDITORIAL_SITE_TITLE}`,
    },
    description: EDITORIAL_SITE_DESCRIPTION,
    openGraph: {
      ...baseOpenGraph(EDITORIAL_SITE_TITLE, EDITORIAL_SITE_DESCRIPTION, EDITORIAL_SITE_URL),
      type: "website",
    },
    twitter: baseTwitter(EDITORIAL_SITE_TITLE, EDITORIAL_SITE_DESCRIPTION),
  };
}

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
  const title = { absolute: EDITORIAL_SITE_TITLE };
  const description = EDITORIAL_SITE_DESCRIPTION;
  const canonical = editorialCanonicalPath("/");
  return {
    title,
    description,
    alternates: { canonical },
    robots: robotsForPersonalizedView(searchParams),
    openGraph: {
      ...baseOpenGraph(EDITORIAL_SITE_TITLE, description, canonical),
      type: "website",
    },
    twitter: baseTwitter(EDITORIAL_SITE_TITLE, description),
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

export function buildSavedMetadata(): Metadata {
  const title = "Saved";
  const description = "Teasers you clipped on this phone. Nothing is stored on an account.";
  return {
    title,
    description,
    robots: { index: false, follow: true },
    openGraph: {
      ...baseOpenGraph(title, description, editorialCanonicalPath("/")),
      type: "website",
    },
    twitter: baseTwitter(title, description),
  };
}

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
