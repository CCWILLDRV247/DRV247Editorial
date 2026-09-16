"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  FOR_YOU_TEST_STORAGE_KEY,
  catalogGenerations,
  catalogInterests,
  catalogLocations,
  catalogMakes,
  catalogModels,
  forYouTestIsActive,
  forYouTestSearchString,
  forYouTestSummary,
  type ForYouTestProfile,
} from "@/lib/engine/for-you-test";

const selectClass =
  "h-9 min-w-0 flex-1 rounded-[5px] border border-[#1b1d1f] bg-white px-2 font-display text-sm font-bold uppercase text-[#1b1d1f]";

export function ForYouTestFilter({ initial }: { initial: ForYouTestProfile }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(forYouTestIsActive(initial));
  const [profile, setProfile] = useState<ForYouTestProfile>(initial);
  const models = useMemo(() => catalogModels(profile.make), [profile.make]);
  const generations = useMemo(
    () => catalogGenerations(profile.make, profile.model),
    [profile.make, profile.model],
  );

  useEffect(() => {
    if (forYouTestIsActive(initial)) {
      window.localStorage.setItem(FOR_YOU_TEST_STORAGE_KEY, forYouTestSearchString(initial));
      return;
    }
    const stored = window.localStorage.getItem(FOR_YOU_TEST_STORAGE_KEY);
    if (!stored) return;
    router.replace(`${pathname}?${stored}`);
  }, [initial, pathname, router]);

  function apply(next: ForYouTestProfile) {
    const cleaned: ForYouTestProfile = {
      make: next.make,
      model: next.make ? next.model : undefined,
      generation: next.make && next.model ? next.generation : undefined,
      interests: next.interests,
      location: next.location,
    };
    setProfile(cleaned);
    const query = forYouTestSearchString(cleaned);
    if (query) window.localStorage.setItem(FOR_YOU_TEST_STORAGE_KEY, query);
    else window.localStorage.removeItem(FOR_YOU_TEST_STORAGE_KEY);
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  const active = forYouTestIsActive(profile);
  const summary = forYouTestSummary(profile);

  return (
    <section className="mx-auto w-full max-w-3xl px-4 pt-3 md:max-w-6xl md:px-6">
      <div className="rounded-[8px] border border-dashed border-[#1b1d1f]/30 bg-[#f6f6f6] px-3 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-display text-xs font-bold uppercase tracking-[0.08em] text-[#1b1d1f]/55">
              Test personalization — placeholder
            </p>
            <p className="mt-1 text-[13px] leading-5 text-[#1b1d1f]/70">
              Not a garage. Ranks For You from make/model, interests, and location already on the
              story. No invented matches.
            </p>
            {active ? (
              <p className="mt-1 font-display text-sm font-bold uppercase text-[#1b1d1f]">{summary}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="h-9 rounded-[5px] border border-[#1b1d1f] px-3 font-display text-sm font-extrabold uppercase"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? "Hide" : "Set test"}
          </button>
        </div>
        {open ? (
          <form
            className="mt-3 flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              apply(profile);
            }}
          >
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <select
                aria-label="Test make"
                className={selectClass}
                value={profile.make ?? ""}
                onChange={(event) =>
                  apply({ ...profile, make: event.target.value || undefined, model: undefined, generation: undefined })
                }
              >
                <option value="">Any make</option>
                {catalogMakes().map((make) => (
                  <option key={make} value={make}>
                    {make}
                  </option>
                ))}
              </select>
              <select
                aria-label="Test model"
                className={selectClass}
                value={profile.model ?? ""}
                disabled={!profile.make}
                onChange={(event) =>
                  apply({ ...profile, model: event.target.value || undefined, generation: undefined })
                }
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
                className={selectClass}
                value={profile.generation ?? ""}
                disabled={!generations.length}
                onChange={(event) =>
                  apply({ ...profile, generation: event.target.value || undefined })
                }
              >
                <option value="">Any generation</option>
                {generations.map((generation) => (
                  <option key={generation} value={generation}>
                    {generation}
                  </option>
                ))}
              </select>
            </div>
            <select
              aria-label="Test location"
              className={selectClass}
              value={profile.location ?? ""}
              onChange={(event) => apply({ ...profile, location: event.target.value || undefined })}
            >
              <option value="">Any location</option>
              {catalogLocations().map((location) => (
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
                {catalogInterests().map((interest) => {
                  const on = profile.interests.includes(interest);
                  return (
                    <button
                      key={interest}
                      type="button"
                      className={
                        on
                          ? "h-8 rounded-[4px] bg-[#1b1d1f] px-3 font-display text-xs font-bold uppercase text-white"
                          : "h-8 rounded-[4px] border border-[#1b1d1f]/30 bg-white px-3 font-display text-xs font-bold uppercase text-[#1b1d1f]"
                      }
                      onClick={() =>
                        apply({
                          ...profile,
                          interests: on
                            ? profile.interests.filter((item) => item !== interest)
                            : [...profile.interests, interest],
                        })
                      }
                    >
                      {interest}
                    </button>
                  );
                })}
              </div>
            </div>
            <button
              type="button"
              className="self-start font-display text-sm font-bold uppercase text-[#1b1d1f]/70 underline"
              onClick={() => apply({ interests: [] })}
            >
              Clear test
            </button>
          </form>
        ) : null}
      </div>
    </section>
  );
}
