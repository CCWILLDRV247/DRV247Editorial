import { Fragment } from "react";
import { CarouselStoryCard, CategoryCarousel, type CategoryLane } from "@/components/category-carousel";
import { DeskModule } from "@/components/desk-module";
import { EditorialInterludeBlock } from "@/components/editorial-interlude";
import { InterludeRecentSync } from "@/components/interlude-recent-sync";
import { OpenerRecentSync } from "@/components/opener-recent-sync";
import { SectionIntro, SectionKicker } from "@/components/site-chrome";
import { StoryCard, StoryHero } from "@/components/story-card";
import type { EditorialInterlude } from "@/lib/engine/editorial-interlude";
import {
  HOMEPAGE_COMPOSITION,
  MAGAZINE_LAYOUT,
  forYouSectionIndices,
} from "@/lib/engine/editorial-composition";
import type { ForYouCopy, ForYouLane } from "@/lib/engine/for-you-home";
import type { PrintModule } from "@/lib/engine/print";
import { PrintModuleRail } from "@/components/print-module";
import { HOMEPAGE_LEAD_CARD_MAX } from "@/lib/engine/homepage-hierarchy";
import type { SelectedHomepageInterlude } from "@/lib/engine/interlude-selection";
import type { StoryDto } from "@/lib/stories";

type ForYouLaneDisplay = Omit<ForYouLane, "stories"> & { stories: StoryDto[] };

function storyCardGrid(cards: StoryDto[]) {
  if (cards.length === 0) return null;
  return (
    <div className={`${MAGAZINE_LAYOUT.gutter} lg:hidden`}>
      <div className="grid w-full min-w-0 gap-3 md:grid-cols-2 md:gap-4">
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
  kickerIndex,
}: {
  heading: string;
  dek?: string;
  empty?: string;
  stories: StoryDto[];
  kickerIndex?: number;
}) {
  if (stories.length === 0 && !empty) return null;

  return (
    <section className="min-w-0">
      <div className={MAGAZINE_LAYOUT.gutter}>
        <SectionKicker index={kickerIndex}>{heading}</SectionKicker>
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
        <div
          data-magazine-rail="interests"
          className={`${MAGAZINE_LAYOUT.gutter} ${MAGAZINE_LAYOUT.rail}`}
        >
          {stories.map((story) => (
            <CarouselStoryCard key={story.id} story={story} />
          ))}
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
  kickerIndex,
}: {
  interlude: EditorialInterlude;
  slot: SelectedHomepageInterlude["slot"];
  kickerIndex?: number;
}) {
  return (
    <EditorialInterludeBlock
      interlude={interlude}
      slot={slot}
      size="home"
      kickerIndex={kickerIndex}
    />
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
  testQuery,
}: {
  copy: ForYouCopy;
  forYourCar: ForYouLaneDisplay;
  yourInterests: ForYouLaneDisplay;
  discover: ForYouLaneDisplay;
  picks: StoryDto[];
  carousels: CategoryLane[];
  interludes: SelectedHomepageInterlude[];
  print?: PrintModule | null;
  testQuery?: string;
}) {
  const pickIds = new Set(picks.map((story) => story.id));
  const vehicleStories = forYourCar.stories.filter((story) => !pickIds.has(story.id));
  const hero =
    vehicleStories[0] ??
    yourInterests.stories.find((story) => !pickIds.has(story.id)) ??
    null;
  const leadCards = vehicleStories.slice(1, 1 + HOMEPAGE_LEAD_CARD_MAX);
  const openerIds = [
    ...(hero ? [hero.id] : []),
    ...leadCards.map((story) => story.id),
    ...carousels.flatMap((lane) => (lane.stories[0] ? [lane.stories[0].id] : [])),
  ];
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
  const printVisible = Boolean(print && print.publications.length > 0);
  const sectionIndex = forYouSectionIndices({
    interests: yourInterests.stories.length > 0,
    firstInterlude: Boolean(firstInterlude),
    picks: picks.length > 0,
    print: printVisible,
    remainingInterludeCount: remainingInterludes.length,
    carouselSlots: carousels.map((lane, index) => ({
      hasLane: lane.stories.length > 0,
      hasMidInterlude: Boolean(midCategories && index === midCarouselIndex),
    })),
    beforeViewAll: Boolean(beforeViewAll),
  });

  return (
    <>
      <InterludeRecentSync interludeIds={interludes.map((item) => item.interlude.id)} />
      <OpenerRecentSync openerIds={openerIds} />
      <div
        className={`flex flex-col pb-20 md:pb-24 ${MAGAZINE_LAYOUT.page} ${HOMEPAGE_COMPOSITION.pageGap}`}
      >
      <section className={`flex min-w-0 flex-col ${HOMEPAGE_COMPOSITION.heroGap}`}>
        {hero ? <StoryHero story={hero} titleLeading="loose" square composition poster /> : null}
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

      {yourInterests.stories.length > 0 ? (
        <InterestLane
          heading={yourInterests.heading}
          dek={yourInterests.dek}
          empty={yourInterests.empty}
          stories={yourInterests.stories}
          kickerIndex={sectionIndex.interests}
        />
      ) : null}

      {firstInterlude ? (
        <HomepageInterlude
          interlude={firstInterlude.interlude}
          slot={firstInterlude.slot}
          kickerIndex={sectionIndex.firstInterlude}
        />
      ) : null}

      <DeskModule stories={picks} kickerIndex={sectionIndex.picks} />

      {print ? (
        <PrintModuleRail
          module={print}
          testQuery={testQuery}
          kickerIndex={sectionIndex.print}
        />
      ) : null}

      {remainingInterludes.map((item, index) => (
        <HomepageInterlude
          key={item.slot}
          interlude={item.interlude}
          slot={item.slot}
          kickerIndex={sectionIndex.remainingInterludes[index]}
        />
      ))}

      <div className={`flex min-w-0 flex-col ${HOMEPAGE_COMPOSITION.railGap}`}>
        {carousels.map((lane, index) => (
          <Fragment key={lane.slug}>
            <CategoryCarousel
              {...lane}
              lead={index === 0}
              kickerIndex={sectionIndex.carousels[index]?.lane}
            />
            {midCategories && index === midCarouselIndex ? (
              <HomepageInterlude
                interlude={midCategories}
                slot="mid-categories"
                kickerIndex={sectionIndex.carousels[index]?.midInterlude}
              />
            ) : null}
          </Fragment>
        ))}
      </div>

      {beforeViewAll ? (
        <HomepageInterlude
          interlude={beforeViewAll}
          slot="before-view-all"
          kickerIndex={sectionIndex.beforeViewAll}
        />
      ) : null}
      </div>
    </>
  );
}
