import type { Metadata } from "next";
import { Suspense } from "react";
import { MagazineQueryProvider } from "@/components/magazine-link";
import { HomeFeed } from "@/components/magazine/home-feed";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import {
  forYouTestSearchString,
  parseForYouTestProfile,
} from "@/lib/engine/for-you-test";
import { buildWebPageJsonLd } from "@/lib/seo/json-ld";
import {
  EDITORIAL_SITE_DESCRIPTION,
  EDITORIAL_SITE_TITLE,
  buildHomeMetadata,
  editorialCanonicalPath,
} from "@/lib/seo/metadata";
import { buildWebSiteJsonLd } from "@/lib/seo/json-ld";
import RootLoading from "./loading";

export const runtime = "nodejs";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  return buildHomeMetadata(await searchParams);
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const testProfile = parseForYouTestProfile(params);
  const testQuery = forYouTestSearchString(testProfile) || undefined;
  const pageUrl = editorialCanonicalPath("/");
  const jsonLd = [
    buildWebSiteJsonLd(),
    buildWebPageJsonLd({
      name: EDITORIAL_SITE_TITLE,
      description: EDITORIAL_SITE_DESCRIPTION,
      pageUrl,
    }),
  ];

  return (
    <MagazineQueryProvider testQuery={testQuery}>
      <JsonLdScript data={jsonLd} />
      <div className="min-h-full overflow-x-clip bg-white">
        <SiteHeader title="For You" testQuery={testQuery} />
        <Suspense fallback={<RootLoading />}>
          <HomeFeed testProfile={testProfile} testQuery={testQuery} />
        </Suspense>
        <SiteFooter />
      </div>
    </MagazineQueryProvider>
  );
}
