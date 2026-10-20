"use client";

import { PersonalizationInterestsModal } from "@/components/personalization-interests-modal";
import type { ForYouTestProfile } from "@/lib/engine/for-you-test";
import {
  isPersonalizationOnboarded,
  readForYouTestStoredQuery,
  shouldShowPersonalizationInterestsModal,
  PERSONALIZATION_ONBOARDED_STORAGE_KEY,
} from "@/lib/engine/personalization-onboard";
import { useEffect, useState } from "react";

export function PersonalizationOnboardGate({
  urlProfile,
  pathname = "/",
}: {
  urlProfile: ForYouTestProfile;
  pathname?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onboarded = isPersonalizationOnboarded(
      window.localStorage.getItem(PERSONALIZATION_ONBOARDED_STORAGE_KEY),
    );
    const storedQuery = readForYouTestStoredQuery();
    const show = shouldShowPersonalizationInterestsModal({
      onboarded,
      urlProfile,
      storedQuery,
    });
    if (show) setOpen(true);
  }, [urlProfile]);

  if (!open) return null;

  return (
    <PersonalizationInterestsModal
      open={open}
      onOpenChange={setOpen}
      pathname={pathname}
      appliedProfile={{ make: urlProfile.make, interests: urlProfile.interests }}
    />
  );
}
