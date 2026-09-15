import Link from "next/link";
import { listEditorial } from "@/lib/engine/queries";
import { ENGINE_BRANCH, ENGINE_WAVE, engineCommit } from "@/lib/engine/version";

export function CultureFeed() {
  const articles = listEditorial({ userId: "demo-chris", limit: 24 });
  const publications = [...new Set(articles.map((article) => article.publication))];

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <p className="font-display text-sm font-bold uppercase tracking-wide text-[#1b1d1f]/60">
        {ENGINE_WAVE} · {ENGINE_BRANCH} · {engineCommit().slice(0, 7)}
      </p>
      <h1 className="mt-2 font-display text-5xl font-black uppercase leading-[0.8] tracking-[-0.04em]">
        Automotive culture
      </h1>
      <p className="mt-4 max-w-xl text-[#1b1d1f]/70">
        Ten UK/EU titles only. Teasers, attributed, linked out — never the full article.
        {publications.length ? ` On this instance: ${publications.join(", ")}.` : null}
      </p>
      {articles.length === 0 ? (
        <p className="mt-10 text-sm">
          No culture stories on this serverless instance yet. Open the{" "}
          <Link href="/admin/engine" className="underline">
            culture desk
          </Link>{" "}
          and run Ingest 10 (password desk247).
        </p>
      ) : (
        <ul className="mt-10 space-y-10">
          {articles.map((article) => (
            <li key={article.id}>
              <p className="text-xs font-bold uppercase tracking-wide text-[#1b1d1f]/50">
                {article.publication} · {article.ingestionMethod}
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
  );
}
