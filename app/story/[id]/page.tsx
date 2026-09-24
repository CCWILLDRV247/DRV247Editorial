import { notFound } from "next/navigation";
import { MagazineLink, MagazineQueryProvider } from "@/components/magazine-link";
import { SiteHeader } from "@/components/site-chrome";
import { StoryImage } from "@/components/story-image";
import { forYouTestSearchString, parseForYouTestProfile, withTestQuery } from "@/lib/engine/for-you-test";
import { getMagazineStory } from "@/lib/engine/magazine";
import { isVideoStory } from "@/lib/engine/video-story";
import { formatStoryDate } from "@/lib/format";

export const runtime = "nodejs";
export const revalidate = 60;

export default async function StoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const testQuery = forYouTestSearchString(parseForYouTestProfile(await searchParams)) || undefined;
  const story = await getMagazineStory(Number(id));
  if (!story) notFound();
  const intro = storyIntro(story.title, story.summary);
  const extract = storyExtract(story.aiSummary, story.title, intro);
  const categoryHref = withTestQuery(`/category/${story.category.slug}`, testQuery);

  return (
    <MagazineQueryProvider testQuery={testQuery}>
      <div className="min-h-full bg-white">
        <SiteHeader title={story.category.name} backHref="/" testQuery={testQuery} />
      <article className="mx-auto max-w-3xl pb-20">
        <div className="relative h-[553px] w-full overflow-hidden bg-[#1b1d1f] md:rounded-xl">
          <StoryImage src={story.imageUrl} sources={story.imageSources} category={story.category.name} alt="" priority video={isVideoStory(story)} />
        </div>
        <div className="px-7 pt-10 md:px-8">
          <h1 className="font-display text-[clamp(2.75rem,9vw,5rem)] font-black uppercase leading-[0.62] tracking-[-0.02em] text-[#1b1d1f]">
            {story.title}
          </h1>
          <p className="mt-6">
            <span className="inline-flex w-fit items-center rounded-[4px] bg-[#1b1d1f] px-4 py-1.5 font-display text-lg font-bold uppercase leading-none text-white">
              {story.source.name}
            </span>
          </p>
          {story.desk ? (
            <p className="mt-3">
              <span className="inline-flex w-fit items-center rounded-[4px] border border-[#1b1d1f] px-4 py-1.5 font-display text-lg font-bold uppercase leading-none text-[#1b1d1f]">
                {story.desk.labelName}
              </span>
            </p>
          ) : null}
          <p className="mt-2 font-display text-lg font-bold uppercase text-[#1b1d1f]/70">
            {formatStoryDate(story.publishedAt)} · {story.category.name}
            {isVideoStory(story) ? " · Video" : ""}
          </p>
          {story.desk?.note ? (
            <p className="mt-6 text-[18px] leading-[22px] tracking-[-0.36px] text-[#1b1d1f]">
              {story.desk.note}
            </p>
          ) : null}
          {intro ? (
            <p className="mt-6 font-display text-[35px] font-extrabold uppercase leading-[0.64] tracking-[-0.02em]">
              {intro}
            </p>
          ) : null}
          {extract ? (
            <p className="mt-8 text-[18px] leading-[22px] tracking-[-0.36px] text-[#1b1d1f]">
              {extract}
            </p>
          ) : null}
          <a
            href={story.canonicalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-10 flex h-11 w-full items-center justify-center rounded-[5px] bg-[#1b1d1f] font-display text-lg font-extrabold uppercase text-white"
          >
            {isVideoStory(story) ? `Watch on ${story.source.name}` : `Read on ${story.source.name}`}
          </a>
          <p className="mt-4 text-[14px] leading-5 text-[#1b1d1f]/70">
            DRV247 is an aggregator. We store a headline, a short feed excerpt, a short extract from
            the original, and the outbound link — never the full third-party article or the video
            file.
          </p>
          <MagazineLink
            href={categoryHref}
            className="mt-6 flex h-11 w-full items-center justify-center rounded-[5px] border border-[#1b1d1f] bg-white font-display text-lg font-extrabold uppercase text-[#1b1d1f]"
          >
            Back to {story.category.name}
          </MagazineLink>
        </div>
      </article>
    </div>
    </MagazineQueryProvider>
  );
}

function storyIntro(title: string, summary: string | null | undefined) {
  const intro = summary?.trim() ?? "";
  if (!intro) return null;
  if (intro.toLowerCase() === title.trim().toLowerCase()) return null;
  return intro;
}

function storyExtract(
  summary: string | null | undefined,
  title: string,
  intro: string | null,
) {
  const text = summary?.trim() ?? "";
  if (!text) return null;
  const lower = text.toLowerCase();
  if (lower === title.trim().toLowerCase()) return null;
  if (intro && lower === intro.toLowerCase()) return null;
  return text;
}
