import { revalidatePath, revalidateTag } from "next/cache";
import { SITEMAP_CACHE_TAG } from "./site";

/** Bust sitemap cache after ingest or desk changes. Safe outside Next (no-op). */
export function revalidateSitemapCache(): void {
  try {
    revalidateTag(SITEMAP_CACHE_TAG, "max");
    revalidatePath("/sitemap.xml");
  } catch {
    // Local scripts / tsx have no Next data cache.
  }
}
