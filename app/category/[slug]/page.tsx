import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-chrome";
import { StoryFeed } from "@/components/story-feed";
import { getCategoryBySlug, listPublicStories } from "@/lib/stories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();
  const stories = await listPublicStories({ categoryId: category.id, limit: 24 });

  return (
    <div className="min-h-full bg-white">
      <SiteHeader title={category.name} backHref="/" />
      <main className="pt-2">
        <StoryFeed
          stories={stories}
          copyKey={category.slug}
          categoryName={category.name}
        />
      </main>
    </div>
  );
}
