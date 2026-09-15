import Link from "next/link";
import { SiteHeader } from "@/components/site-chrome";
import { getDb } from "@/lib/db";
import { listEditorial } from "@/lib/engine/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function EditorialPage() {
  getDb();
  const articles = listEditorial({ userId: "demo-chris", limit: 24 });

  return (
    <div className="min-h-full bg-white">
      <SiteHeader title="Culture" />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <p className="font-display text-sm font-bold uppercase tracking-wide text-[#1b1d1f]/60">
          For you · demo garage (Porsche 911 964)
        </p>
        <h1 className="mt-2 font-display text-5xl font-black uppercase leading-[0.8] tracking-[-0.04em]">
          Automotive culture
        </h1>
        <p className="mt-4 max-w-xl text-[#1b1d1f]/70">
          Ranked teasers from the wave-1 UK/EU titles. We never republish the article — follow the byline out.
        </p>
        {articles.length === 0 ? (
          <p className="mt-10 text-sm">
            No culture stories yet. Run ingest from the{" "}
            <Link href="/admin/engine" className="underline">
              culture desk
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-10 space-y-10">
            {articles.map((article) => (
              <li key={article.id}>
                <p className="text-xs font-bold uppercase tracking-wide text-[#1b1d1f]/50">
                  {article.publication} · score {article.rankScore}
                </p>
                <h2 className="mt-1 font-display text-3xl font-black uppercase leading-[0.9] tracking-[-0.03em]">
                  {article.title}
                </h2>
                {article.excerpt ? (
                  <p className="mt-3 text-[17px] leading-6 text-[#1b1d1f]">{article.excerpt}</p>
                ) : null}
                <a
                  href={article.canonicalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex h-10 items-center rounded-[5px] bg-[#1b1d1f] px-4 font-display text-sm font-extrabold uppercase text-white"
                >
                  Read on {article.publication}
                </a>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
