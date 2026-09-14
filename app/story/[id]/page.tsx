import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { SiteHeader } from "@/components/site-chrome";
import { StoryImage } from "@/components/story-image";
import { formatStoryDate } from "@/lib/format";
import { getPublicStory } from "@/lib/stories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function StoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const story = await getPublicStory(Number(id));
  if (!story) notFound();

  return (
    <div className="min-h-full bg-white">
      <SiteHeader title={story.category.name} backHref={`/category/${story.category.slug}`} />
      <article className="mx-auto max-w-3xl pb-20">
        <div className="relative h-[553px] w-full overflow-hidden bg-[#1b1d1f] md:rounded-xl">
          <StoryImage src={story.imageUrl} alt="" />
        </div>
        <div className="px-7 pt-10 md:px-8">
          <h1 className="font-display text-[clamp(2.75rem,9vw,5rem)] font-black uppercase leading-[0.62] tracking-[-0.02em] text-[#1b1d1f]">
            {story.title}
          </h1>
          <p className="mt-6 flex items-center gap-3 font-display text-2xl font-extrabold uppercase tracking-[-0.02em]">
            <ChevronLeft className="size-4 rotate-180 opacity-0" aria-hidden />
            {story.source.name}
          </p>
          <p className="mt-2 font-display text-lg font-bold uppercase text-[#1b1d1f]/70">
            {formatStoryDate(story.publishedAt)} · {story.category.name}
          </p>
          <p className="mt-6 font-display text-[35px] font-extrabold uppercase leading-[0.64] tracking-[-0.02em]">
            Read the original — we only hold the teaser.
          </p>
          {story.summary ? (
            <p className="mt-6 text-[18px] leading-[22px] tracking-[-0.36px] text-[#1b1d1f]">
              {story.summary}
            </p>
          ) : null}
          <a
            href={story.canonicalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-10 flex h-11 w-full items-center justify-center rounded-[5px] bg-[#1b1d1f] font-display text-lg font-extrabold uppercase text-white"
          >
            Read on {story.source.name}
          </a>
          <p className="mt-4 text-[14px] leading-5 text-[#1b1d1f]/70">
            DRV247 is an aggregator. We store a headline, a short feed excerpt, and the outbound link — never the full third-party article.
          </p>
          <Link
            href={`/category/${story.category.slug}`}
            className="mt-6 flex h-11 w-full items-center justify-center rounded-[5px] border border-[#1b1d1f] bg-white font-display text-lg font-extrabold uppercase text-[#1b1d1f]"
          >
            Back to {story.category.name}
          </Link>
        </div>
      </article>
    </div>
  );
}
