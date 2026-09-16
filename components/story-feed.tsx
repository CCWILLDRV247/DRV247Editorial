import { Fragment } from "react";
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

type FeedBlock =
  | { kind: "cards"; stories: StoryDto[] }
  | { kind: "lane"; slug: string };

function appendCards(blocks: FeedBlock[], stories: StoryDto[]) {
  if (stories.length === 0) return;
  const last = blocks[blocks.length - 1];
  if (last?.kind === "cards") {
    last.stories = last.stories.concat(stories);
    return;
  }
  blocks.push({ kind: "cards", stories: [...stories] });
}

function appendLane(
  blocks: FeedBlock[],
  slug: string,
  present: (slug: string) => CategoryLane | undefined,
) {
  if (!present(slug)) return;
  blocks.push({ kind: "lane", slug });
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
  const lane = (slug: string) =>
    carousels.find((item) => item.slug === slug && item.stories.length > 0);
  const copy = CATEGORY_COPY[copyKey] ?? CATEGORY_COPY.home;
  const deskVisual = true;
  if (stories.length === 0) {
    return (
      <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-8 py-10 md:max-w-6xl">
        <SectionIntro
          kicker={copy.kicker}
          dek={copy.dek}
          blurb={copy.blurb}
          stackKickerOnMobile={deskVisual}
          homeSpacing={deskVisual}
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
  const homeBlocks: FeedBlock[] = [];
  appendCards(homeBlocks, trailingThroughSketch);
  appendLane(homeBlocks, "classic", lane);
  appendCards(homeBlocks, classicSplit.head);
  if (classicSplit.hit) appendLane(homeBlocks, "culture", lane);
  appendCards(homeBlocks, classicSplit.tail);
  appendCards(homeBlocks, racingBridge);
  appendLane(homeBlocks, "racing", lane);
  appendCards(homeBlocks, racingRemainder);
  if (racingSplit.hit) appendLane(homeBlocks, "culture", lane);
  appendCards(homeBlocks, racingSplit.tail);
  appendCards(homeBlocks, modifiedBridge);
  appendLane(homeBlocks, "modified", lane);
  appendCards(homeBlocks, modifiedRemainder);
  if (modifiedSplit.hit || !plungeFound) {
    appendLane(homeBlocks, "culture", lane);
  }
  appendCards(homeBlocks, modifiedSplit.tail);
  appendLane(homeBlocks, "concourse", lane);
  const insetCards = deskVisual;
  const storyCardGrid = (cards: StoryDto[]) => {
    const grid = (
      <div className="grid w-full min-w-0 gap-2 md:grid-cols-2">
        {cards.map((story) => (
          <StoryCard key={story.id} story={story} />
        ))}
      </div>
    );
    if (!insetCards) {
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
          deskVisual
            ? "flex min-w-0 flex-col gap-[52px]"
            : "flex min-w-0 flex-col gap-8"
        }
      >
        <StoryHero
          story={hero}
          titleLeading={looseHero || deskVisual ? "loose" : "tight"}
          square={deskVisual}
        />
        <div
          className={
            deskVisual
              ? "flex min-w-0 flex-col gap-[26px]"
              : "contents"
          }
        >
          <SectionIntro
            kicker={copy.kicker}
            dek={copy.dek}
            blurb={copy.blurb}
            stackKickerOnMobile={deskVisual}
            homeSpacing={deskVisual}
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
          {homeBlocks.map((block, index) =>
            block.kind === "cards" ? (
              <Fragment key={`cards-${index}`}>
                {storyCardGrid(block.stories)}
              </Fragment>
            ) : (
              <CategoryCarousel key={block.slug} {...lane(block.slug)!} />
            ),
          )}
        </>
      )}
    </div>
  );
}
