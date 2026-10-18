import { Suspense } from "react";
import { MagazineQueryProvider } from "@/components/magazine-link";
import { StoryArticle } from "@/components/magazine/story-article";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import StoryLoading from "./loading";
import { forYouTestSearchString, parseForYouTestProfile } from "@/lib/engine/for-you-test";

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
  const storyId = Number(id);

  return (
    <MagazineQueryProvider testQuery={testQuery}>
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
