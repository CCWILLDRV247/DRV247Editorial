"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  FOR_YOU_TEST_STORAGE_KEY,
  forYouTestIsActive,
  forYouTestSearchString,
  forYouTestSummary,
  type ForYouTestCatalog,
  type ForYouTestProfile,
} from "@/lib/engine/for-you-test";

const selectClass =
  "h-9 min-w-0 w-full rounded-[5px] border border-[#1b1d1f] bg-white px-2 font-display text-sm font-bold uppercase text-[#1b1d1f]";

function withCurrent(options: string[], current?: string) {
  if (!current) return options;
  if (options.some((item) => item === current)) return options;
  return [current, ...options];
}

export function ForYouTestFilter({
  initial,
  catalog,
}: {
  initial: ForYouTestProfile;
  catalog: ForYouTestCatalog;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(forYouTestIsActive(initial));
  const [profile, setProfile] = useState<ForYouTestProfile>(initial);
  const makeRecord = catalog.makes.find((item) => item.name === profile.make);
  const models = withCurrent(
    (makeRecord?.models ?? []).map((model) => model.name),
    profile.model,
  );
  const selectedModel = makeRecord?.models.find((item) => item.name === profile.model);
  const generations = withCurrent(selectedModel?.generations ?? [], profile.generation);
  const variants = withCurrent(selectedModel?.variants ?? [], profile.variant);
  const makes = withCurrent(
    catalog.makes.map((make) => make.name),
    profile.make,
  );
  const locations = withCurrent(catalog.locations, profile.location);
  const interests = [...catalog.interests];
  for (const interest of profile.interests) {
    if (!interests.includes(interest)) interests.push(interest);
  }
  const initialQuery = forYouTestSearchString(initial);

  useEffect(() => {
    if (initialQuery) {
      window.localStorage.setItem(FOR_YOU_TEST_STORAGE_KEY, initialQuery);
      return;
    }
    const stored = window.localStorage.getItem(FOR_YOU_TEST_STORAGE_KEY);
    if (!stored) return;
    router.replace(`${pathname}?${stored}`);
  }, [initialQuery, pathname, router]);

  function apply(next: ForYouTestProfile) {
    const cleaned: ForYouTestProfile = {
      make: next.make,
      model: next.make ? next.model : undefined,
      generation: next.make && next.model ? next.generation : undefined,
      variant: next.make && next.model ? next.variant : undefined,
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

  return (
    <section className="mx-auto w-full max-w-3xl px-4 pt-3 md:max-w-6xl md:px-6">
      <div className="rounded-[8px] border border-dashed border-[#1b1d1f]/30 bg-[#f6f6f6] px-3 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-display text-xs font-bold uppercase tracking-[0.08em] text-[#1b1d1f]/55">
              Test personalization — placeholder
            </p>
            <p className="mt-1 text-[13px] leading-5 text-[#1b1d1f]/70">
              Not a garage. Hides anything that does not match each setting you choose — make,
              model, generation, variant, interest, location. Blank settings do not constrain. The
              list is every value on stories plus the gazetteer, including off-catalog marques.
              Saved in the URL and on this phone.
            </p>
            {active ? (
              <p className="mt-1 font-display text-sm font-bold uppercase text-[#1b1d1f]">
                {forYouTestSummary(profile)}
              </p>
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
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <select
                aria-label="Test make"
                className={selectClass}
                value={profile.make ?? ""}
                onChange={(event) =>
                  apply({
                    ...profile,
                    make: event.target.value || undefined,
                    model: undefined,
                    generation: undefined,
                    variant: undefined,
                  })
                }
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
                className={selectClass}
                value={profile.model ?? ""}
                disabled={!profile.make}
                onChange={(event) =>
                  apply({
                    ...profile,
                    model: event.target.value || undefined,
                    generation: undefined,
                    variant: undefined,
                  })
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
                disabled={!profile.make || !profile.model}
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
              <select
                aria-label="Test variant"
                className={selectClass}
                value={profile.variant ?? ""}
                disabled={!profile.make || !profile.model}
                onChange={(event) =>
                  apply({ ...profile, variant: event.target.value || undefined })
                }
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
              className={selectClass}
              value={profile.location ?? ""}
              onChange={(event) => apply({ ...profile, location: event.target.value || undefined })}
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
