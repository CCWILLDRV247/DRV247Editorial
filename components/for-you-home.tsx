import { Fragment, type ReactNode } from "react";
import { CarouselStoryCard, CategoryCarousel, type CategoryLane } from "@/components/category-carousel";
import { CommunityDiscoverySection } from "@/components/engagement/community-discovery";
import { PersonalMarksRail } from "@/components/engagement/personal-marks-rail";
import { DeskModule } from "@/components/desk-module";
import { EditorialInterludeBlock } from "@/components/editorial-interlude";
import { InterludeRecentSync } from "@/components/interlude-recent-sync";
import { OpenerRecentSync } from "@/components/opener-recent-sync";
import { SectionIntro } from "@/components/site-chrome";
import { StoryCard, StoryHero } from "@/components/story-card";
import type { EditorialInterlude } from "@/lib/engine/editorial-interlude";
import {
  HOMEPAGE_COMPOSITION,
  MAGAZINE_LAYOUT,
  isSoloMagazineRail,
} from "@/lib/engine/editorial-composition";
import type { ForYouCopy, ForYouLane } from "@/lib/engine/for-you-home";
import type { PrintModule } from "@/lib/engine/print";
import { PrintModuleRail } from "@/components/print-module";
import type { SelectedHomepageInterlude } from "@/lib/engine/interlude-selection";
import { selectHomeLead } from "@/lib/engine/home-lead";
import type { CommunityDiscovery } from "@/lib/engagement/community";
import type { StoryDto } from "@/lib/stories";

type ForYouLaneDisplay = Omit<ForYouLane, "stories"> & { stories: StoryDto[] };

function storyCardGrid(cards: StoryDto[]) {
  if (cards.length === 0) return null;
  return (
    <div className={MAGAZINE_LAYOUT.gutter}>
      <div
        className={
          isSoloMagazineRail(cards.length)
            ? "grid w-full min-w-0 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-1"
            : "grid w-full min-w-0 gap-3 md:grid-cols-2 md:gap-4"
        }
      >
        {cards.map((story) => (
          <StoryCard key={story.id} story={story} />
        ))}
      </div>
    </div>
  );
}

