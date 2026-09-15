import { CATEGORY_COPY } from "@/lib/db/seed";
import type { StoryDto } from "@/lib/stories";
import {
  EmptyStories,
  Interstitial,
  SectionIntro,
} from "@/components/site-chrome";
import {
  CategoryCarousel,
  type CategoryLane,
} from "@/components/category-carousel";
import { PickCard, StoryCard, StoryHero } from "@/components/story-card";

function splitSequential(items: StoryDto[], parts: number) {
  if (items.length === 0) {
    return Array.from({ length: parts }, () => [] as StoryDto[]);
  }
  const size = Math.ceil(items.length / parts);
  return Array.from({ length: parts }, (_, index) =>
    items.slice(index * size, (index + 1) * size),
  );
}

function isPlungeStory(story: StoryDto) {
  return /taking the plunge/i.test(story.title);
}

function splitThroughMatch(
  items: StoryDto[],
  match: (story: StoryDto) => boolean,
) {
  const index = items.findIndex(match);
  if (index < 0) {
    return { head: items, tail: [] as StoryDto[], hit: false };
  }
  return {
    head: items.slice(0, index + 1),
    tail: items.slice(index + 1),
    hit: true,
  };
}

export function StoryFeed({
  stories,
  copyKey,
  categoryName,
  looseHero = false,
  carousels = [],
}: {
  stories: StoryDto[];
  copyKey: string;
  categoryName: string;
  looseHero?: boolean;
  carousels?: CategoryLane[];
}) {
  const lane = (slug: string) => carousels.find((item) => item.slug === slug);
  const copy = CATEGORY_COPY[copyKey] ?? CATEGORY_COPY.home;
  if (stories.length === 0) {
    return (
      <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-8 py-10 md:max-w-6xl">
        <SectionIntro
          kicker={copy.kicker}
          dek={copy.dek}
          blurb={copy.blurb}
          stackKickerOnMobile={copyKey === "home"}
          homeSpacing={copyKey === "home"}
        />
        <EmptyStories category={categoryName} />
        {carousels.map((item) => (
          <CategoryCarousel key={item.slug} {...item} />
        ))}
      </div>
    );
  }

  const [hero, ...rest] = stories;
  const leadCards = rest.slice(0, 2);
  const picks = rest.slice(2, 6);
  const trailing = rest.slice(6);
  const sketchIndex = trailing.findIndex((story) =>
    /sketch body|ferrari expression for collectors/i.test(story.title),
  );
  const trailingThroughSketch =
    sketchIndex >= 0 ? trailing.slice(0, sketchIndex + 1) : trailing;
  const trailingAfterSketch =
    sketchIndex >= 0 ? trailing.slice(sketchIndex + 1) : [];
  const [afterClassic, afterRacing, afterModified] = splitSequential(
    trailingAfterSketch,
    3,
  );
  const classicSplit = splitThroughMatch(afterClassic, isPlungeStory);
  const racingSplit = splitThroughMatch(afterRacing, isPlungeStory);
  const modifiedSplit = splitThroughMatch(afterModified, isPlungeStory);
  const plungeFound =
    classicSplit.hit || racingSplit.hit || modifiedSplit.hit;
  const cultureThenRacing = classicSplit.hit && classicSplit.tail.length === 0;
  const cultureThenModified = racingSplit.hit && racingSplit.tail.length === 0;
  const racingBridge = cultureThenRacing
    ? racingSplit.head.slice(0, 1)
    : [];
  const racingRemainder = cultureThenRacing
    ? racingSplit.head.slice(1)
    : racingSplit.head;
  const modifiedBridge = cultureThenModified
    ? modifiedSplit.head.slice(0, 1)
    : [];
  const modifiedRemainder = cultureThenModified
    ? modifiedSplit.head.slice(1)
    : modifiedSplit.head;
  const insetHomeCards = copyKey === "home";
  const storyCardGrid = (cards: StoryDto[]) => {
    const grid = (
      <div className="grid w-full min-w-0 gap-2 md:grid-cols-2">
        {cards.map((story) => (
          <StoryCard key={story.id} story={story} />
        ))}
      </div>
    );
    if (!insetHomeCards) {
      return grid;
    }
    return (
      <div className="min-w-0 pl-[calc(10px+env(safe-area-inset-left,0px))] pr-[calc(10px+env(safe-area-inset-right,0px))]">
        {grid}
      </div>
    );
  };

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-8 pb-16 md:max-w-6xl">
      <div
        className={
          copyKey === "home"
            ? "flex min-w-0 flex-col gap-[52px]"
            : "flex min-w-0 flex-col gap-8"
        }
      >
        <StoryHero story={hero} titleLeading={looseHero ? "loose" : "tight"} />
        <div
          className={
            copyKey === "home"
              ? "flex min-w-0 flex-col gap-[26px]"
              : "contents"
          }
        >
          <SectionIntro
            kicker={copy.kicker}
            dek={copy.dek}
            blurb={copy.blurb}
            stackKickerOnMobile={copyKey === "home"}
            homeSpacing={copyKey === "home"}
          />
          {leadCards.length > 0 ? storyCardGrid(leadCards) : null}
        </div>
      </div>
      {picks.length > 0 ? (
        <section className="min-w-0 pl-4 pr-0 md:px-0">
          <p className="font-display text-2xl font-extrabold uppercase tracking-[-0.02em] text-[#1b1d1f]">
            Our picks
          </p>
          <div className="mt-4 flex min-w-0 gap-2 overflow-x-auto pb-2">
            {picks.map((story) => (
              <PickCard key={story.id} story={story} />
            ))}
          </div>
        </section>
      ) : null}
      <Interstitial
        text={copy.interstitial}
        size={copyKey === "home" ? "home" : "default"}
      />
      {carousels.length === 0 ? (
        trailing.length > 0 ? storyCardGrid(trailing) : null
      ) : (
        <>
          {trailingThroughSketch.length > 0
            ? storyCardGrid(trailingThroughSketch)
            : null}
          {lane("classic") ? <CategoryCarousel {...lane("classic")!} /> : null}
          {classicSplit.head.length > 0
            ? storyCardGrid(classicSplit.head)
            : null}
          {classicSplit.hit && lane("culture") ? (
            <CategoryCarousel {...lane("culture")!} />
          ) : null}
          {classicSplit.tail.length > 0
            ? storyCardGrid(classicSplit.tail)
            : null}
          {racingBridge.length > 0 ? storyCardGrid(racingBridge) : null}
          {lane("racing") ? <CategoryCarousel {...lane("racing")!} /> : null}
          {racingRemainder.length > 0 ? storyCardGrid(racingRemainder) : null}
          {racingSplit.hit && lane("culture") ? (
            <CategoryCarousel {...lane("culture")!} />
          ) : null}
          {racingSplit.tail.length > 0
            ? storyCardGrid(racingSplit.tail)
            : null}
          {modifiedBridge.length > 0 ? storyCardGrid(modifiedBridge) : null}
          {lane("modified") ? <CategoryCarousel {...lane("modified")!} /> : null}
          {modifiedRemainder.length > 0
            ? storyCardGrid(modifiedRemainder)
            : null}
          {(modifiedSplit.hit || !plungeFound) && lane("culture") ? (
            <CategoryCarousel {...lane("culture")!} />
          ) : null}
          {modifiedSplit.tail.length > 0
            ? storyCardGrid(modifiedSplit.tail)
            : null}
          {lane("concourse") ? (
            <CategoryCarousel {...lane("concourse")!} />
          ) : null}
        </>
      )}
    </div>
  );
}
