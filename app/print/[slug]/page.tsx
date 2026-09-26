import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MagazineQueryProvider } from "@/components/magazine-link";
import { SiteHeader } from "@/components/site-chrome";
import { PrintCoverCard } from "@/components/print-cover-card";
import { forYouTestSearchString, parseForYouTestProfile } from "@/lib/engine/for-you-test";
import { PRINT_SECTION_LINE, getPrintPublication, printCtas } from "@/lib/engine/print";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const inkButtonClass =
  "flex h-11 items-center justify-center rounded-[5px] bg-[#1b1d1f] px-6 font-display text-lg font-extrabold uppercase text-white";

const outlineButtonClass =
  "inline-flex h-11 items-center justify-center rounded-[5px] border border-[#1b1d1f] bg-white px-6 font-display text-lg font-extrabold uppercase text-[#1b1d1f]";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const publication = getPrintPublication((await params).slug);
  if (!publication) return { title: "Print" };
  return {
    title: publication.title,
    description: publication.tagline || PRINT_SECTION_LINE,
  };
}

export default async function PrintDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const publication = getPrintPublication((await params).slug);
  if (!publication) notFound();
  const testQuery = forYouTestSearchString(parseForYouTestProfile(await searchParams)) || undefined;
  const ctas = printCtas(publication);
  const buy = ctas.find((cta) => cta.kind === "buy");
  const subscribe = ctas.find((cta) => cta.kind === "subscribe");
  const site = ctas.find((cta) => cta.kind === "site");
  const meta = [publication.country, publication.frequency, publication.publisher].filter(Boolean);

  return (
    <MagazineQueryProvider testQuery={testQuery}>
      <div className="min-h-full overflow-x-clip bg-white">
        <SiteHeader title={publication.title} backHref="/" testQuery={testQuery} />
        <article className="mx-auto grid max-w-3xl gap-10 px-[calc(10px+env(safe-area-inset-left,0px))] pb-20 pt-8 md:max-w-6xl md:grid-cols-[minmax(0,18rem)_1fr] md:px-6">
          <PrintCoverCard publication={publication} href={`/print/${publication.slug}`} />
          <div>
            <p className="font-display text-lg font-bold uppercase text-[#1b1d1f]/70">A thing worth holding.</p>
            <h1 className="mt-4 font-display text-[clamp(2.75rem,9vw,5rem)] font-black uppercase leading-[0.62] tracking-[-0.02em] text-[#1b1d1f]">
              {publication.title}
            </h1>
            {publication.tagline ? (
              <p className="mt-8 font-display text-[35px] font-extrabold uppercase leading-[0.64] tracking-[-0.02em]">
                {publication.tagline}
              </p>
            ) : null}
            {publication.description ? (
              <p className="mt-[26px] max-w-xl text-[18px] leading-[22px] tracking-[-0.36px]">
                {publication.description}
              </p>
            ) : null}
            {meta.length ? (
              <p className="mt-6 text-[18px] leading-[22px] tracking-[-0.36px] text-[#1b1d1f]/70">
                {meta.join(" · ")}
              </p>
            ) : null}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {buy ? (
                <a href={buy.href} target="_blank" rel="noreferrer" className={inkButtonClass}>
                  Buy issue
                </a>
              ) : null}
              {subscribe ? (
                <a href={subscribe.href} target="_blank" rel="noreferrer" className={outlineButtonClass}>
                  Subscribe
                </a>
              ) : null}
              {site ? (
                <a href={site.href} target="_blank" rel="noreferrer" className={outlineButtonClass}>
                  Official site
                </a>
              ) : null}
            </div>
            {!buy && !subscribe ? (
              <p className="mt-6 max-w-xl text-[18px] leading-[22px] tracking-[-0.36px] text-[#1b1d1f]/70">
                No verified shop or subscribe link for this title. We would rather show nothing than
                invent a checkout.
              </p>
            ) : null}
          </div>
        </article>
      </div>
    </MagazineQueryProvider>
  );
}
