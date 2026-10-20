"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DRV247_USER_INTERESTS } from "@/lib/engine/interest-taxonomy";
import {
  FOR_YOU_TEST_STORAGE_KEY,
  forYouTestFilterSearchString,
  type ForYouTestProfile,
} from "@/lib/engine/for-you-test";
import { markPersonalizationOnboardedStorage } from "@/lib/engine/personalization-onboard";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

function interestChipClass(on: boolean) {
  return on
    ? "inline-flex min-h-8 items-center rounded-[4px] bg-[#1b1d1f] px-3 py-1.5 font-display text-xs font-bold uppercase text-white"
    : "inline-flex min-h-8 items-center rounded-[4px] border border-[#1b1d1f]/30 bg-white px-3 py-1.5 font-display text-xs font-bold uppercase text-[#1b1d1f]";
}

export function PersonalizationInterestsModal({
  open,
  onOpenChange,
  pathname,
  appliedProfile,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pathname: string;
  appliedProfile: ForYouTestProfile;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(appliedProfile.interests);

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
      make: appliedProfile.make,
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
        className="flex max-h-[min(90vh,720px)] w-[calc(100%-1rem)] max-w-lg flex-col gap-0 overflow-hidden rounded-xl border border-[#1b1d1f]/15 bg-white p-0 text-[#1b1d1f] sm:w-full"
      >
        <DialogHeader className="gap-2 px-4 pt-5 pb-3 sm:px-6">
          <DialogTitle className="font-display text-xl font-extrabold uppercase tracking-[0.04em] text-[#1b1d1f]">
            Make DRV247 yours
          </DialogTitle>
          <DialogDescription
            id="personalization-interests-description"
            className="font-display text-sm font-medium normal-case leading-snug text-[#1b1d1f]/75"
          >
            Pick a few interests and we&apos;ll rank For You toward the stories you actually care about.
            You can change these anytime from the filter panel.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-6">
          <p className="mb-2 font-display text-xs font-bold uppercase tracking-[0.08em] text-[#1b1d1f]/55">
            Your interests
          </p>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Select your interests"
          >
            {DRV247_USER_INTERESTS.map((interest) => {
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
