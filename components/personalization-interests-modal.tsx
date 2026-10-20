"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FOR_YOU_TEST_STORAGE_KEY,
  forYouTestFilterSearchString,
  type ForYouTestCatalog,
  type ForYouTestProfile,
} from "@/lib/engine/for-you-test";
import { markPersonalizationOnboardedStorage } from "@/lib/engine/personalization-onboard";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

const selectClass =
  "h-9 min-w-0 w-full rounded-[5px] border border-[#1b1d1f] bg-white px-2 font-display text-sm font-bold uppercase text-[#1b1d1f]";

function interestChipClass(on: boolean) {
  return on
    ? "inline-flex min-h-8 items-center rounded-[4px] bg-[#1b1d1f] px-3 py-1.5 font-display text-xs font-bold uppercase text-white"
    : "inline-flex min-h-8 items-center rounded-[4px] border border-[#1b1d1f]/30 bg-white px-3 py-1.5 font-display text-xs font-bold uppercase text-[#1b1d1f]";
}

export function PersonalizationInterestsModal({
  open,
  onOpenChange,
  pathname,
  catalog,
  appliedProfile,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pathname: string;
  catalog: ForYouTestCatalog;
  appliedProfile: ForYouTestProfile;
}) {
  const router = useRouter();
  const [draftMake, setDraftMake] = useState(appliedProfile.make ?? "");
  const [selected, setSelected] = useState<string[]>(appliedProfile.interests);

  const makes = useMemo(() => {
    const list = catalog.makes.map((make) => make.name);
    if (appliedProfile.make && !list.includes(appliedProfile.make)) list.unshift(appliedProfile.make);
    if (draftMake && !list.includes(draftMake)) list.unshift(draftMake);
    return list;
  }, [catalog.makes, appliedProfile.make, draftMake]);

  const interests = useMemo(() => {
    const list = [...catalog.interests];
    for (const interest of [...appliedProfile.interests, ...selected]) {
      if (!list.includes(interest)) list.push(interest);
    }
    return list;
  }, [catalog.interests, appliedProfile.interests, selected]);

  const dismiss = useCallback(() => {
    markPersonalizationOnboardedStorage();
    onOpenChange(false);
  }, [onOpenChange]);

  const toggleInterest = (interest: string) => {
    setSelected((current) =>
      current.includes(interest) ? current.filter((item) => item !== interest) : [...current, interest],
    );
  };

  const applyPersonalisation = () => {
    const profile: ForYouTestProfile = {
      make: draftMake || undefined,
      interests: selected,
    };
    const query = forYouTestFilterSearchString(profile);
    if (query) window.localStorage.setItem(FOR_YOU_TEST_STORAGE_KEY, query);
    else window.localStorage.removeItem(FOR_YOU_TEST_STORAGE_KEY);
    markPersonalizationOnboardedStorage();
    onOpenChange(false);
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) dismiss();
        else onOpenChange(next);
      }}
    >
      <DialogContent
        showCloseButton
        aria-describedby="personalization-interests-description"
        className="flex max-h-[min(90vh,720px)] w-[calc(100%-2rem)] max-w-lg flex-col gap-0 overflow-hidden rounded-xl border border-[#1b1d1f]/25 bg-white p-0 text-[#1b1d1f] shadow-sm sm:max-w-lg"
      >
        <DialogHeader className="gap-2 px-4 pt-5 pb-3 sm:px-6">
          <DialogTitle className="font-display text-xl font-extrabold uppercase tracking-[0.04em] text-[#1b1d1f]">
            Make DRV247 yours
          </DialogTitle>
          <DialogDescription
            id="personalization-interests-description"
            className="font-display text-sm font-medium normal-case leading-snug text-[#1b1d1f]/75"
          >
            Choose your vehicle and a few interests — we&apos;ll rank For You toward the stories you
            actually care about. You can change these anytime from the filter panel.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-6">
          <div className="flex flex-col gap-3">
            <select
              aria-label="Make"
              className={selectClass}
              value={draftMake}
              onChange={(event) => setDraftMake(event.target.value)}
            >
              <option value="">Any make</option>
              {makes.map((make) => (
                <option key={make} value={make}>
                  {make}
                </option>
              ))}
            </select>
            <div>
              <p className="mb-2 font-display text-xs font-bold uppercase tracking-[0.08em] text-[#1b1d1f]/55">
                Interests
              </p>
              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-label="Select your interests"
              >
                {interests.map((interest) => {
                  const on = selected.includes(interest);
                  return (
                    <button
                      key={interest}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleInterest(interest)}
                      className={interestChipClass(on)}
                    >
                      {interest}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="flex-col gap-2 border-t border-[#1b1d1f]/12 bg-[#fafafa] px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={dismiss}
            className="order-2 w-full rounded-[5px] border border-transparent px-3 py-2.5 font-display text-sm font-bold uppercase text-[#1b1d1f]/70 underline sm:order-1 sm:w-auto sm:no-underline"
          >
            Skip for now
          </button>
          <button
            type="button"
            onClick={applyPersonalisation}
            className="order-1 w-full rounded-[5px] border border-[#1b1d1f] bg-[#1b1d1f] px-4 py-2.5 font-display text-sm font-bold uppercase text-white sm:order-2 sm:w-auto"
          >
            Personalise
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
