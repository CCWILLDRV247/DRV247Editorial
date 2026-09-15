import Link from "next/link";
import type { StoryDto } from "@/lib/stories";
import { StoryImage } from "./story-image";

export type CategoryLane = {
  slug: string;
  name: string;
  stories: StoryDto[];
};

export function CategoryCarousel({ slug, name, stories }: CategoryLane) {
  return (
    <section className="min-w-0 px-4 md:px-0">
      <Link
        href={`/category/${slug}`}
        className="font-display text-2xl font-extrabold uppercase tracking-[-0.02em] text-[#1b1d1f]"
      >
        {name}
      </Link>
      {stories.length === 0 ? (
        <p className="mt-4 font-display text-base font-bold uppercase tracking-[-0.02em] text-[#1b1d1f]/45">
          Nothing on the {name.toLowerCase()} desk
        </p>
      ) : (
        <div className="mt-4 flex min-w-0 gap-2 overflow-x-auto pb-2 [scrollbar-width:thin] snap-x snap-mandatory">
          {stories.map((story) => (
            <Link
              key={`${slug}-${story.id}`}
              href={`/story/${story.id}`}
              className="w-[240px] shrink-0 snap-start"
            >
              <div className="relative h-[280px] overflow-hidden rounded-[12px] bg-[#1b1d1f]">
                <StoryImage src={story.imageUrl} alt="" />
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-b from-transparent to-[#1b1d1f]/85" />
                <p className="absolute bottom-4 left-4 right-4 font-display text-[11px] font-bold uppercase leading-none tracking-[-0.02em] text-white">
                  {story.source.name}
                </p>
              </div>
              <p className="mt-2 line-clamp-3 font-display text-[18px] font-extrabold uppercase leading-[0.92] tracking-[-0.02em] text-[#1b1d1f]">
                {story.title}
              </p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
