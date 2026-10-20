import type { MetadataRoute } from "next";

/** Verified marketing paths on https://drv247.com (live sitemap 2026-10-20). */
export const MAIN_DOMAIN_ORIGIN = "https://drv247.com";

export const MAIN_DOMAIN_INDEXABLE_PATHS = [
  "/",
  "/blog-post",
  "/blog-post1",
  "/blog-post2",
  "/blog-post3",
  "/partners",
  "/contact-us",
  "/feedback",
  "/sign-up",
  "/qrcode",
] as const;

/** Cross-origin marketing URLs prepended to the editorial sitemap urlset. */
export function mainDomainSitemapEntries(): MetadataRoute.Sitemap {
  return MAIN_DOMAIN_INDEXABLE_PATHS.map((path) => ({
    url: path === "/" ? MAIN_DOMAIN_ORIGIN : `${MAIN_DOMAIN_ORIGIN}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: path === "/" ? 0.9 : 0.5,
  }));
}
