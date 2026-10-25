"use client";

import {
  FOR_YOU_TEST_STORAGE_KEY,
  forYouTestFilterSearchString,
  forYouTestFilterSummary,
  profileMakes,
  type ForYouTestCatalog,
  type ForYouTestProfile,
} from "@/lib/engine/for-you-test";
import { MAGAZINE_LAYOUT } from "@/lib/engine/editorial-composition";
import { SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const selectClass =
  "h-9 min-w-0 w-full rounded-[5px] border border-[#1b1d1f] bg-white px-2 font-display text-sm font-bold uppercase text-[#1b1d1f]";

function chipClass(on: boolean) {
  return on
    ? "inline-flex h-8 items-center rounded-[4px] bg-[#1b1d1f] px-3 font-display text-xs font-bold uppercase text-white"
    : "inline-flex h-8 items-center rounded-[4px] border border-[#1b1d1f]/30 bg-white px-3 font-display text-xs font-bold uppercase text-[#1b1d1f]";
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

export function ForYouTestFilterPanel({
  applied,
  catalog,
  pathname,
  showAppliedSummary,
}: {
  applied: ForYouTestProfile;
  catalog: ForYouTestCatalog;
  pathname: string;
  showAppliedSummary: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draftMakes, setDraftMakes] = useState<string[]>(() => profileMakes(applied));
  const [pickerMake, setPickerMake] = useState("");
  const [draftInterests, setDraftInterests] = useState(applied.interests);

  useEffect(() => {
    setDraftMakes(profileMakes(applied));
    setDraftInterests(applied.interests);
  }, [applied.make, applied.makes?.join("\0"), applied.interests.join("\0")]);

  const makes = catalog.makes.map((make) => make.name);
  for (const make of [...profileMakes(applied), ...draftMakes, pickerMake]) {
    if (make && !makes.includes(make)) makes.unshift(make);
  }
  const pickerOptions = makes.filter((make) => !draftMakes.includes(make));

  const interests = [...catalog.interests];
  for (const interest of [...applied.interests, ...draftInterests]) {
    if (!interests.includes(interest)) interests.push(interest);
  }

  const persistQuery = (query: string) => {
    if (query) window.localStorage.setItem(FOR_YOU_TEST_STORAGE_KEY, query);
    else window.localStorage.removeItem(FOR_YOU_TEST_STORAGE_KEY);
  };

  const applyFilters = () => {
    const profile: ForYouTestProfile = {
      make: draftMakes[0],
      ...(draftMakes.length ? { makes: draftMakes } : {}),
      interests: draftInterests,
    };
    const query = forYouTestFilterSearchString(profile);
    persistQuery(query);
    setOpen(false);
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const clearFilters = () => {
    persistQuery("");
    setDraftMakes([]);
    setPickerMake("");
    setDraftInterests([]);
    setOpen(false);
    router.push(pathname);
  };

  const toggleInterest = (interest: string) => {
    setDraftInterests((current) =>
      current.includes(interest) ? current.filter((item) => item !== interest) : [...current, interest],
    );
  };

  return (
    <section className="relative z-30 w-full min-w-0">
      <details open={open}>
        <summary
          className={`flex cursor-pointer list-none items-center gap-2.5 border-y border-[#1b1d1f]/12 pt-1.5 pb-1.5 ${MAGAZINE_LAYOUT.gutter} [&::-webkit-details-marker]:hidden`}
          onClick={(event) => {
            event.preventDefault();
            setOpen((value) => !value);
          }}
        >
          <FilterSlidersIcon />
          <p className="min-w-0 font-display text-[20px] font-extrabold uppercase tracking-[0.04em] text-[#1b1d1f]">
            Content filtered by your vehicle & interests
          </p>
        </summary>
        <div className={`${MAGAZINE_LAYOUT.gutter} pb-4`}>
          {showAppliedSummary ? (
            <p className="mb-3 pt-[18px] font-display text-sm font-bold uppercase text-[#1b1d1f]">
              {forYouTestFilterSummary(applied)}
            </p>
          ) : null}
          <div className={`flex flex-col gap-3${showAppliedSummary ? "" : " pt-[18px]"}`}>
            {draftMakes.length ? (
              <div className="flex flex-wrap gap-2">
                {draftMakes.map((make) => (
                  <button
                    key={make}
                    type="button"
                    onClick={() => setDraftMakes((current) => current.filter((item) => item !== make))}
                    className="inline-flex h-8 items-center rounded-[4px] bg-[#1b1d1f] px-3 font-display text-xs font-bold uppercase text-white"
                  >
                    {make} ×
                  </button>
                ))}
              </div>
            ) : null}
            <select
              aria-label="Make"
              className={selectClass}
              value={pickerMake}
              onChange={(event) => {
                const value = event.target.value;
                if (value && !draftMakes.includes(value)) {
                  setDraftMakes((current) => [...current, value]);
                }
                setPickerMake("");
              }}
            >
              <option value="">Select your Marque(s)</option>
              {pickerOptions.map((make) => (
                <option key={make} value={make}>
                  {make}
                </option>
              ))}
            </select>
            <div>
              <p className="mb-2 font-display text-xs font-bold uppercase tracking-[0.08em] text-[#1b1d1f]/55">
                Interests
              </p>
              <div className="flex flex-wrap gap-2">
                {interests.map((interest) => {
                  const on = draftInterests.includes(interest);
                  return (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => toggleInterest(interest)}
                      className={chipClass(on)}
                    >
                      {interest}
                    </button>
                  );
                })}
              </div>
            </div>
            <button
              type="button"
              onClick={applyFilters}
              className="self-start rounded-[5px] border border-[#1b1d1f] bg-white px-3 py-2 font-display text-xs font-bold uppercase text-[#1b1d1f]"
            >
              Apply Filters
            </button>
            <button
              type="button"
              onClick={clearFilters}
              className="self-start font-display text-sm font-bold uppercase text-[#1b1d1f]/70 underline"
            >
              Clear filters
            </button>
          </div>
        </div>
      </details>
    </section>
  );
}
