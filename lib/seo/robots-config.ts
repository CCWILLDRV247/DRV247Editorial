import type { MetadataRoute } from "next";
import { EDITORIAL_SITE_URL } from "./site";

export function editorialRobots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/admin/", "/saved", "/saved/"],
    },
    sitemap: `${EDITORIAL_SITE_URL}/sitemap.xml`,
  };
}
