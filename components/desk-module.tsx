import Link from "next/link";
import { StoryImage } from "@/components/story-image";
import { PICKS_SECTION_DEK, PICKS_SECTION_HEADING } from "@/lib/engine/desk-labels";
import { HOMEPAGE_COMPOSITION } from "@/lib/engine/editorial-composition";
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
        <p className="mt-1 truncate font-display text-[12px] font-bold uppercase leading-none text-[#1b1d1f]/55">
          {story.source.name}
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
    <section className="relative z-10 min-w-0 pt-10 md:pt-12">
      <div className={PAGE_GUTTER}>
        <p className={HOMEPAGE_COMPOSITION.sectionTitle}>
          {PICKS_SECTION_HEADING}
        </p>
        <p className="mt-3 max-w-xl text-base leading-[22px] tracking-[-0.32px] text-[#1b1d1f]/70 md:mt-2 md:text-[18px] md:leading-[22px] md:tracking-[-0.36px]">
          {PICKS_SECTION_DEK}
        </p>
      </div>
      <div className={`mt-6 min-w-0 md:mt-8 ${PAGE_GUTTER}`}>
        <Link href={`/story/${featured.id}`} className="block overflow-hidden rounded-[12px] border border-[#1b1d1f]/10 bg-[#fafafa]">
          <div className="relative h-[min(52vw,340px)] w-full overflow-hidden bg-[#1b1d1f] md:h-[380px]">
            <StoryImage
              src={featured.imageUrl}
              sources={featured.imageSources}
              category={featured.category.name}
              alt=""
              eager
            />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-b from-transparent to-[#1b1d1f]/90" />
            <div className="absolute inset-x-5 bottom-5 flex flex-col gap-2 text-white">
              <span className="inline-flex w-fit rounded-[2.65px] bg-white px-2.5 py-1 font-display text-[12px] font-bold uppercase leading-none text-[#1b1d1f]">
                {featured.desk?.labelName ?? featured.category.name}
              </span>
              <p className="line-clamp-3 font-display text-[clamp(1.5rem,5vw,2.25rem)] font-black uppercase leading-[0.88] tracking-[-0.02em]">
                {featured.title}
              </p>
              <p className="font-display text-[12px] font-bold uppercase leading-none text-white/80">
                {featured.source.name}
              </p>
            </div>
          </div>
        </Link>
        {note ? (
          <p className="mt-4 max-w-xl font-display text-[18px] leading-[22px] tracking-[-0.02em] text-[#1b1d1f]">
            {note}
          </p>
        ) : null}
      </div>
      {rest.length > 0 ? (
        <div
          className={`mt-6 flex min-w-0 gap-2.5 overflow-x-auto pb-2 md:mt-8 md:gap-2 md:px-0 ${PAGE_GUTTER}`}
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
