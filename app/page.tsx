import { ForYouHome } from "@/components/for-you-home";
import { ForYouTestFilter } from "@/components/for-you-test-filter";
import { MagazineQueryProvider } from "@/components/magazine-link";
import { SiteHeader } from "@/components/site-chrome";
import {
  forYouTestSearchString,
  parseForYouTestProfile,
  withProfileInCatalog,
} from "@/lib/engine/for-you-test";
import { INTERLUDE_RECENT_COOKIE, parseInterludeRecentIds } from "@/lib/engine/interlude-recent";
import { getMagazineHome } from "@/lib/engine/magazine";
import { loadForYouTestCatalog } from "@/lib/engine/queries";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const testProfile = parseForYouTestProfile(params);
  const testQuery = forYouTestSearchString(testProfile) || undefined;
  const recentIds = parseInterludeRecentIds((await cookies()).get(INTERLUDE_RECENT_COOKIE)?.value);
  const [home, catalogRows] = await Promise.all([
    getMagazineHome(testProfile, recentIds),
    loadForYouTestCatalog(),
  ]);
  const catalog = withProfileInCatalog(catalogRows, testProfile);
  return (
    <MagazineQueryProvider testQuery={testQuery}>
      <div className="min-h-full overflow-x-clip bg-white">
        <SiteHeader title={home.copy.headerTitle} testQuery={testQuery} />
        <ForYouTestFilter initial={testProfile} catalog={catalog} pathname="/" />
        <main className="relative z-0 pt-2">
          <ForYouHome
            copy={home.copy}
            forYourCar={home.forYourCar}
            yourInterests={home.yourInterests}
            discover={home.discover}
            picks={home.picks}
            carousels={home.carousels}
            interludes={home.interludes}
          />
        </main>
      </div>
    </MagazineQueryProvider>
  );
}
