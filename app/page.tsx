import { SiteHeader } from "@/components/site-chrome";
import { StoryFeed } from "@/components/story-feed";
import { listPublicStories } from "@/lib/stories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function HomePage() {
  const stories = await listPublicStories({ limit: 24 });
  return (
    <div className="min-h-full bg-white">
      <SiteHeader title="Stories" />
      <main className="pt-2">
        <StoryFeed stories={stories} copyKey="home" categoryName="the desk" />
      </main>
    </div>
  );
}
