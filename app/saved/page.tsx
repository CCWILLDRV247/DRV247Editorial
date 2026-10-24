import type { Metadata } from "next";
import { SavedFeed } from "@/components/engagement/saved-feed";
import { MagazineQueryProvider } from "@/components/magazine-link";
import { ListingMain } from "@/components/listing-main";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { MAGAZINE_LAYOUT } from "@/lib/engine/editorial-composition";
import { forYouTestSearchString, parseForYouTestProfile } from "@/lib/engine/for-you-test";
import { buildSavedMetadata } from "@/lib/seo/metadata";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  return buildSavedMetadata();
}

export default async function SavedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const testQuery = forYouTestSearchString(parseForYouTestProfile(await searchParams)) || undefined;

  return (
    <MagazineQueryProvider testQuery={testQuery}>
      <div className="min-h-full overflow-x-clip bg-white">
        <SiteHeader title="Saved" backHref="/" testQuery={testQuery} />
        <ListingMain>
          <div className={`flex min-w-0 flex-col pt-10 ${MAGAZINE_LAYOUT.page}`}>
            <SavedFeed />
          </div>
        </ListingMain>
        <SiteFooter />
      </div>
    </MagazineQueryProvider>
  );
}
