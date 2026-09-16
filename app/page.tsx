import { ForYouTestFilter } from "@/components/for-you-test-filter";
import { SiteHeader } from "@/components/site-chrome";
import { StoryFeed } from "@/components/story-feed";
import {
  forYouTestSearchString,
  parseForYouTestProfile,
  withProfileInCatalog,
} from "@/lib/engine/for-you-test";
import { getMagazineHome } from "@/lib/engine/magazine";
import { loadForYouTestCatalog } from "@/lib/engine/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const testProfile = parseForYouTestProfile(params);
  const { stories, carousels } = await getMagazineHome(testProfile);
  const testQuery = forYouTestSearchString(testProfile) || undefined;
  const catalog = withProfileInCatalog(await loadForYouTestCatalog(), testProfile);
  return (
    <div className="min-h-full overflow-x-clip bg-white">
      <SiteHeader title="For You" testQuery={testQuery} />
      <ForYouTestFilter initial={testProfile} catalog={catalog} />
      <main className="pt-2">
        <StoryFeed
          stories={stories}
          copyKey="home"
          categoryName="For You"
          looseHero
          carousels={carousels}
        />
      </main>
    </div>
  );
}
