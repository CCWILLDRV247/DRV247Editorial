import { Suspense, cache } from "react";
import { ForYouHomeHero, ForYouHomeRest } from "@/components/for-you-home";
import { ForYouTestFilterSection } from "@/components/magazine/for-you-test-filter-section";
import { ListingMain } from "@/components/listing-main";
import { MagazinePageTransition } from "@/components/magazine-page-transition";
import { HOMEPAGE_COMPOSITION, MAGAZINE_LAYOUT } from "@/lib/engine/editorial-composition";
import {
  forYouTestIsActive,
  type ForYouTestProfile,
} from "@/lib/engine/for-you-test";
import { INTERLUDE_RECENT_COOKIE, parseInterludeRecentIds } from "@/lib/engine/interlude-recent";
import { emptyOpenerRecent, OPENER_RECENT_COOKIE, parseOpenerRecent } from "@/lib/engine/opener-recent";
import { getMagazineHero, getMagazineHome } from "@/lib/engine/magazine";
import { cookies } from "next/headers";

/** Cookies stay off the default `/` path so anonymous HTML can be cached. */
const readHomePersonalisation = cache(async (active: boolean) => {
  if (!active) {
    return { recentIds: [] as string[], openerRecent: emptyOpenerRecent() };
  }
  const cookieStore = await cookies();
  return {
    recentIds: parseInterludeRecentIds(cookieStore.get(INTERLUDE_RECENT_COOKIE)?.value),
    openerRecent: parseOpenerRecent(cookieStore.get(OPENER_RECENT_COOKIE)?.value),
  };
});

export function HomeHeroFallback() {
  return (
    <div className={MAGAZINE_LAYOUT.page}>
      <div className="h-[553px] animate-pulse bg-[#cfcfcf] lg:h-[420px] lg:rounded-xl" />
      <div className={`${MAGAZINE_LAYOUT.gutter} mt-8 space-y-3`}>
        <div className="h-8 w-48 animate-pulse rounded bg-[#eee]" />
        <div className="h-4 w-72 animate-pulse rounded bg-[#eee]" />
      </div>
    </div>
  );
}

export function HomeRestFallback() {
  return (
    <div className={`${MAGAZINE_LAYOUT.page} space-y-8`}>
      <div className="h-8 w-56 animate-pulse rounded bg-[#eee]" />
      <div className="h-[220px] animate-pulse rounded-[12px] bg-[#cfcfcf]" />
      <div className="h-[500px] animate-pulse rounded-xl bg-[#cfcfcf] lg:h-[380px]" />
    </div>
  );
}

async function HomeHero({
  testProfile,
}: {
  testProfile: ForYouTestProfile;
}) {
  const { openerRecent } = await readHomePersonalisation(forYouTestIsActive(testProfile));
  const home = await getMagazineHero(testProfile, openerRecent);
  return (
    <ForYouHomeHero
      copy={home.copy}
      forYourCar={home.forYourCar}
      yourInterests={home.yourInterests}
      picks={home.picks}
      filter={<ForYouTestFilterSection testProfile={testProfile} pathname="/" />}
    />
  );
}

async function HomeRest({
  testProfile,
  testQuery,
}: {
  testProfile: ForYouTestProfile;
  testQuery?: string;
}) {
  const { recentIds, openerRecent } = await readHomePersonalisation(forYouTestIsActive(testProfile));
  const home = await getMagazineHome(testProfile, recentIds, openerRecent);
  return (
    <ForYouHomeRest
      forYourCar={home.forYourCar}
      yourInterests={home.yourInterests}
      picks={home.picks}
      carousels={home.carousels}
      interludes={home.interludes}
      print={home.print}
      testQuery={testQuery}
    />
  );
}

export function HomeFeed({
  testProfile,
  testQuery,
}: {
  testProfile: ForYouTestProfile;
  testQuery?: string;
}) {
  return (
    <MagazinePageTransition>
      <ListingMain className="relative z-0 pt-2">
        <div className={`flex flex-col pb-20 md:pb-24 ${HOMEPAGE_COMPOSITION.pageGap}`}>
          <Suspense fallback={<HomeHeroFallback />}>
            <HomeHero testProfile={testProfile} />
          </Suspense>
          <Suspense fallback={<HomeRestFallback />}>
            <HomeRest testProfile={testProfile} testQuery={testQuery} />
          </Suspense>
        </div>
      </ListingMain>
    </MagazinePageTransition>
  );
}
