import {
  forYouTestFilterSearchString,
  forYouTestFilterSummary,
  forYouTestIsActive,
  type ForYouTestCatalog,
  type ForYouTestProfile,
} from "@/lib/engine/for-you-test";
import { MAGAZINE_LAYOUT } from "@/lib/engine/editorial-composition";
import { SlidersHorizontal } from "lucide-react";
import { ForYouTestAutoSubmit } from "./for-you-test-auto-submit";
import { ForYouTestStorageSync } from "./for-you-test-storage";

const selectClass =
  "h-9 min-w-0 w-full rounded-[5px] border border-[#1b1d1f] bg-white px-2 font-display text-sm font-bold uppercase text-[#1b1d1f]";

function withCurrent(options: string[], current?: string) {
  if (!current) return options;
  if (options.some((item) => item === current)) return options;
  return [current, ...options];
}

function filterProfile(profile: ForYouTestProfile): ForYouTestProfile {
  return { make: profile.make, interests: profile.interests };
}

function hrefFor(pathname: string, profile: ForYouTestProfile) {
  const query = forYouTestFilterSearchString(filterProfile(profile));
  return query ? `${pathname}?${query}` : pathname;
}

function FilterSlidersIcon() {
  return (
    <SlidersHorizontal
      aria-hidden
      className="size-5 shrink-0 text-[#1b1d1f]"
      strokeWidth={2.25}
    />
  );
}

export function ForYouTestFilter({
  initial,
  catalog,
  pathname,
}: {
  initial: ForYouTestProfile;
  catalog: ForYouTestCatalog;
  pathname: string;
}) {
  const makes = withCurrent(
    catalog.makes.map((make) => make.name),
    initial.make,
  );
  const interests = [...catalog.interests];
  for (const interest of initial.interests) {
    if (!interests.includes(interest)) interests.push(interest);
  }
  const filterState = filterProfile(initial);
  const initialQuery = forYouTestFilterSearchString(filterState);
  const active = forYouTestIsActive(initial);

  return (
    <>
      <ForYouTestStorageSync query={initialQuery} />
      <section className="relative z-30 w-full min-w-0">
        <details>
          <summary
            className={`flex cursor-pointer list-none items-center gap-2.5 border-y border-[#1b1d1f]/12 pt-1.5 pb-1.5 ${MAGAZINE_LAYOUT.gutter} [&::-webkit-details-marker]:hidden`}
          >
            <FilterSlidersIcon />
            <p className="min-w-0 font-display text-[20px] font-extrabold uppercase tracking-[0.04em] text-[#1b1d1f]">
              Content filtered by your vehicle & interests
            </p>
          </summary>
          <div className={`${MAGAZINE_LAYOUT.gutter} pb-4`}>
            {active ? (
              <p className="mb-3 font-display text-sm font-bold uppercase text-[#1b1d1f]">
                {forYouTestFilterSummary(filterState)}
              </p>
            ) : null}
            <form id="for-you-test-form" method="get" action={pathname} className="flex flex-col gap-3">
              {filterState.interests.map((interest) => (
                <input key={interest} type="hidden" name="interest" value={interest} />
              ))}
              <select
                aria-label="Make"
                name="make"
                className={selectClass}
                defaultValue={filterState.make ?? ""}
              >
                <option value="">Any make</option>
                {makes.map((make) => (
                  <option key={make} value={make}>
                    {make}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="self-start rounded-[5px] border border-[#1b1d1f] bg-white px-3 py-2 font-display text-xs font-bold uppercase text-[#1b1d1f]"
              >
                Apply filters
              </button>
              <div>
                <p className="mb-2 font-display text-xs font-bold uppercase tracking-[0.08em] text-[#1b1d1f]/55">
                  Interests
                </p>
                <div className="flex flex-wrap gap-2">
                  {interests.map((interest) => {
                    const on = filterState.interests.includes(interest);
                    const nextInterests = on
                      ? filterState.interests.filter((item) => item !== interest)
                      : [...filterState.interests, interest];
                    return (
                      <a
                        key={interest}
                        href={hrefFor(pathname, { ...filterState, interests: nextInterests })}
                        className={
                          on
                            ? "inline-flex h-8 items-center rounded-[4px] bg-[#1b1d1f] px-3 font-display text-xs font-bold uppercase text-white no-underline"
                            : "inline-flex h-8 items-center rounded-[4px] border border-[#1b1d1f]/30 bg-white px-3 font-display text-xs font-bold uppercase text-[#1b1d1f] no-underline"
                        }
                      >
                        {interest}
                      </a>
                    );
                  })}
                </div>
              </div>
              <a
                href={pathname}
                className="self-start font-display text-sm font-bold uppercase text-[#1b1d1f]/70 underline"
              >
                Clear filters
              </a>
            </form>
            <ForYouTestAutoSubmit />
          </div>
        </details>
      </section>
    </>
  );
}
