import {
  FOR_YOU_DEMO_PROFILES,
  forYouTestIsActive,
  forYouTestSearchString,
  forYouTestSummary,
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

function hrefFor(pathname: string, profile: ForYouTestProfile) {
  const query = forYouTestSearchString(profile);
  return query ? `${pathname}?${query}` : pathname;
}

function FilterSlidersIcon() {
  return (
    <SlidersHorizontal
      aria-hidden
      className="size-4 shrink-0 text-[#1b1d1f]"
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

  return (
    <>
      <ForYouTestStorageSync query={initialQuery} />
      <section className="relative z-30 w-full min-w-0 border-t border-[#1b1d1f]/12">
        <details>
          <summary
            className={`flex cursor-pointer list-none items-center gap-2.5 py-4 ${MAGAZINE_LAYOUT.gutter} [&::-webkit-details-marker]:hidden`}
          >
            <FilterSlidersIcon />
            <p className="min-w-0 font-display text-[15px] font-extrabold uppercase tracking-[0.04em] text-[#1b1d1f]">
              Content filtered by your vehicle & interests
            </p>
          </summary>
          <div className={`${MAGAZINE_LAYOUT.gutter} pb-4`}>
            {active ? (
              <p className="mb-3 font-display text-sm font-bold uppercase text-[#1b1d1f]">
                {forYouTestSummary(initial)}
              </p>
            ) : null}
            <form id="for-you-test-form" method="get" action={pathname} className="flex flex-col gap-3">
              {initial.preset ? <input type="hidden" name="profile" value={initial.preset} /> : null}
              {initial.interests.map((interest) => (
                <input key={interest} type="hidden" name="interest" value={interest} />
              ))}
              <div className="flex flex-wrap gap-2">
                {Object.values(FOR_YOU_DEMO_PROFILES).map((demo) => {
                  const on = initial.preset === demo.id;
                  return (
                    <a
                      key={demo.id}
                      href={hrefFor(pathname, { ...demo })}
                      className={
                        on
                          ? "inline-flex h-8 items-center rounded-[4px] bg-[#1b1d1f] px-3 font-display text-xs font-bold uppercase text-white no-underline"
                          : "inline-flex h-8 items-center rounded-[4px] border border-[#1b1d1f]/30 bg-white px-3 font-display text-xs font-bold uppercase text-[#1b1d1f] no-underline"
                      }
                    >
                      {demo.id} · {demo.label}
                    </a>
                  );
                })}
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <select
                  aria-label="Test make"
                  name="make"
                  className={selectClass}
                  defaultValue={initial.make ?? ""}
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
              >
                <option value="">Any location</option>
                {locations.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="self-start rounded-[5px] border border-[#1b1d1f] bg-white px-3 py-2 font-display text-xs font-bold uppercase text-[#1b1d1f]"
              >
                Apply garage filters
              </button>
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
                      <a
                        key={interest}
                        href={hrefFor(pathname, { ...initial, preset: undefined, interests: nextInterests })}
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
                Clear test
              </a>
            </form>
            <ForYouTestAutoSubmit />
          </div>
        </details>
      </section>
    </>
  );
}
