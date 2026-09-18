import { ForYouHome } from "@/components/for-you-home";
import { ForYouTestFilter } from "@/components/for-you-test-filter";
import { SiteHeader } from "@/components/site-chrome";
import {
  forYouTestSearchString,
  parseForYouTestProfile,
  withProfileInCatalog,
} from "@/lib/engine/for-you-test";
import { getMagazineHome } from "@/lib/engine/magazine";
import { loadForYouTestCatalog } from "@/lib/engine/queries";

export const runtime = "nodejs";
export const revalidate = 60;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const testProfile = parseForYouTestProfile(params);
  const testQuery = forYouTestSearchString(testProfile) || undefined;
  const [home, catalogRows] = await Promise.all([
    getMagazineHome(testProfile),
    loadForYouTestCatalog(),
  ]);
  const catalog = withProfileInCatalog(catalogRows, testProfile);
  return (
    <div className="min-h-full overflow-x-clip bg-white">
      <SiteHeader title={home.copy.headerTitle} testQuery={testQuery} />
      <ForYouTestFilter initial={testProfile} catalog={catalog} />
      <main className="relative z-0 pt-2">
        <ForYouHome
          copy={home.copy}
          forYourCar={home.forYourCar}
          yourInterests={home.yourInterests}
          discover={home.discover}
          carousels={home.carousels}
        />
      </main>
    </div>
  );
}
