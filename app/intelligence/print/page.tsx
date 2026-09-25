import type { Metadata } from "next";
import Link from "next/link";
import { ForYouTestFilter } from "@/components/for-you-test-filter";
import {
  forYouTestIsActive,
  forYouTestSearchString,
  parseForYouTestProfile,
  withProfileInCatalog,
} from "@/lib/engine/for-you-test";
import { loadForYouTestCatalog } from "@/lib/engine/queries";
import {
  PRINT_SECTION_LINE,
  buildPrintShelf,
  isPrintFocus,
  resolvePrintProfile,
} from "@/lib/intelligence/print";
import { GARAGE_VEHICLES } from "@/lib/intelligence/ui-catalog";
import { IntelligenceSectionNav } from "../section-nav";
import { PrintCoverCard } from "./cover-card";

export const metadata: Metadata = {
  title: "Print",
  description: PRINT_SECTION_LINE,
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function withQuery(pathname: string, query: string, extra?: Record<string, string | undefined>) {
  const params = new URLSearchParams(query);
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
  }
  const next = params.toString();
  return next ? `${pathname}?${next}` : pathname;
}

export default async function PrintPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const testProfile = parseForYouTestProfile(params);
  const vehicleId = first(params.vehicle);
  const profile = resolvePrintProfile(testProfile, vehicleId);
  const focusRaw = first(params.focus).toLowerCase();
  const focus = isPrintFocus(focusRaw) ? focusRaw : null;
  const testQuery = forYouTestSearchString(profile);
  const shelf = buildPrintShelf(profile, focus);
  const catalog = withProfileInCatalog(await loadForYouTestCatalog(), profile);
  const personalised = forYouTestIsActive(profile);

  return (
    <div className="min-h-full overflow-x-clip bg-white">
      <main className="mx-auto max-w-6xl pb-20 text-[#1b1d1f]">
        <header className="px-7 pt-8 md:px-6">
          <IntelligenceSectionNav current="print" query={testQuery} />
          <h1 className="mt-8 font-display text-[clamp(2.75rem,9vw,5rem)] font-black uppercase leading-[0.62] tracking-[-0.02em]">
            Print
          </h1>
          <p className="mt-8 font-display text-[35px] font-extrabold uppercase leading-[0.64] tracking-[-0.02em]">
            {PRINT_SECTION_LINE}
          </p>
          <p className="mt-[26px] max-w-xl text-[18px] leading-[22px] tracking-[-0.36px]">
            Publication entities, not articles. A newsstand of the magazines worth leaving the
            screen for. We reorder for your garage. We never hide the catalogue.
          </p>
        </header>

        <ForYouTestFilter initial={profile} catalog={catalog} pathname="/intelligence/print" />

        <section className="mt-10 px-7 md:px-6" aria-labelledby="garage-heading">
          <h2
            id="garage-heading"
            className="font-display text-[35px] font-extrabold uppercase leading-[0.64] tracking-[-0.02em]"
          >
            Your car
          </h2>
          <p className="mt-4 max-w-xl text-[18px] leading-[22px] tracking-[-0.36px] text-[#1b1d1f]/70">
            The seeded garage, same cars as Build and Maintain. Or use A–D in the test panel.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {GARAGE_VEHICLES.map((row) => {
              const selected = vehicleId === row.id;
              return (
                <Link
                  key={row.id}
                  href={withQuery("/intelligence/print", "", {
                    vehicle: row.id,
                    make: row.make,
                    model: row.model,
                    generation: row.generation,
                    variant: row.variant ?? undefined,
                  })}
                  aria-current={selected ? "page" : undefined}
                  className={
                    selected
                      ? "inline-flex w-fit items-center rounded-[4px] bg-[#1b1d1f] px-4 py-1.5 font-display text-lg font-bold uppercase leading-none text-white"
                      : "inline-flex w-fit items-center rounded-[4px] border border-[#1b1d1f]/20 bg-white px-4 py-1.5 font-display text-lg font-bold uppercase leading-none text-[#1b1d1f]"
                  }
                >
                  {row.generation}
                </Link>
              );
            })}
          </div>
        </section>

        <section className="mt-16 px-7 md:px-6" aria-labelledby="featured-heading">
          <h2
            id="featured-heading"
            className="font-display text-[35px] font-extrabold uppercase leading-[0.64] tracking-[-0.02em]"
          >
            Worth picking up
          </h2>
          <ul className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-5">
            {shelf.featured.map((publication) => (
              <li key={publication.id}>
                <PrintCoverCard
                  publication={publication}
                  href={withQuery(`/intelligence/print/${publication.slug}`, testQuery)}
                />
              </li>
            ))}
          </ul>
        </section>

        {personalised ? (
          <section className="mt-16 px-7 md:px-6" aria-labelledby="recommended-heading">
            <h2
              id="recommended-heading"
              className="font-display text-[35px] font-extrabold uppercase leading-[0.64] tracking-[-0.02em]"
            >
              Recommended for you
            </h2>
            {shelf.recommended.length === 0 ? (
              <p className="mt-8 max-w-xl text-[18px] leading-[22px] tracking-[-0.36px] text-[#1b1d1f]/70">
                Nothing in this focus matches the garage. The full newsstand is still below.
              </p>
            ) : (
              <ul className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
                {shelf.recommended.map((publication) => (
                  <li key={publication.id}>
                    <PrintCoverCard
                      publication={publication}
                      href={withQuery(`/intelligence/print/${publication.slug}`, testQuery)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        <section className="mt-16 px-7 md:px-6" aria-labelledby="explore-heading">
          <h2
            id="explore-heading"
            className="font-display text-[35px] font-extrabold uppercase leading-[0.64] tracking-[-0.02em]"
          >
            Explore all
          </h2>
          <p className="mt-4 max-w-xl text-[18px] leading-[22px] tracking-[-0.36px] text-[#1b1d1f]/70">
            Every title we seeded. Filters narrow the shelf. They do not delete it.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              href={withQuery("/intelligence/print", testQuery, { focus: undefined })}
              className={
                !focus
                  ? "inline-flex w-fit items-center rounded-[4px] bg-[#1b1d1f] px-4 py-1.5 font-display text-lg font-bold uppercase leading-none text-white"
                  : "inline-flex w-fit items-center rounded-[4px] border border-[#1b1d1f]/20 bg-white px-4 py-1.5 font-display text-lg font-bold uppercase leading-none text-[#1b1d1f]"
              }
            >
              All
            </Link>
            {shelf.filters.map((filter) => {
              const selected = focus === filter.id;
              return (
                <Link
                  key={filter.id}
                  href={withQuery("/intelligence/print", testQuery, { focus: filter.id })}
                  className={
                    selected
                      ? "inline-flex w-fit items-center rounded-[4px] bg-[#1b1d1f] px-4 py-1.5 font-display text-lg font-bold uppercase leading-none text-white"
                      : "inline-flex w-fit items-center rounded-[4px] border border-[#1b1d1f]/20 bg-white px-4 py-1.5 font-display text-lg font-bold uppercase leading-none text-[#1b1d1f]"
                  }
                >
                  {filter.label}
                </Link>
              );
            })}
          </div>
          {shelf.explore.length === 0 ? (
            <p className="mt-8 max-w-xl text-[18px] leading-[22px] tracking-[-0.36px] text-[#1b1d1f]/70">
              No titles in that focus. Choose All to see the newsstand.
            </p>
          ) : (
            <ul className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
              {shelf.explore.map((publication) => (
                <li key={publication.id}>
                  <PrintCoverCard
                    publication={publication}
                    href={withQuery(`/intelligence/print/${publication.slug}`, testQuery)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
