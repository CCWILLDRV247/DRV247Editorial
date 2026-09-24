import { cn } from "cn";
import { MagazineLink } from "@/components/magazine-link";
import type { StoryDto } from "@/lib/stories";
import { isVideoStory } from "@/lib/engine/video-story";
import { StoryImage } from "./story-image";

export function VideoMark({ tone = "dark" }: { tone?: "dark" | "light" }) {
  return (
    <span
      className={
        tone === "dark"
          ? "font-display text-[11px] font-bold uppercase tracking-[0.14em] text-white/70"
          : "font-display text-[10px] font-bold uppercase tracking-[0.14em] text-[#1b1d1f]/50"
      }
    >
      Video
    </span>
  );
}

function RelevanceLine({
  text,
  tone = "dark",
}: {
  text?: string | null;
  tone?: "dark" | "light";
}) {
  if (!text) return null;
  return (
    <p
      className={
        tone === "dark"
          ? "font-display text-sm font-bold uppercase leading-snug tracking-[0.06em] text-white/75"
          : "font-display text-xs font-bold uppercase leading-snug tracking-[0.06em] text-[#1b1d1f]/55"
      }
    >
      {text}
    </p>
  );
}

export function FeatureTag({ children }: { children: string }) {
  return (
    <span className="inline-flex w-fit self-start items-center rounded-[4px] bg-white px-4 py-1.5 font-display text-lg font-bold uppercase leading-none text-[#1b1d1f]">
      {children}
    </span>
  );
}

export function StoryCard({ story }: { story: StoryDto }) {
  const tag = story.desk?.labelName ?? story.category.name;
  return (
    <MagazineLink
      href={`/story/${story.id}`}
      className="relative block h-[500px] w-full min-w-0 overflow-hidden rounded-xl bg-[#1b1d1f] text-white"
    >
      <div className="absolute inset-0 opacity-80">
        <StoryImage src={story.imageUrl} sources={story.imageSources} category={story.category.name} alt="" video={isVideoStory(story)} />
      </div>
      <div className="absolute inset-x-0 bottom-0 h-[227px] bg-gradient-to-b from-transparent to-[#1b1d1f]" />
      <div className="absolute inset-0 flex flex-col justify-end px-7 pb-7 pr-6">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-start gap-2">
            <FeatureTag>{tag}</FeatureTag>
            {isVideoStory(story) ? <VideoMark /> : null}
          </div>
          <RelevanceLine text={story.relevanceExplanation} tone="dark" />
          <h2 className="font-display text-[clamp(2.5rem,8vw,5rem)] font-black uppercase leading-[0.70] tracking-[-0.02em]">
            {story.title}
          </h2>
          <p className="font-display text-[25px] font-bold uppercase leading-[0.64]">
            {story.source.name}
          </p>
        </div>
      </div>
    </MagazineLink>
  );
}

export function StoryHero({
  story,
  titleLeading = "tight",
  square = false,
  composition = false,
}: {
  story: StoryDto;
  titleLeading?: "tight" | "loose";
  square?: boolean;
  composition?: boolean;
}) {
  return (
    <MagazineLink
      href={`/story/${story.id}`}
      className={
        square
          ? cn(
              "relative block w-full min-w-0 overflow-hidden rounded-none bg-[#1b1d1f] text-white",
              composition
                ? "h-[min(72svh,520px)] md:h-[553px]"
                : "h-[553px]",
            )
          : "relative block h-[553px] w-full min-w-0 overflow-hidden rounded-xl bg-[#1b1d1f] text-white"
      }
    >
      <div className="absolute inset-0">
        <StoryImage src={story.imageUrl} sources={story.imageSources} category={story.category.name} alt="" priority video={isVideoStory(story)} />
      </div>
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-b from-transparent to-[#1b1d1f]/90" />
      <div className="absolute inset-x-5 bottom-6 flex flex-col gap-3 md:inset-x-7 md:bottom-10 md:gap-3">
        <div className="flex flex-col items-start gap-2">
          <FeatureTag>{story.desk?.labelName ?? story.category.name}</FeatureTag>
          {isVideoStory(story) ? <VideoMark /> : null}
        </div>
        <RelevanceLine text={story.relevanceExplanation} tone="dark" />
        <h1
          className={
            titleLeading === "loose"
              ? "font-display text-[clamp(2.35rem,8.5vw,5rem)] font-black uppercase leading-[0.68] tracking-[-0.02em] md:text-[clamp(2.75rem,9vw,5rem)] md:leading-[0.66]"
              : "font-display text-[clamp(2.35rem,8.5vw,5rem)] font-black uppercase leading-[0.64] tracking-[-0.02em] md:text-[clamp(2.75rem,9vw,5rem)] md:leading-[0.62]"
          }
        >
          {story.title}
        </h1>
        <p className="font-display text-[25px] font-bold uppercase leading-[0.64]">
          {story.source.name}
        </p>
      </div>
    </MagazineLink>
  );
}

export function PickCard({ story }: { story: StoryDto }) {
  const tag = story.desk?.labelName ?? story.category.name;
  return (
    <MagazineLink href={`/story/${story.id}`} className="w-[218px] shrink-0">
      <div className="relative h-[219px] overflow-hidden rounded-[12px] bg-[#cfcfcf]">
        <StoryImage src={story.imageUrl} sources={story.imageSources} category={story.category.name} alt="" eager video={isVideoStory(story)} />
        <div className="absolute bottom-4 left-5 flex flex-col items-start gap-1.5">
          <span className="inline-flex w-fit items-center rounded-[2.65px] bg-white px-2.5 py-1 font-display text-[12px] font-bold uppercase leading-none text-[#1b1d1f]">
            {tag}
          </span>
          {isVideoStory(story) ? <VideoMark /> : null}
        </div>
      </div>
      <p className="mt-2 truncate font-display text-base font-bold uppercase leading-[0.70] text-[#1b1d1f]">
        {story.title}
      </p>
      <p className="mt-1 truncate font-display text-[12px] font-bold uppercase leading-none text-[#1b1d1f]/55">
        {story.source.name}
      </p>
      <RelevanceLine text={story.relevanceExplanation} tone="light" />
    </MagazineLink>
  );
}
