import { EDITORIAL_SITE_URL } from "./site";

export const DRV247_PUBLISHER = {
  "@type": "Organization" as const,
  name: "DRV247",
  url: "https://drv247.com",
  logo: {
    "@type": "ImageObject" as const,
    url: `${EDITORIAL_SITE_URL}/drv247-wordmark.svg`,
  },
};

export type NewsArticleJsonLdInput = {
  headline: string;
  description: string;
  imageUrl: string | null;
  datePublished: string;
  authorName: string;
  pageUrl: string;
};

export function buildNewsArticleJsonLd(input: NewsArticleJsonLdInput): Record<string, unknown> {
  const json: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: input.headline,
    description: input.description,
    datePublished: input.datePublished,
    author: {
      "@type": "Organization",
      name: input.authorName,
    },
    publisher: DRV247_PUBLISHER,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": input.pageUrl,
    },
  };
  if (input.imageUrl) {
    json.image = [input.imageUrl];
  }
  return json;
}

export function buildWebPageJsonLd(input: {
  name: string;
  description: string;
  pageUrl: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: input.name,
    description: input.description,
    url: input.pageUrl,
    isPartOf: {
      "@type": "WebSite",
      name: "DRV247 Editorial",
      url: EDITORIAL_SITE_URL,
    },
  };
}

export function buildCollectionPageJsonLd(input: {
  name: string;
  description: string;
  pageUrl: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: input.name,
    description: input.description,
    url: input.pageUrl,
    isPartOf: {
      "@type": "WebSite",
      name: "DRV247 Editorial",
      url: EDITORIAL_SITE_URL,
    },
  };
}
