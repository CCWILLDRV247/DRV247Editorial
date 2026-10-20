import type { Metadata } from "next";
import { Suspense } from "react";
import { MagazineQueryProvider } from "@/components/magazine-link";
import { StoryArticle } from "@/components/magazine/story-article";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { forYouTestSearchString, parseForYouTestProfile } from "@/lib/engine/for-you-test";
import { getMagazineStory } from "@/lib/engine/magazine";
import { buildNewsArticleJsonLd } from "@/lib/seo/json-ld";
import { buildStoryMetadata, editorialCanonicalPath } from "@/lib/seo/metadata";
import StoryLoading from "./loading";

export const runtime = "nodejs";
export const revalidate = 60;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const storyId = Number((await params).id);
  if (!Number.isFinite(storyId)) return { title: "Story" };
  const story = await getMagazineStory(storyId);
  if (!story) return { title: "Story" };
  return buildStoryMetadata(
    {
      id: story.id,
      title: story.title,
      summary: story.summary,
      imageUrl: story.imageUrl,
      publishedAt: story.publishedAt,
      publicationName: story.source.name,
    },
    await searchParams,
  );
}

export default async function StoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const testQuery = forYouTestSearchString(parseForYouTestProfile(await searchParams)) || undefined;
  const storyId = Number(id);
  const story = Number.isFinite(storyId) ? await getMagazineStory(storyId) : null;
  const pageUrl = editorialCanonicalPath(`/story/${id}`);
  const jsonLd =
    story &&
    buildNewsArticleJsonLd({
      headline: story.title,
      description: story.summary.trim(),
      imageUrl: story.imageUrl,
      datePublished: story.publishedAt,
      authorName: story.source.name,
      pageUrl,
    });

  return (
    <MagazineQueryProvider testQuery={testQuery}>
      {jsonLd ? <JsonLdScript data={jsonLd} /> : null}
      <div className="min-h-full bg-white">
        <SiteHeader title="Story" backHref="/" testQuery={testQuery} />
        <Suspense fallback={<StoryLoading />}>
          <StoryArticle id={storyId} testQuery={testQuery} />
        </Suspense>
        <SiteFooter />
      </div>
    </MagazineQueryProvider>
  );
}
