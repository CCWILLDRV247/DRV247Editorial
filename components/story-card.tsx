import Link from "next/link";
import { formatStoryDate } from "@/lib/format";
import type { StoryDto } from "@/lib/stories";
import { StoryImage } from "./story-image";

export function FeatureTag({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center rounded-[4px] bg-white px-4 py-1.5 font-display text-lg font-bold uppercase leading-none text-[#1b1d1f]">
      {children}
    </span>
  );
}

export function StoryCard({ story }: { story: StoryDto }) {
  return (
    <Link
      href={`/story/${story.id}`}
      className="relative block h-[500px] overflow-hidden rounded-xl bg-[#1b1d1f] text-white"
    >
      <div className="absolute inset-0 opacity-80">
        <StoryImage src={story.imageUrl} alt="" />
      </div>
      <div className="absolute inset-x-0 bottom-0 h-[227px] bg-gradient-to-b from-transparent to-[#1b1d1f]" />
      <div className="absolute inset-0 flex flex-col justify-end px-7 pb-7 pr-6">
        <div className="flex flex-col gap-6">
          <FeatureTag>{story.category.name}</FeatureTag>
          <h2 className="font-display text-[clamp(2.5rem,8vw,5rem)] font-black uppercase leading-[0.62] tracking-[-0.02em]">
            {story.title}
          </h2>
          <p className="font-display text-[25px] font-bold uppercase leading-[0.64]">
            {formatStoryDate(story.publishedAt)}
          </p>
        </div>
      </div>
    </Link>
  );
}

export function StoryHero({ story }: { story: StoryDto }) {
  return (
    <Link
      href={`/story/${story.id}`}
      className="relative block h-[553px] overflow-hidden rounded-xl bg-[#1b1d1f] text-white"
    >
      <div className="absolute inset-0">
        <StoryImage src={story.imageUrl} alt="" />
      </div>
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-b from-transparent to-[#1b1d1f]/90" />
      <div className="absolute inset-x-7 bottom-10 flex flex-col gap-3">
        <FeatureTag>{story.category.name}</FeatureTag>
        <h1 className="font-display text-[clamp(2.75rem,9vw,5rem)] font-black uppercase leading-[0.62] tracking-[-0.02em]">
          {story.title}
        </h1>
        <p className="font-display text-[25px] font-bold uppercase leading-[0.64]">
          {story.source.name}
        </p>
      </div>
    </Link>
  );
}

export function PickCard({ story }: { story: StoryDto }) {
  return (
    <Link href={`/story/${story.id}`} className="w-[218px] shrink-0">
      <div className="relative h-[219px] overflow-hidden rounded-[12px] bg-[#cfcfcf]">
        <StoryImage src={story.imageUrl} alt="" />
        <div className="absolute bottom-4 left-5">
          <span className="inline-flex items-center rounded-[2.65px] bg-white px-2.5 py-1 font-display text-[12px] font-bold uppercase leading-none text-[#1b1d1f]">
            {story.category.name}
          </span>
        </div>
      </div>
      <p className="mt-2 truncate font-display text-base font-bold uppercase leading-[1.14] text-[#1b1d1f]">
        {story.title}
      </p>
    </Link>
  );
}
