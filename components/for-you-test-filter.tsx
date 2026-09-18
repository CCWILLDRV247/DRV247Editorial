"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  FOR_YOU_DEMO_PROFILES,
  FOR_YOU_TEST_STORAGE_KEY,
  forYouTestIsActive,
  forYouTestSearchString,
  forYouTestSummary,
  type ForYouTestCatalog,
  type ForYouTestProfile,
} from "@/lib/engine/for-you-test";

const selectClass =
  "h-9 min-w-0 w-full rounded-[5px] border border-[#1b1d1f] bg-white px-2 font-display text-sm font-bold uppercase text-[#1b1d1f]";

const nativeSubmit = { onchange: "this.form.requestSubmit()" } as const;

function withCurrent(options: string[], current?: string) {
  if (!current) return options;
  if (options.some((item) => item === current)) return options;
  return [current, ...options];
}

function hrefFor(pathname: string, profile: ForYouTestProfile) {
  const query = forYouTestSearchString(profile);
  return query ? `${pathname}?${query}` : pathname;
}

export function ForYouTestFilter({
  initial,
  catalog,
}: {
  initial: ForYouTestProfile;
  catalog: ForYouTestCatalog;
}) {
  const pathname = usePathname();
  const makeRecord = catalog.makes.find((item) => item.name === initial.make);
  const models = withCurrent(
    (makeRecord?.models ?? []).map((model) => model.name),
    initial.model,
  );
  const selectedModel = makeRecord?.models.find((item) => item.name === initial.model);
  const generations = withCurrent(selectedModel?.generations ?? [], initial.generation);
  const variants = withCurrent(selectedModel?.variants ?? [], initial.variant);
  const makes = withCurrent(
    catalog.makes.map((make) => make.name),
    initial.make,
  );
  const locations = withCurrent(catalog.locations, initial.location);
  const interests = [...catalog.interests];
  for (const interest of initial.interests) {
    if (!interests.includes(interest)) interests.push(interest);
  }
  const initialQuery = forYouTestSearchString(initial);
  const active = forYouTestIsActive(initial);

  useEffect(() => {
    if (initialQuery) {
      window.localStorage.setItem(FOR_YOU_TEST_STORAGE_KEY, initialQuery);
      return;
    }
    window.localStorage.removeItem(FOR_YOU_TEST_STORAGE_KEY);
  }, [initialQuery]);

  return (
    <section className="relative z-30 mx-auto w-full max-w-3xl px-4 pt-3 md:max-w-6xl md:px-6">
      <details
        open={active}
        className="rounded-[8px] border border-dashed border-[#1b1d1f]/30 bg-[#f6f6f6] px-3 py-3"
      >
        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
          <div className="min-w-0 flex-1">
            <p className="font-display text-xs font-bold uppercase tracking-[0.08em] text-[#1b1d1f]/55">
              Test personalization — placeholder
            </p>
            <p className="mt-1 text-[13px] leading-5 text-[#1b1d1f]/70">
              Ranks the desk around your car first, then interests, then the rest of the car world.
              Not a garage. A–D are switchable test cars. Saved in the URL and on this phone.
              Cars, Culture, Driving, and Events still hide anything that misses a set filter.
            </p>
            {active ? (
              <p className="mt-1 font-display text-sm font-bold uppercase text-[#1b1d1f]">
                {forYouTestSummary(initial)}
              </p>
            ) : null}
          </div>
          <span className="inline-flex h-9 shrink-0 items-center rounded-[5px] border border-[#1b1d1f] px-3 font-display text-sm font-extrabold uppercase">
            Set test
          </span>
        </summary>
        <form method="get" action={pathname} className="mt-3 flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {Object.values(FOR_YOU_DEMO_PROFILES).map((demo) => {
              const on = initial.preset === demo.id;
              return (
                <Link
                  key={demo.id}
                  href={hrefFor(pathname, { ...demo })}
                  className={
                    on
                      ? "inline-flex h-8 items-center rounded-[4px] bg-[#1b1d1f] px-3 font-display text-xs font-bold uppercase text-white"
                      : "inline-flex h-8 items-center rounded-[4px] border border-[#1b1d1f]/30 bg-white px-3 font-display text-xs font-bold uppercase text-[#1b1d1f]"
                  }
                >
                  {demo.id} · {demo.label}
                </Link>
              );
            })}
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <select
              aria-label="Test make"
              name="make"
              className={selectClass}
              defaultValue={initial.make ?? ""}
              {...nativeSubmit}
            >
              <option value="">Any make</option>
              {makes.map((make) => (
                <option key={make} value={make}>
                  {make}
                </option>
              ))}
            </select>
            <select
              aria-label="Test model"
              name="model"
              className={selectClass}
              defaultValue={initial.model ?? ""}
              disabled={!initial.make}
              {...nativeSubmit}
            >
              <option value="">Any model</option>
              {models.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
            <select
              aria-label="Test generation"
              name="generation"
              className={selectClass}
              defaultValue={initial.generation ?? ""}
              disabled={!initial.make || !initial.model}
              {...nativeSubmit}
            >
              <option value="">Any generation</option>
              {generations.map((generation) => (
                <option key={generation} value={generation}>
                  {generation}
                </option>
              ))}
            </select>
            <select
              aria-label="Test variant"
              name="variant"
              className={selectClass}
              defaultValue={initial.variant ?? ""}
              disabled={!initial.make || !initial.model}
              {...nativeSubmit}
            >
              <option value="">Any variant</option>
              {variants.map((variant) => (
                <option key={variant} value={variant}>
                  {variant}
                </option>
              ))}
            </select>
          </div>
          <select
            aria-label="Test location"
            name="location"
            className={selectClass}
            defaultValue={initial.location ?? ""}
            {...nativeSubmit}
          >
            <option value="">Any location</option>
            {locations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
          <div>
            <p className="mb-2 font-display text-xs font-bold uppercase tracking-[0.08em] text-[#1b1d1f]/55">
              Interests
            </p>
            <div className="flex flex-wrap gap-2">
              {interests.map((interest) => {
                const on = initial.interests.includes(interest);
                const nextInterests = on
                  ? initial.interests.filter((item) => item !== interest)
                  : [...initial.interests, interest];
                return (
                  <Link
                    key={interest}
                    href={hrefFor(pathname, { ...initial, preset: undefined, interests: nextInterests })}
                    className={
                      on
                        ? "inline-flex h-8 items-center rounded-[4px] bg-[#1b1d1f] px-3 font-display text-xs font-bold uppercase text-white"
                        : "inline-flex h-8 items-center rounded-[4px] border border-[#1b1d1f]/30 bg-white px-3 font-display text-xs font-bold uppercase text-[#1b1d1f]"
                    }
                  >
                    {interest}
                  </Link>
                );
              })}
            </div>
          </div>
          <Link
            href={pathname}
            className="self-start font-display text-sm font-bold uppercase text-[#1b1d1f]/70 underline"
          >
            Clear test
          </Link>
        </form>
      </details>
    </section>
  );
}
