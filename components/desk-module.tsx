import { PickCard, StoryCard } from "@/components/story-card";
import type { StoryDto } from "@/lib/stories";

export function DeskModule({ stories }: { stories: StoryDto[] }) {
  if (stories.length === 0) return null;
  const featured = stories.find((story) => story.desk?.featured) ?? stories[0];
  const rest = stories.filter((story) => story.id !== featured.id);
  const note = featured.desk?.note ?? null;

  return (
    <section className="min-w-0">
      <div className="px-[calc(10px+env(safe-area-inset-left,0px))] pr-[calc(10px+env(safe-area-inset-right,0px))] md:px-0">
        <p className="font-display text-2xl font-extrabold uppercase tracking-[-0.02em] text-[#1b1d1f]">
          From the DRV247 Desk
        </p>
        <p className="mt-2 max-w-xl text-[18px] leading-[22px] tracking-[-0.36px] text-[#1b1d1f]/70">
          A few stories we actually chose — not the algorithm.
        </p>
      </div>
      <div className="mt-4 min-w-0 pl-[calc(10px+env(safe-area-inset-left,0px))] pr-[calc(10px+env(safe-area-inset-right,0px))]">
        <StoryCard story={featured} />
        {note ? (
          <p className="mt-4 max-w-xl text-[18px] leading-[22px] tracking-[-0.36px] text-[#1b1d1f]">
            {note}
          </p>
        ) : null}
      </div>
      {rest.length > 0 ? (
        <div className="mt-4 flex min-w-0 gap-2 overflow-x-auto pb-2 pl-[calc(10px+env(safe-area-inset-left,0px))] pr-0 md:px-0">
          {rest.map((story) => (
            <div key={story.id} className="w-[218px] shrink-0">
              <PickCard story={story} />
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
