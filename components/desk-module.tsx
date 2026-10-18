import { StoryMediaTarget } from "@/components/story-media-transition";
import { StoryOpenLink } from "@/components/story-open-link";
import { StoryImage } from "@/components/story-image";
import { isVideoStory } from "@/lib/engine/video-story";
import { PICKS_SECTION_DEK, PICKS_SECTION_HEADING } from "@/lib/engine/desk-labels";
import {
  HOMEPAGE_COMPOSITION,
  MAGAZINE_LAYOUT,
  isSoloMagazineRail,
} from "@/lib/engine/editorial-composition";
import type { StoryDto } from "@/lib/stories";

const PAGE_GUTTER = MAGAZINE_LAYOUT.picksInner;

function PickImageFrame({
  story,
  eager = false,
}: {
  story: StoryDto;
  eager?: boolean;
}) {
  const tag = story.desk?.labelName ?? story.category.name;
  return (
    <StoryMediaTarget storyId={story.id} className={MAGAZINE_LAYOUT.pickRailImage}>
      <StoryImage
        src={story.imageUrl}
        sources={story.imageSources}
        category={story.category.name}
        alt=""
        eager={eager}
        video={isVideoStory(story)}
      />
      <div className="absolute bottom-4 left-5 flex flex-col items-start gap-1.5">
        <span className="inline-flex w-fit items-center rounded-[2.65px] bg-white px-2.5 py-1 font-display text-[12px] font-bold uppercase leading-none text-[#1b1d1f]">
          {tag}
        </span>
      </div>
    </StoryMediaTarget>
  );
}

function DeskPickCard({
  story,
  solo = false,
  eager = false,
}: {
  story: StoryDto;
  solo?: boolean;
  eager?: boolean;
}) {
  return (
    <div className={solo ? MAGAZINE_LAYOUT.pickRailCardSolo : MAGAZINE_LAYOUT.pickRailCard}>
      <StoryOpenLink storyId={story.id} className="block">
        <PickImageFrame story={story} eager={eager} />
        <p className="mt-2 line-clamp-3 font-display text-base font-bold uppercase leading-[0.85] text-white lg:text-[20px] lg:leading-[0.88]">
          {story.title}
        </p>
        <p className="mt-1 truncate font-display text-[12px] font-bold uppercase leading-none text-white/55">
          {story.source.name}
        </p>
      </StoryOpenLink>
    </div>
  );
}

export function DeskModule({ stories }: { stories: StoryDto[] }) {
  if (stories.length === 0) return null;
  const featured = stories.find((story) => story.desk?.featured) ?? stories[0];
  const rest = stories.filter((story) => story.id !== featured.id);
  const note = featured.desk?.note ?? null;
  const solo = isSoloMagazineRail(stories.length);

  return (
    <section
      data-picks-band=""
      className={`${HOMEPAGE_COMPOSITION.picksBand} ${HOMEPAGE_COMPOSITION.picksAboveHeading}`}
    >
      <div className={MAGAZINE_LAYOUT.page}>
        <div className={PAGE_GUTTER}>
          <p className={HOMEPAGE_COMPOSITION.picksHeading}>
            {PICKS_SECTION_HEADING}
          </p>
          <p className="mt-3 max-w-xl text-base leading-[22px] tracking-[-0.32px] text-white/70 md:mt-2 md:text-[18px] md:leading-[22px] md:tracking-[-0.36px]">
            {PICKS_SECTION_DEK}
          </p>
        </div>
        <div
          data-magazine-rail="picks"
          data-magazine-rail-solo={solo ? "" : undefined}
          className={
            solo
              ? `mt-6 min-w-0 md:mt-8 ${PAGE_GUTTER}`
              : `mt-6 min-w-0 md:mt-8 ${PAGE_GUTTER} lg:flex lg:gap-3 lg:overflow-x-auto lg:pb-2 lg:snap-x lg:snap-mandatory`
          }
        >
          <div className={solo ? MAGAZINE_LAYOUT.pickRailCardSolo : MAGAZINE_LAYOUT.pickRailCard}>
            <StoryOpenLink
              storyId={featured.id}
              className={`${MAGAZINE_LAYOUT.featuredPick} block`}
            >
              <PickImageFrame story={featured} eager />
              <p className="mt-2 line-clamp-3 font-display text-base font-bold uppercase leading-[0.85] text-white lg:text-[20px] lg:leading-[0.88]">
                {featured.title}
              </p>
              <p className="mt-1 truncate font-display text-[12px] font-bold uppercase leading-none text-white/55">
                {featured.source.name}
              </p>
            </StoryOpenLink>
            {note ? (
              <p className="mt-4 max-w-xl font-display text-[18px] leading-[22px] tracking-[-0.02em] text-white">
                {note}
              </p>
            ) : null}
          </div>
          {rest.length > 0 ? (
            <div
              className={
                solo
                  ? "hidden"
                  : "mt-6 flex min-w-0 gap-2.5 overflow-x-auto pb-2 snap-x snap-mandatory [scrollbar-width:thin] md:mt-8 md:gap-2 lg:mt-0 lg:contents lg:overflow-visible lg:p-0"
              }
            >
              {rest.map((story) => (
                <div key={story.id}>
                  <DeskPickCard story={story} />
                  {story.desk?.note ? (
                    <p className="mt-2 line-clamp-3 text-[14px] leading-5 text-white/80">
                      {story.desk.note}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
