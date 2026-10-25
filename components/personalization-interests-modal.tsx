"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FOR_YOU_TEST_STORAGE_KEY,
  forYouTestFilterSearchString,
  profileMakes,
  type ForYouTestCatalog,
  type ForYouTestProfile,
} from "@/lib/engine/for-you-test";
import { markPersonalizationOnboardedStorage } from "@/lib/engine/personalization-onboard";
import { ChevronDown, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

const selectClass =
  "h-[47px] min-w-0 w-full appearance-none rounded-[5px] border border-[#1b1d1f] bg-white px-[18px] pr-10 font-sans text-[18px] leading-[22px] tracking-[-0.02em] text-[#1b1d1f]";

function interestChipClass(on: boolean) {
  return on
    ? "flex h-[52px] w-full items-center justify-center rounded-[5px] border border-[#1b1d1f] bg-[#1b1d1f] px-1 text-center font-display text-[18px] font-extrabold uppercase leading-6 text-white"
    : "flex h-[52px] w-full items-center justify-center rounded-[5px] border border-[#1b1d1f] bg-white px-1 text-center font-display text-[18px] font-extrabold uppercase leading-6 text-[#1b1d1f]";
}

function selectedMarqueChipClass() {
  return "inline-flex h-[36px] items-center gap-1.5 rounded-[5px] border border-[#1b1d1f] bg-[#1b1d1f] pl-3 pr-2 font-display text-[14px] font-extrabold uppercase leading-5 text-white";
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
  const [selectedMakes, setSelectedMakes] = useState<string[]>(() => profileMakes(appliedProfile));
  const [pickerMake, setPickerMake] = useState("");
  const [selected, setSelected] = useState<string[]>(appliedProfile.interests);

  const makes = useMemo(() => {
    const list = catalog.makes.map((make) => make.name);
    for (const make of [...profileMakes(appliedProfile), ...selectedMakes, pickerMake]) {
      if (make && !list.includes(make)) list.unshift(make);
    }
    return list;
  }, [catalog.makes, appliedProfile, selectedMakes, pickerMake]);

  const pickerOptions = useMemo(
    () => makes.filter((make) => !selectedMakes.includes(make)),
    [makes, selectedMakes],
  );

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

  const addMarque = (make: string) => {
    const token = make.trim();
    if (!token || selectedMakes.includes(token)) return;
    setSelectedMakes((current) => [...current, token]);
    setPickerMake("");
  };

  const removeMarque = (make: string) => {
    setSelectedMakes((current) => current.filter((item) => item !== make));
  };

  const applyPersonalisation = () => {
    const makes = selectedMakes;
    const profile: ForYouTestProfile = {
      make: makes[0],
      ...(makes.length ? { makes } : {}),
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
        showCloseButton={false}
        aria-describedby="personalization-interests-description"
        className="flex max-h-[min(92vh,1073px)] w-[calc(100%-20px)] max-w-[468px] flex-col gap-0 overflow-hidden rounded-[15px] border-[1.5px] border-[#c4c4c4] bg-white p-0 text-[#1b1d1f] shadow-[0px_2px_4px_0px_rgba(0,0,0,0.16)] ring-0 sm:max-w-[468px]"
      >
        <DialogClose className="absolute top-[16.5px] right-[20px] z-10 flex border-0 bg-transparent p-0">
          <img
            src="/personalization-close.svg"
            alt=""
            width={14.7333}
            height={14.7333}
            aria-hidden
          />
          <span className="sr-only">Close</span>
        </DialogClose>
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-[17px] pt-[44px] pb-5">
          <DialogHeader className="gap-5 text-left">
            <DialogTitle className="font-display text-[clamp(3.75rem,17.1vw,5rem)] font-black uppercase leading-[0.62] tracking-[-0.02em] text-[#1b1d1f]">
              <span className="block">Create a</span>
              <span className="block">personalised</span>
              <span className="block">magazine</span>
            </DialogTitle>
            <p className="font-display text-[clamp(1.65rem,7.48vw,2.1875rem)] font-extrabold uppercase leading-[0.64] tracking-[-0.02em] text-[#1b1d1f]">
              <span className="block">We have 80+ publications</span>
              <span className="block">from around the world</span>
            </p>
            <DialogDescription
              id="personalization-interests-description"
              className="font-sans text-[18px] font-normal leading-[22px] tracking-[-0.02em] text-[#1b1d1f]"
            >
              Choose one or more marques and a few interests, we&apos;ll shape content around them.
            </DialogDescription>
          </DialogHeader>
          <p className="font-display text-[clamp(1.25rem,5.34vw,1.5625rem)] font-extrabold uppercase leading-[0.64] text-[#1b1d1f]">
            Marque
          </p>
          {selectedMakes.length ? (
            <div className="flex flex-wrap gap-2" role="list" aria-label="Selected marques">
              {selectedMakes.map((make) => (
                <span key={make} role="listitem" className={selectedMarqueChipClass()}>
                  {make}
                  <button
                    type="button"
                    aria-label={`Remove ${make}`}
                    onClick={() => removeMarque(make)}
                    className="flex size-5 items-center justify-center rounded-sm text-white/90 hover:text-white"
                  >
                    <X aria-hidden className="size-3.5" strokeWidth={2.5} />
                  </button>
                </span>
              ))}
            </div>
          ) : null}
          <div className="relative">
            <select
              aria-label="Marque"
              className={selectClass}
              value={pickerMake}
              onChange={(event) => {
                const value = event.target.value;
                if (value) addMarque(value);
                else setPickerMake("");
              }}
            >
              <option value="">Select your Marque(s)</option>
              {pickerOptions.map((make) => (
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
          <p className="font-display text-[clamp(1.25rem,5.34vw,1.5625rem)] font-extrabold uppercase leading-[0.64] text-[#1b1d1f]">
            Interests
          </p>
          <div
            className="grid grid-cols-3 gap-[10px]"
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
        <DialogFooter className="mx-0 mb-0 flex-row items-center justify-end gap-6 rounded-b-[15px] border-t border-[#e5e5e5] bg-[#fafafa] px-[17px] py-[18px] sm:flex-row sm:justify-end sm:px-[17px]">
          <button
            type="button"
            onClick={dismiss}
            className="font-display text-[16px] font-extrabold uppercase leading-[22px] text-[#626262] underline decoration-solid underline-offset-2 md:text-[18px] md:leading-6"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={applyPersonalisation}
            className="flex h-[52px] min-w-[153px] shrink-0 items-center justify-center rounded-[5px] bg-[#1b1d1f] px-4 font-display text-[18px] font-extrabold uppercase leading-6 text-white"
          >
            Build my magazine
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
