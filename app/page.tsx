import { SiteHeader } from "@/components/site-chrome";
import { StoryFeed } from "@/components/story-feed";
import { ensureCultureArticles } from "@/lib/db/ensure";
import { listMagazineStories } from "@/lib/engine/magazine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

export default async function HomePage() {
  await ensureCultureArticles();
  const stories = listMagazineStories({ limit: 24 });
  return (
    <div className="min-h-full bg-white">
      <SiteHeader title="Stories" />
      <main className="pt-2">
        <StoryFeed stories={stories} copyKey="home" categoryName="the desk" looseHero />
      </main>
    </div>
  );
}