function InterestLane({
  heading,
  dek,
  empty,
  stories,
}: {
  heading: string;
  dek?: string;
  empty?: string;
  stories: StoryDto[];
}) {
  if (stories.length === 0 && !empty) return null;

  return (
    <section className="min-w-0">
      <div className={MAGAZINE_LAYOUT.gutter}>
        <p className={HOMEPAGE_COMPOSITION.sectionTitle}>
          {heading}
        </p>
        {dek ? (
          <p className="mt-2 font-display text-[11px] font-bold uppercase tracking-[0.08em] text-[#1b1d1f]/50 md:mt-1.5 md:text-xs md:text-[#1b1d1f]/55">
            {dek}
          </p>
        ) : null}
        {empty && stories.length === 0 ? (
          <p className="mt-4 max-w-xl text-base leading-[22px] tracking-[-0.32px] text-[#1b1d1f]/75 md:mt-3">
            {empty}
          </p>
        ) : null}
      </div>
      {stories.length > 0 ? (
        <div className={MAGAZINE_LAYOUT.railGutter}>
          <div
            data-magazine-rail="interests"
            data-magazine-rail-solo={isSoloMagazineRail(stories.length) ? "" : undefined}
            className={
              isSoloMagazineRail(stories.length) ? MAGAZINE_LAYOUT.railSolo : MAGAZINE_LAYOUT.rail
            }
          >
            {stories.map((story) => (
              <CarouselStoryCard
                key={story.id}
                story={story}
                solo={isSoloMagazineRail(stories.length)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function interludeMap(interludes: SelectedHomepageInterlude[]) {
  return new Map(interludes.map((item) => [item.slot, item.interlude]));
}

function HomepageInterlude({
  interlude,
  slot,
}: {
  interlude: EditorialInterlude;
  slot: SelectedHomepageInterlude["slot"];
}) {
  return <EditorialInterludeBlock interlude={interlude} slot={slot} size="home" />;
}

export function ForYouHomeHero({
  copy,
  forYourCar,
  yourInterests,
  picks,
  filter,
}: {
  copy: ForYouCopy;
  forYourCar: ForYouLaneDisplay;
  yourInterests: ForYouLaneDisplay;
  picks: StoryDto[];
  filter?: ReactNode;
}) {
  const { hero, leadCards, openerIds } = selectHomeLead(forYourCar, yourInterests, picks);
  return (
    <>
      <OpenerRecentSync openerIds={openerIds} />
      <div className={`flex min-w-0 flex-col ${MAGAZINE_LAYOUT.page} ${HOMEPAGE_COMPOSITION.pageGap}`}>
        <section className={`flex min-w-0 flex-col ${HOMEPAGE_COMPOSITION.heroGap}`}>
          <div className="flex min-w-0 flex-col">
            {hero ? <StoryHero story={hero} titleLeading="loose" square composition /> : null}
            {filter}
          </div>
          <div className="flex min-w-0 flex-col gap-6 md:gap-7">
            <SectionIntro
              kicker={copy.kicker}
              dek={copy.dek}
              blurb={copy.blurb}
              stackKickerOnMobile
              homeSpacing
            />
            {forYourCar.empty ? (
              <p className={`text-base leading-[22px] tracking-[-0.32px] text-[#1b1d1f] ${MAGAZINE_LAYOUT.gutter}`}>
                {forYourCar.empty}
              </p>
            ) : null}
            {leadCards.length > 0 ? storyCardGrid(leadCards) : null}
          </div>
        </section>
      </div>
    </>
  );
}

export function ForYouHomeRest({
  forYourCar,
  yourInterests,
  picks,
  carousels,
  interludes,
  print,
  community,
  excludeIds,
  testQuery,
}: {
  forYourCar: ForYouLaneDisplay;
  yourInterests: ForYouLaneDisplay;
  picks: StoryDto[];
  carousels: CategoryLane[];
  interludes: SelectedHomepageInterlude[];
  print?: PrintModule | null;
  community: CommunityDiscovery;
  excludeIds?: readonly number[];
  testQuery?: string;
}) {
  const carouselOpeners = carousels.flatMap((lane) => (lane.stories[0] ? [lane.stories[0].id] : []));
  const { openerIds } = selectHomeLead(forYourCar, yourInterests, picks, carouselOpeners);
  const bySlot = interludeMap(interludes);
  const afterPicks = bySlot.get("after-picks");
  const beforeCategories = bySlot.get("before-categories");
  const midCategories = bySlot.get("mid-categories");
  const beforeViewAll = bySlot.get("before-view-all");
  const midCarouselIndex = Math.floor((carousels.length - 1) / 2);
  const preCategoryInterludes: { slot: "after-picks" | "before-categories"; interlude: EditorialInterlude }[] = [];
  if (afterPicks) preCategoryInterludes.push({ slot: "after-picks", interlude: afterPicks });
  if (beforeCategories) preCategoryInterludes.push({ slot: "before-categories", interlude: beforeCategories });
  const firstInterlude = preCategoryInterludes[0];
  const remainingInterludes = preCategoryInterludes.slice(1);

  return (
    <>
      <InterludeRecentSync interludeIds={interludes.map((item) => item.interlude.id)} />
      <OpenerRecentSync openerIds={openerIds} />
      <div className={`flex min-w-0 flex-col ${MAGAZINE_LAYOUT.page} ${HOMEPAGE_COMPOSITION.pageGap}`}>
        {yourInterests.stories.length > 0 ? (
          <InterestLane
            heading={yourInterests.heading}
            dek={yourInterests.dek}
            empty={yourInterests.empty}
            stories={yourInterests.stories}
          />
        ) : null}

        {firstInterlude ? (
          <HomepageInterlude interlude={firstInterlude.interlude} slot={firstInterlude.slot} />
        ) : null}
      </div>

      <DeskModule stories={picks} />

      <div className={`flex min-w-0 flex-col ${MAGAZINE_LAYOUT.page} ${HOMEPAGE_COMPOSITION.pageGap}`}>
        {print ? <PrintModuleRail module={print} testQuery={testQuery} /> : null}

        {remainingInterludes.map((item) => (
          <HomepageInterlude key={item.slot} interlude={item.interlude} slot={item.slot} />
        ))}

        <div className={`flex min-w-0 flex-col ${HOMEPAGE_COMPOSITION.railGap}`}>
          {carousels.map((lane, index) => (
            <Fragment key={lane.slug}>
              <CategoryCarousel {...lane} lead={index === 0} />
              {midCategories && index === midCarouselIndex ? (
                <HomepageInterlude interlude={midCategories} slot="mid-categories" />
              ) : null}
            </Fragment>
          ))}
        </div>

        {beforeViewAll ? <HomepageInterlude interlude={beforeViewAll} slot="before-view-all" /> : null}

        <PersonalMarksRail excludeIds={excludeIds} testQuery={testQuery} />
        <CommunityDiscoverySection community={community} />
      </div>
    </>
  );
}

export function ForYouHome({
  copy,
  forYourCar,
  yourInterests,
  picks,
  carousels,
  interludes,
  print,
  community,
  testQuery,
  filter,
}: {
  copy: ForYouCopy;
  forYourCar: ForYouLaneDisplay;
  yourInterests: ForYouLaneDisplay;
  discover: ForYouLaneDisplay;
  community: CommunityDiscovery;
  picks: StoryDto[];
  carousels: CategoryLane[];
  interludes: SelectedHomepageInterlude[];
  print?: PrintModule | null;
  testQuery?: string;
  filter?: ReactNode;
}) {
  return (
    <div className={`flex flex-col pb-20 md:pb-24 ${HOMEPAGE_COMPOSITION.pageGap}`}>
      <ForYouHomeHero
        copy={copy}
        forYourCar={forYourCar}
        yourInterests={yourInterests}
        picks={picks}
        filter={filter}
      />
      <ForYouHomeRest
        forYourCar={forYourCar}
        yourInterests={yourInterests}
        picks={picks}
        carousels={carousels}
        interludes={interludes}
        print={print}
        community={community}
        testQuery={testQuery}
      />
    </div>
  );
}
