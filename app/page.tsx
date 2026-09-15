import { CultureFeed } from "@/components/culture-feed";
import { SiteHeader } from "@/components/site-chrome";
import { ensureCultureArticles } from "@/lib/db/ensure";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

export default async function HomePage() {
  await ensureCultureArticles();
  return (
    <div className="min-h-full bg-white">
      <SiteHeader title="Culture" />
      <CultureFeed />
    </div>
  );
}
