import { CATEGORY_COPY } from "@/lib/db/seed";
import type { StoryDto } from "@/lib/stories";
import {
  EmptyStories,
  Interstitial,
  SectionIntro,
} from "@/components/site-chrome";
import { PickCard, StoryCard, StoryHero } from "@/components/story-card";

export function StoryFeed({
  stories,
  copyKey,
  categoryName,
  looseHero = false,
}: {
  stories: StoryDto[];
  copyKey: string;
  categoryName: string;
  looseHero?: boolean;
}) {
  const copy = CATEGORY_COPY[copyKey] ?? CATEGORY_COPY.home;
  if (stories.length === 0) {
    return (
      <div className="mx-auto max-w-3xl py-10">
        <SectionIntro
          kicker={copy.kicker}
          dek={copy.dek}
          blurb={copy.blurb}
          stackKickerOnMobile={copyKey === "home"}
          homeSpacing={copyKey === "home"}
        />
        <EmptyStories category={categoryName} />
      </div>
    );
  }

  const [hero, ...rest] = stories;
  const leadCards = rest.slice(0, 2);
  const picks = rest.slice(2, 6);
  const trailing = rest.slice(6);
  const storyCardGridClass =
    copyKey === "home"
      ? "mx-[10px] grid gap-2 md:grid-cols-2"
      : "grid gap-2 md:grid-cols-2";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 pb-16 md:max-w-6xl">
      <div
        className={
          copyKey === "home"
            ? "flex flex-col gap-[52px]"
            : "flex flex-col gap-8"
        }
      >
        <StoryHero story={hero} titleLeading={looseHero ? "loose" : "tight"} />
        <div
          className={
            copyKey === "home"
              ? "flex flex-col gap-[26px]"
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
          {leadCards.length > 0 ? (
            <div className={storyCardGridClass}>
              {leadCards.map((story) => (
                <StoryCard key={story.id} story={story} />
              ))}
            </div>
          ) : null}
        </div>
      </div>
      {picks.length > 0 ? (
        <section className="px-4 md:px-0">
          <p className="font-display text-2xl font-extrabold uppercase tracking-[-0.02em] text-[#1b1d1f]">
            Our picks
          </p>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
            {picks.map((story) => (
              <PickCard key={story.id} story={story} />
            ))}
          </div>
        </section>
      ) : null}
      <Interstitial text={copy.interstitial} />
      {trailing.length > 0 ? (
        <div className={storyCardGridClass}>
          {trailing.map((story) => (
            <StoryCard key={story.id} story={story} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
