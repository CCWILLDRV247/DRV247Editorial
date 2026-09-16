import { SiteHeader } from "@/components/site-chrome";
import { StoryFeed } from "@/components/story-feed";
import { getMagazineHome } from "@/lib/engine/magazine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function HomePage() {
  const { stories, carousels } = await getMagazineHome();
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
