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
      {lane("racing") ? <CategoryCarousel {...lane("racing")!} /> : null}
      {picks.length > 0 ? (
        <section className="min-w-0 px-4 md:px-0">
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
      {lane("classic") ? <CategoryCarousel {...lane("classic")!} /> : null}
      <Interstitial
        text={copy.interstitial}
        size={copyKey === "home" ? "home" : "default"}
      />
      {lane("modified") ? <CategoryCarousel {...lane("modified")!} /> : null}
      {trailing.length > 0 ? storyCardGrid(trailing) : null}
      {lane("concourse") ? <CategoryCarousel {...lane("concourse")!} /> : null}
      {lane("culture") ? <CategoryCarousel {...lane("culture")!} /> : null}
    </div>
  );
}
