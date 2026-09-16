import { ForYouTestFilter } from "@/components/for-you-test-filter";
import { SiteHeader } from "@/components/site-chrome";
import { StoryFeed } from "@/components/story-feed";
import { forYouTestCatalog, parseForYouTestProfile } from "@/lib/engine/for-you-test";
import { getMagazineHome } from "@/lib/engine/magazine";

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
  return (
    <div className="min-h-full overflow-x-clip bg-white">
      <SiteHeader title="For You" />
      <ForYouTestFilter initial={testProfile} catalog={forYouTestCatalog()} />
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
