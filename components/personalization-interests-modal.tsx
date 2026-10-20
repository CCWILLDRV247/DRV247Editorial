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
import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

const selectClass =
  "h-11 min-w-0 w-full appearance-none rounded-xl border border-[#1b1d1f] bg-white px-3.5 pr-10 font-display text-sm font-bold uppercase tracking-[0.06em] text-[#1b1d1f]";

function interestChipClass(on: boolean) {
  return on
    ? "flex h-11 w-full items-center justify-center rounded-xl border border-[#1b1d1f] bg-[#1b1d1f] px-1 text-center font-display text-[11px] font-bold uppercase leading-none tracking-[0.04em] text-white"
    : "flex h-11 w-full items-center justify-center rounded-xl border border-[#1b1d1f] bg-white px-1 text-center font-display text-[11px] font-bold uppercase leading-none tracking-[0.04em] text-[#1b1d1f]";
}

function interestDisplayLabel(interest: string) {
  return interest.replaceAll("/", " / ");
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
        className="flex max-h-[min(92vh,820px)] w-[calc(100%-2rem)] max-w-[25.5rem] flex-col gap-0 overflow-hidden rounded-[1.25rem] border border-[#1b1d1f]/20 bg-white p-0 text-[#1b1d1f] shadow-none ring-0 sm:max-w-[25.5rem] [&_[data-slot=dialog-close]]:top-3.5 [&_[data-slot=dialog-close]]:right-3.5 [&_[data-slot=dialog-close]]:text-[#1b1d1f] [&_[data-slot=dialog-close]]:hover:bg-transparent"
      >
        <DialogHeader className="gap-0 px-5 pt-12 pb-4 text-left sm:px-5">
          <DialogTitle className="font-display text-[2.95rem] font-black italic uppercase leading-[0.74] tracking-[-0.045em] text-[#1b1d1f]">
            <span className="block">Create a</span>
            <span className="block">personalised</span>
            <span className="block">magazine</span>
          </DialogTitle>
          <p className="mt-5 font-display text-[1.375rem] font-extrabold uppercase leading-[0.88] tracking-[-0.02em] text-[#1b1d1f]">
            <span className="block">We have over 80 sources</span>
            <span className="block">from around the world</span>
          </p>
          <DialogDescription
            id="personalization-interests-description"
            className="mt-3 font-sans text-[15px] font-normal leading-[1.35] text-[#1b1d1f]"
          >
            You can personalise all of the content towards a marquee and the interests you have.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 sm:px-5">
          <div className="flex flex-col gap-5">
            <div>
              <p className="mb-2.5 font-display text-[15px] font-bold uppercase tracking-[0.02em] text-[#1b1d1f]">
                Marquee
              </p>
              <div className="relative">
                <select
                  aria-label="Marquee"
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
                <ChevronDown
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-[#1b1d1f]"
                  strokeWidth={2}
                />
              </div>
            </div>
            <div>
              <p className="mb-2.5 font-display text-[15px] font-bold uppercase tracking-[0.02em] text-[#1b1d1f]">
                Interests
              </p>
              <div
                className="grid grid-cols-3 gap-2.5"
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
                      {interestDisplayLabel(interest)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="mx-0 mb-0 flex-col items-stretch gap-3 rounded-b-[1.25rem] border-0 bg-white px-5 pt-1 pb-5 sm:flex-col sm:items-stretch sm:justify-stretch sm:px-5">
          <button
            type="button"
            onClick={applyPersonalisation}
            className="h-11 w-full rounded-lg bg-[#1b1d1f] font-display text-[11px] font-bold uppercase tracking-[0.16em] text-white"
          >
            Personalise
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="self-center font-display text-[11px] font-bold uppercase tracking-[0.1em] text-[#1b1d1f] underline underline-offset-2"
          >
            Skip for now
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
