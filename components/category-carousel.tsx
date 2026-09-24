import { cn } from "cn";
import { MagazineLink } from "@/components/magazine-link";
import { HOMEPAGE_COMPOSITION } from "@/lib/engine/editorial-composition";
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
    <MagazineLink
      href={`/story/${story.id}`}
      className="w-[200px] shrink-0 snap-start md:w-[220px]"
    >
      <div className="relative h-[220px] overflow-hidden rounded-[12px] bg-[#1b1d1f] md:h-[240px]">
        <StoryImage src={story.imageUrl} sources={story.imageSources} category={story.category.name} alt="" eager video={isVideoStory(story)} />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-b from-transparent to-[#1b1d1f]/85" />
        <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-1.5">
          <p className="font-display text-[11px] font-bold uppercase leading-none tracking-[-0.02em] text-white">
            {story.source.name}
          </p>
        </div>
      </div>
      <p className="mt-2 line-clamp-2 font-display text-base font-extrabold uppercase leading-[0.92] tracking-[-0.02em] text-[#1b1d1f] md:text-[18px]">
        {story.title}
      </p>
    </MagazineLink>
  );
}

export function CategoryCarousel({ slug, name, stories, lead = false }: CategoryLane & { lead?: boolean }) {
  if (stories.length === 0) {
    return null;
  }

  return (
    <section className={cn("min-w-0 pl-4 pr-0 md:px-0", lead && "pt-1 md:pt-2")}>
      <div className="flex min-w-0 items-baseline justify-between gap-3 pr-4 md:pr-0">
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
      <div className="mt-4 flex min-w-0 gap-2.5 overflow-x-auto pb-2 snap-x snap-mandatory [scrollbar-width:thin] md:mt-5 md:gap-2">
        {stories.map((story) => (
          <CarouselStoryCard key={`${slug}-${story.id}`} story={story} />
        ))}
      </div>
    </section>
  );
}
