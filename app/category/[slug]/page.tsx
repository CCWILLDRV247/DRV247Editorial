import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-chrome";
import { StoryFeed } from "@/components/story-feed";
import { ensureCultureArticles } from "@/lib/db/ensure";
import { MAGAZINE_NAV, listMagazineStories } from "@/lib/engine/magazine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = MAGAZINE_NAV.find((item) => item.slug === slug);
  if (!category) notFound();
  await ensureCultureArticles();
  const stories = listMagazineStories({ navSlug: slug, limit: 24 });

  return (
    <div className="min-h-full bg-white">
      <SiteHeader title={category.name} backHref="/" />
      <main className="pt-2">
        <StoryFeed stories={stories} copyKey={category.slug} categoryName={category.name} />
      </main>
    </div>
  );
}
