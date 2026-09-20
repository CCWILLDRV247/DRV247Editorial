import Link from "next/link";
import { StoryCard } from "@/components/story-card";
import { StoryImage } from "@/components/story-image";
import { formatStoryDate } from "@/lib/format";
import type { StoryDto } from "@/lib/stories";

const PAGE_GUTTER =
  "pl-[calc(10px+env(safe-area-inset-left,0px))] pr-[calc(10px+env(safe-area-inset-right,0px))]";

function DeskPickCard({ story }: { story: StoryDto }) {
  const tag = story.desk?.labelName ?? story.category.name;
  return (
    <div className="w-[218px] shrink-0">
      <Link href={`/story/${story.id}`} className="block">
        <div className="relative h-[219px] overflow-hidden rounded-[12px] bg-[#cfcfcf]">
          <StoryImage
            src={story.imageUrl}
            sources={story.imageSources}
            category={story.category.name}
            alt=""
            eager
          />
          <div className="absolute bottom-4 left-5">
            <span className="inline-flex w-fit items-center rounded-[2.65px] bg-white px-2.5 py-1 font-display text-[12px] font-bold uppercase leading-none text-[#1b1d1f]">
              {tag}
            </span>
          </div>
        </div>
        <p className="mt-2 line-clamp-3 font-display text-base font-bold uppercase leading-[0.85] text-[#1b1d1f]">
          {story.title}
        </p>
        <p className="mt-1 font-display text-[12px] font-bold uppercase leading-none text-[#1b1d1f]/55">
          {formatStoryDate(story.publishedAt)}
        </p>
      </Link>
    </div>
  );
}

export function DeskModule({ stories }: { stories: StoryDto[] }) {
  if (stories.length === 0) return null;
  const featured = stories.find((story) => story.desk?.featured) ?? stories[0];
  const rest = stories.filter((story) => story.id !== featured.id);
  const note = featured.desk?.note ?? null;

  return (
    <section className="relative z-10 min-w-0">
      <div className={PAGE_GUTTER}>
        <p className="font-display text-2xl font-extrabold uppercase tracking-[-0.02em] text-[#1b1d1f]">
          From the DRV247 Desk
        </p>
        <p className="mt-2 max-w-xl text-[18px] leading-[22px] tracking-[-0.36px] text-[#1b1d1f]/70">
          A few stories we actually chose — not the algorithm.
        </p>
      </div>
      <div className={`mt-4 min-w-0 ${PAGE_GUTTER}`}>
        <StoryCard story={featured} />
        {note ? (
          <p className="mt-4 max-w-xl text-[18px] leading-[22px] tracking-[-0.36px] text-[#1b1d1f]">
            {note}
          </p>
        ) : null}
      </div>
      {rest.length > 0 ? (
        <div
          className={`mt-4 flex min-w-0 gap-2 overflow-x-auto pb-2 md:px-0 ${PAGE_GUTTER}`}
        >
          {rest.map((story) => (
            <div key={story.id}>
              <DeskPickCard story={story} />
              {story.desk?.note ? (
                <p className="mt-2 line-clamp-3 text-[14px] leading-5 text-[#1b1d1f]/80">
                  {story.desk.note}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
