import { StoryFeed } from "@/components/story-feed";
import { MagazinePageTransition } from "@/components/magazine-page-transition";
import {
  forYouTestIsActive,
  type ForYouTestProfile,
} from "@/lib/engine/for-you-test";
import { listMagazineStories } from "@/lib/engine/magazine";
import { OPENER_RECENT_COOKIE, parseOpenerRecent } from "@/lib/engine/opener-recent";
import { printModuleForSection } from "@/lib/engine/print";
import { cookies } from "next/headers";

export async function CategoryFeed({
  slug,
  categoryName,
  copyKey,
  testProfile,
  testQuery,
}: {
  slug: string;
  categoryName: string;
  copyKey: string;
  testProfile: ForYouTestProfile;
  testQuery?: string;
}) {
  const testActive = forYouTestIsActive(testProfile);
  const openerRecent = testActive
    ? parseOpenerRecent((await cookies()).get(OPENER_RECENT_COOKIE)?.value)
    : undefined;
  const stories = await listMagazineStories({
    navSlug: slug,
    testProfile: testActive ? testProfile : undefined,
    limit: 24,
    openerRecent,
  });
  const print = printModuleForSection(slug, testActive ? testProfile : undefined);

  return (
    <MagazinePageTransition>
      <main className="pt-2">
        <StoryFeed
          stories={stories}
          copyKey={copyKey}
          categoryName={categoryName}
          print={print}
          testQuery={testQuery}
        />
      </main>
    </MagazinePageTransition>
  );
}
