import { Fragment } from "react";
import { CarouselStoryCard, CategoryCarousel, type CategoryLane } from "@/components/category-carousel";
import { MagazineLink } from "@/components/magazine-link";
import { DeskModule } from "@/components/desk-module";
import { EditorialInterludeBlock } from "@/components/editorial-interlude";
import { InterludeRecentSync } from "@/components/interlude-recent-sync";
import { SectionIntro } from "@/components/site-chrome";
import { StoryCard, StoryHero } from "@/components/story-card";
import type { EditorialInterlude } from "@/lib/engine/editorial-interlude";
import { HOMEPAGE_COMPOSITION } from "@/lib/engine/editorial-composition";
import type { ForYouCopy, ForYouLane } from "@/lib/engine/for-you-home";
import { HOMEPAGE_LEAD_CARD_MAX } from "@/lib/engine/homepage-hierarchy";
import type { SelectedHomepageInterlude } from "@/lib/engine/interlude-selection";
import type { StoryDto } from "@/lib/stories";

type ForYouLaneDisplay = Omit<ForYouLane, "stories"> & { stories: StoryDto[] };

const PAGE_GUTTER =
  "min-w-0 pl-[calc(10px+env(safe-area-inset-left,0px))] pr-[calc(10px+env(safe-area-inset-right,0px))]";

function storyCardGrid(cards: StoryDto[]) {
  if (cards.length === 0) return null;
  return (
    <div className={PAGE_GUTTER}>
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
}: {
  heading: string;
  dek?: string;
  empty?: string;
  stories: StoryDto[];
}) {
  if (stories.length === 0 && !empty) return null;

  return (
    <section className={`min-w-0 ${PAGE_GUTTER}`}>
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
      {stories.length > 0 ? (
        <div className="mt-4 flex min-w-0 gap-2.5 overflow-x-auto pb-2 snap-x snap-mandatory [scrollbar-width:thin] md:mt-5 md:gap-2">
          {stories.map((story) => (
            <CarouselStoryCard key={story.id} story={story} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ViewAllStories() {
  return (
    <section className={`border-t border-[#1b1d1f]/10 pt-10 md:pt-12 ${PAGE_GUTTER}`}>
      <MagazineLink
        href="/category/cars"
        className="inline-flex min-h-11 items-center font-display text-lg font-extrabold uppercase tracking-[-0.02em] text-[#1b1d1f] underline-offset-4 hover:underline"
      >
        View all stories
      </MagazineLink>
      <p className="mt-3 max-w-md text-base leading-[22px] text-[#1b1d1f]/65 md:mt-2">
        Browse the full desk across Cars, Culture, Driving, and Events.
      </p>
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

export function ForYouHome({
  copy,
  forYourCar,
  yourInterests,
  picks,
  carousels,
  interludes,
}: {
  copy: ForYouCopy;
  forYourCar: ForYouLaneDisplay;
  yourInterests: ForYouLaneDisplay;
  discover: ForYouLaneDisplay;
  picks: StoryDto[];
  carousels: CategoryLane[];
  interludes: SelectedHomepageInterlude[];
}) {
  const pickIds = new Set(picks.map((story) => story.id));
  const vehicleStories = forYourCar.stories.filter((story) => !pickIds.has(story.id));
  const hero =
    vehicleStories[0] ??
    yourInterests.stories.find((story) => !pickIds.has(story.id)) ??
    null;
  const leadCards = vehicleStories.slice(1, 1 + HOMEPAGE_LEAD_CARD_MAX);
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
      <div
        className={`mx-auto flex w-full min-w-0 max-w-3xl flex-col pb-20 md:max-w-6xl md:pb-24 ${HOMEPAGE_COMPOSITION.pageGap}`}
      >
      <section className={`flex min-w-0 flex-col ${HOMEPAGE_COMPOSITION.heroGap}`}>
        {hero ? <StoryHero story={hero} titleLeading="loose" square composition /> : null}
        <div className="flex min-w-0 flex-col gap-6 md:gap-7">
          <SectionIntro
            kicker={copy.kicker}
            dek={copy.dek}
            blurb={copy.blurb}
            stackKickerOnMobile
            homeSpacing
          />
          {forYourCar.empty ? (
            <p className={`text-base leading-[22px] tracking-[-0.32px] text-[#1b1d1f] ${PAGE_GUTTER}`}>
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
        />
      ) : null}

      {firstInterlude ? (
        <HomepageInterlude interlude={firstInterlude.interlude} slot={firstInterlude.slot} />
      ) : null}

      <DeskModule stories={picks} />

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

      <ViewAllStories />
      </div>
    </>
  );
}
