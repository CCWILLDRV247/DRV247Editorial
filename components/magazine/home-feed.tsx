import { ForYouHome } from "@/components/for-you-home";
import { MagazinePageTransition } from "@/components/magazine-page-transition";
import type { ForYouTestProfile } from "@/lib/engine/for-you-test";
import { INTERLUDE_RECENT_COOKIE, parseInterludeRecentIds } from "@/lib/engine/interlude-recent";
import { OPENER_RECENT_COOKIE, parseOpenerRecent } from "@/lib/engine/opener-recent";
import { getMagazineHome } from "@/lib/engine/magazine";
import { cookies } from "next/headers";

export async function HomeFeed({
  testProfile,
  testQuery,
}: {
  testProfile: ForYouTestProfile;
  testQuery?: string;
}) {
  const cookieStore = await cookies();
  const recentIds = parseInterludeRecentIds(cookieStore.get(INTERLUDE_RECENT_COOKIE)?.value);
  const openerRecent = parseOpenerRecent(cookieStore.get(OPENER_RECENT_COOKIE)?.value);
  const home = await getMagazineHome(testProfile, recentIds, openerRecent);

  return (
    <MagazinePageTransition>
      <main className="relative z-0 pt-2">
        <ForYouHome
          copy={home.copy}
          forYourCar={home.forYourCar}
          yourInterests={home.yourInterests}
          discover={home.discover}
          picks={home.picks}
          carousels={home.carousels}
          interludes={home.interludes}
          print={home.print}
          testQuery={testQuery}
        />
      </main>
    </MagazinePageTransition>
  );
}
