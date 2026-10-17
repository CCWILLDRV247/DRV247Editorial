import { cn } from "cn";
import { MagazineLink } from "@/components/magazine-link";
import { StoryMediaTarget } from "@/components/story-media-transition";
import { StoryOpenLink } from "@/components/story-open-link";
import { HOMEPAGE_COMPOSITION, MAGAZINE_LAYOUT } from "@/lib/engine/editorial-composition";
import type { StoryDto } from "@/lib/stories";
import { isVideoStory } from "@/lib/engine/video-story";
import { StoryImage } from "./story-image";

export type CategoryLane = {
  slug: string;
  name: string;
  stories: StoryDto[];
};

export function CarouselStoryCard({ story }: { story: StoryDto }) {
  return (
    <StoryOpenLink
      storyId={story.id}
      className={MAGAZINE_LAYOUT.storyRailCard}
    >
      <StoryMediaTarget storyId={story.id} className={MAGAZINE_LAYOUT.storyRailImage}>
        <StoryImage src={story.imageUrl} sources={story.imageSources} category={story.category.name} alt="" video={isVideoStory(story)} />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-b from-transparent to-[#1b1d1f]/85" />
        <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-1.5">
          <p className="font-display text-[11px] font-bold uppercase leading-none tracking-[-0.02em] text-white">
            {story.source.name}
          </p>
        </div>
      </StoryMediaTarget>
      <p className={MAGAZINE_LAYOUT.railTitle}>
        {story.title}
      </p>
    </StoryOpenLink>
  );
}

export function CategoryCarousel({ slug, name, stories, lead = false }: CategoryLane & { lead?: boolean }) {
  if (stories.length === 0) {
    return null;
  }

  return (
    <section className={cn("min-w-0 pl-4 pr-0 md:px-0 lg:px-0", lead && "pt-1 md:pt-2")}>
      <div className="flex min-w-0 items-baseline justify-between gap-3 pr-4 md:pr-0 lg:pr-8">
        <MagazineLink
          href={`/category/${slug}`}
          className={HOMEPAGE_COMPOSITION.sectionTitle}
        >
          {name}
        </MagazineLink>
        <MagazineLink
          href={`/category/${slug}`}
          className="shrink-0 font-display text-xs font-bold uppercase tracking-[0.08em] text-[#1b1d1f]/55 underline-offset-2 hover:underline"
        >
          View all
        </MagazineLink>
      </div>
      <div
        data-magazine-rail={`category:${slug}`}
        className={MAGAZINE_LAYOUT.rail}
      >
        {stories.map((story) => (
          <CarouselStoryCard key={`${slug}-${story.id}`} story={story} />
        ))}
      </div>
    </section>
  );
}
