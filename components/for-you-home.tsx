import { CategoryCarousel, type CategoryLane } from "@/components/category-carousel";
import { Interstitial, SectionIntro } from "@/components/site-chrome";
import { PickCard, StoryCard, StoryHero } from "@/components/story-card";
import type { ForYouCopy, ForYouLane } from "@/lib/engine/for-you-home";
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

function CompactLane({
  heading,
  dek,
  empty,
  stories,
  picks = false,
}: {
  heading: string;
  dek?: string;
  empty?: string;
  stories: StoryDto[];
  picks?: boolean;
}) {
  if (stories.length === 0 && !empty) return null;

  if (!picks) {
    return (
      <section className="min-w-0">
        <div className={PAGE_GUTTER}>
          <p className="font-display text-2xl font-extrabold uppercase tracking-[-0.02em] text-[#1b1d1f]">
            {heading}
          </p>
          {dek ? (
            <p className="mt-2 font-display text-sm font-bold uppercase tracking-[0.08em] text-[#1b1d1f]/55">
              {dek}
            </p>
          ) : null}
          {empty && stories.length === 0 ? (
            <p className="mt-4 max-w-xl text-[18px] leading-[22px] tracking-[-0.36px] text-[#1b1d1f]">
              {empty}
            </p>
          ) : null}
          {stories.length > 0 ? (
            <div className="mt-4 grid w-full min-w-0 gap-2 md:grid-cols-2">
              {stories.map((story) => (
                <StoryCard key={story.id} story={story} />
              ))}
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="min-w-0 pl-4 pr-0 md:px-0">
      <p className="font-display text-2xl font-extrabold uppercase tracking-[-0.02em] text-[#1b1d1f]">
        {heading}
      </p>
      {dek ? (
        <p className="mt-2 font-display text-sm font-bold uppercase tracking-[0.08em] text-[#1b1d1f]/55">
          {dek}
        </p>
      ) : null}
      {empty && stories.length === 0 ? (
        <p className="mt-4 max-w-xl px-3 text-[18px] leading-[22px] tracking-[-0.36px] text-[#1b1d1f] md:px-0">
          {empty}
        </p>
      ) : null}
      {picks && stories.length > 0 ? (
        <div className="mt-4 flex min-w-0 gap-2 overflow-x-auto pb-2">
          {stories.map((story) => (
            <PickCard key={story.id} story={story} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function ForYouHome({
  copy,
  forYourCar,
  yourInterests,
  discover,
  carousels,
}: {
  copy: ForYouCopy;
  forYourCar: ForYouLaneDisplay;
  yourInterests: ForYouLaneDisplay;
  discover: ForYouLaneDisplay;
  carousels: CategoryLane[];
}) {
  const vehicleStories = forYourCar.stories;
  const hero = vehicleStories[0] ?? discover.stories[0];
  const vehicleRest = vehicleStories.slice(1);
  const leadCards = vehicleRest.slice(0, 2);
  const moreVehicle = vehicleRest.slice(2, 5);
  const discoverStories =
    hero && !vehicleStories[0] ? discover.stories.filter((story) => story.id !== hero.id) : discover.stories;

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-8 pb-16 md:max-w-6xl">
      <div className="flex min-w-0 flex-col gap-[52px]">
        {hero ? (
          <StoryHero story={hero} titleLeading="loose" square />
        ) : null}
        <div className="flex min-w-0 flex-col gap-[26px]">
          <SectionIntro
            kicker={copy.kicker}
            dek={copy.dek}
            blurb={copy.blurb}
            stackKickerOnMobile
            homeSpacing
          />
          {forYourCar.empty ? (
            <p className="px-7 text-[18px] leading-[22px] tracking-[-0.36px] text-[#1b1d1f] md:px-0">
              {forYourCar.empty}
            </p>
          ) : null}
          {leadCards.length > 0 ? storyCardGrid(leadCards) : null}
        </div>
      </div>
      {moreVehicle.length > 0 ? (
        <section className="min-w-0 pl-4 pr-0 md:px-0">
          <p className="font-display text-2xl font-extrabold uppercase tracking-[-0.02em] text-[#1b1d1f]">
            For your car
          </p>
          <div className="mt-4 flex min-w-0 gap-2 overflow-x-auto pb-2">
            {moreVehicle.map((story) => (
              <PickCard key={story.id} story={story} />
            ))}
          </div>
        </section>
      ) : null}
      <Interstitial text={copy.interstitial} size="home" />
      <CompactLane
        heading={yourInterests.heading}
        dek={yourInterests.dek}
        empty={yourInterests.empty}
        stories={yourInterests.stories}
        picks
      />
      <CompactLane
        heading={discover.heading}
        dek={discover.dek}
        stories={discoverStories}
      />
      {carousels.map((lane) => (
        <CategoryCarousel key={lane.slug} {...lane} />
      ))}
    </div>
  );
}
