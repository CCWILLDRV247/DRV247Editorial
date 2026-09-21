import Link from "next/link";
import { CarouselStoryCard, CategoryCarousel, type CategoryLane } from "@/components/category-carousel";
import { DeskModule } from "@/components/desk-module";
import { Interstitial, SectionIntro } from "@/components/site-chrome";
import { StoryCard, StoryHero } from "@/components/story-card";
import type { ForYouCopy, ForYouLane } from "@/lib/engine/for-you-home";
import { HOMEPAGE_LEAD_CARD_MAX } from "@/lib/engine/homepage-hierarchy";
import type { StoryDto } from "@/lib/stories";

type ForYouLaneDisplay = Omit<ForYouLane, "stories"> & { stories: StoryDto[] };

const PAGE_GUTTER =
  "min-w-0 pl-[calc(10px+env(safe-area-inset-left,0px))] pr-[calc(10px+env(safe-area-inset-right,0px))]";

function storyCardGrid(cards: StoryDto[]) {
  if (cards.length === 0) return null;
  return (
    <div className={PAGE_GUTTER}>
      <div className="grid w-full min-w-0 gap-2 md:grid-cols-2">
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
      <p className="font-display text-xl font-extrabold uppercase tracking-[-0.02em] text-[#1b1d1f]">
        {heading}
      </p>
      {dek ? (
        <p className="mt-1.5 font-display text-xs font-bold uppercase tracking-[0.08em] text-[#1b1d1f]/55">
          {dek}
        </p>
      ) : null}
      {empty && stories.length === 0 ? (
        <p className="mt-3 max-w-xl text-base leading-[22px] tracking-[-0.32px] text-[#1b1d1f]/75">
          {empty}
        </p>
      ) : null}
      {stories.length > 0 ? (
        <div className="mt-3 flex min-w-0 gap-2 overflow-x-auto pb-2 snap-x snap-mandatory [scrollbar-width:thin] md:mt-4">
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
    <section className={`border-t border-[#1b1d1f]/10 pt-8 ${PAGE_GUTTER}`}>
      <Link
        href="/category/cars"
        className="inline-flex min-h-11 items-center font-display text-lg font-extrabold uppercase tracking-[-0.02em] text-[#1b1d1f] underline-offset-4 hover:underline"
      >
        View all stories
      </Link>
      <p className="mt-2 max-w-md text-base leading-[22px] text-[#1b1d1f]/65">
        Browse the full desk across Cars, Culture, Driving, and Events.
      </p>
    </section>
  );
}

export function ForYouHome({
  copy,
  forYourCar,
  yourInterests,
  picks,
  carousels,
}: {
  copy: ForYouCopy;
  forYourCar: ForYouLaneDisplay;
  yourInterests: ForYouLaneDisplay;
  discover: ForYouLaneDisplay;
  picks: StoryDto[];
  carousels: CategoryLane[];
}) {
  const pickIds = new Set(picks.map((story) => story.id));
  const vehicleStories = forYourCar.stories.filter((story) => !pickIds.has(story.id));
  const hero =
    vehicleStories[0] ??
    yourInterests.stories.find((story) => !pickIds.has(story.id)) ??
    null;
  const leadCards = vehicleStories.slice(1, 1 + HOMEPAGE_LEAD_CARD_MAX);

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-10 pb-16 md:max-w-6xl md:gap-12">
      <section className="flex min-w-0 flex-col gap-8 md:gap-10">
        {hero ? <StoryHero story={hero} titleLeading="loose" square /> : null}
        <div className="flex min-w-0 flex-col gap-5 md:gap-6">
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

      <DeskModule stories={picks} />

      {yourInterests.stories.length > 0 ? (
        <InterestLane
          heading={yourInterests.heading}
          dek={yourInterests.dek}
          empty={yourInterests.empty}
          stories={yourInterests.stories}
        />
      ) : null}

      <Interstitial text={copy.interstitial} size="home" tuck={picks.length === 0} />

      <div className="flex min-w-0 flex-col gap-8 md:gap-10">
        {carousels.map((lane) => (
          <CategoryCarousel key={lane.slug} {...lane} />
        ))}
      </div>

      <ViewAllStories />
    </div>
  );
}
