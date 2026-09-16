import { SiteHeader } from "@/components/site-chrome";
import { StoryFeed } from "@/components/story-feed";
import { MAGAZINE_NAV } from "@/config/magazine-nav";
import { ensureCultureArticles } from "@/lib/db/ensure";
import { listMagazineStories } from "@/lib/engine/magazine";
import type { StoryDto } from "@/lib/stories";

function uniqueStories(stories: StoryDto[]) {
  const seen = new Set<number>();
  return stories.filter((story) => {
    if (seen.has(story.id)) return false;
    seen.add(story.id);
    return true;
  });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

export default async function HomePage() {
  await ensureCultureArticles();
  const stories = listMagazineStories({ limit: 24 });
  const featuredIds = new Set(stories.slice(0, 6).map((story) => story.id));
  const carousels = MAGAZINE_NAV.map((nav) => {
    const lane = listMagazineStories({ navSlug: nav.slug, limit: 16 });
    const fresh = lane.filter((story) => !featuredIds.has(story.id));
    return {
      slug: nav.slug,
      name: nav.name,
      stories: uniqueStories([...fresh, ...lane]).slice(0, 8),
    };
  });
  return (
    <div className="min-h-full overflow-x-clip bg-white">
      <SiteHeader title="Stories" />
      <main className="pt-2">
        <StoryFeed
          stories={stories}
          copyKey="home"
          categoryName="the desk"
          looseHero
          carousels={carousels}
        />
      </main>
    </div>
  );
}
