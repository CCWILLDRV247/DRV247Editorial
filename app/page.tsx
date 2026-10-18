import { Suspense } from "react";
import { MagazineQueryProvider } from "@/components/magazine-link";
import { HomeFeed } from "@/components/magazine/home-feed";
import { ForYouTestFilterSection } from "@/components/magazine/for-you-test-filter-section";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import RootLoading from "./loading";
import {
  forYouTestSearchString,
  parseForYouTestProfile,
} from "@/lib/engine/for-you-test";

export const runtime = "nodejs";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const testProfile = parseForYouTestProfile(params);
  const testQuery = forYouTestSearchString(testProfile) || undefined;

  return (
    <MagazineQueryProvider testQuery={testQuery}>
      <div className="min-h-full overflow-x-clip bg-white">
        <SiteHeader title="For You" testQuery={testQuery} />
        <Suspense
          fallback={
            <section className="mx-auto w-full max-w-3xl px-4 pt-3 md:max-w-6xl md:px-6 lg:max-w-[1080px] lg:pl-8 lg:pr-8">
              <div className="h-24 animate-pulse rounded-[8px] bg-[#eee]" />
            </section>
          }
        >
          <ForYouTestFilterSection testProfile={testProfile} pathname="/" />
        </Suspense>
        <Suspense fallback={<RootLoading />}>
          <HomeFeed testProfile={testProfile} testQuery={testQuery} />
        </Suspense>
        <SiteFooter />
      </div>
    </MagazineQueryProvider>
  );
}
