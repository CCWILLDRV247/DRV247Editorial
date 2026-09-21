import { notFound, redirect } from "next/navigation";
import { ForYouTestFilter } from "@/components/for-you-test-filter";
import { MagazineQueryProvider } from "@/components/magazine-link";
import { SiteHeader } from "@/components/site-chrome";
import { StoryFeed } from "@/components/story-feed";
import { LEGACY_NAV_TO_PRIMARY, contentPrimaryBySlug } from "@/config/magazine-nav";
import {
  forYouTestIsActive,
  forYouTestSearchString,
  parseForYouTestProfile,
  withProfileInCatalog,
  withTestQuery,
} from "@/lib/engine/for-you-test";
import { listMagazineStories } from "@/lib/engine/magazine";
import { loadForYouTestCatalog } from "@/lib/engine/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const testProfile = parseForYouTestProfile(await searchParams);
  const testQuery = forYouTestSearchString(testProfile) || undefined;
  if (slug === "for-you") redirect(withTestQuery("/", testQuery));
  const mapped = LEGACY_NAV_TO_PRIMARY[slug];
  if (mapped && mapped !== slug) redirect(withTestQuery(`/category/${mapped}`, testQuery));
  const category = contentPrimaryBySlug(slug);
  if (!category) notFound();
  const [stories, catalogRows] = await Promise.all([
    listMagazineStories({
      navSlug: slug,
      testProfile: forYouTestIsActive(testProfile) ? testProfile : undefined,
      limit: 24,
    }),
    loadForYouTestCatalog(),
  ]);
  const catalog = withProfileInCatalog(catalogRows, testProfile);

  return (
    <MagazineQueryProvider testQuery={testQuery}>
      <div className="min-h-full overflow-x-clip bg-white">
        <SiteHeader title={category.name} backHref="/" testQuery={testQuery} />
        <ForYouTestFilter initial={testProfile} catalog={catalog} pathname={`/category/${slug}`} />
        <main className="pt-2">
          <StoryFeed stories={stories} copyKey={category.slug} categoryName={category.name} />
        </main>
      </div>
    </MagazineQueryProvider>
  );
}
