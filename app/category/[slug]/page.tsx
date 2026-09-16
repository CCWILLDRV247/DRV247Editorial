import { notFound, redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-chrome";
import { StoryFeed } from "@/components/story-feed";
import { LEGACY_NAV_TO_PRIMARY, contentPrimaryBySlug } from "@/config/magazine-nav";
import { listMagazineStories } from "@/lib/engine/magazine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (slug === "for-you") redirect("/");
  const mapped = LEGACY_NAV_TO_PRIMARY[slug];
  if (mapped && mapped !== slug) redirect(`/category/${mapped}`);
  const category = contentPrimaryBySlug(slug);
  if (!category) notFound();
  const stories = await listMagazineStories({ navSlug: slug, limit: 24 });

  return (
    <div className="min-h-full overflow-x-clip bg-white">
      <SiteHeader title={category.name} backHref="/" />
      <main className="pt-2">
        <StoryFeed stories={stories} copyKey={category.slug} categoryName={category.name} />
      </main>
    </div>
  );
}
