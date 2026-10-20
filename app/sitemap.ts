import type { MetadataRoute } from "next";
import { getEditorialSitemap } from "@/lib/seo/sitemap-entries";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return getEditorialSitemap();
}
