import {
  FOR_YOU_TEST_STORAGE_KEY,
  forYouTestIsActive,
  parseForYouTestProfile,
  type ForYouTestProfile,
} from "./for-you-test";

/** Set when the first-visit interests modal has been dismissed or completed. */
export const PERSONALIZATION_ONBOARDED_STORAGE_KEY = "drv247-personalization-onboarded";

export const PERSONALIZATION_ONBOARDED_VALUE = "1";

export function isPersonalizationOnboarded(storedValue: string | null | undefined): boolean {
  return storedValue === PERSONALIZATION_ONBOARDED_VALUE;
}

export function markPersonalizationOnboardedStorage(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    PERSONALIZATION_ONBOARDED_STORAGE_KEY,
    PERSONALIZATION_ONBOARDED_VALUE,
  );
}

function profileFromStoredQuery(storedQuery: string | null | undefined): ForYouTestProfile | null {
  const raw = storedQuery?.trim();
  if (!raw) return null;
  return parseForYouTestProfile(new URLSearchParams(raw));
}

/** Pure gate for the first-visit interests modal (client + unit tests). */
export function shouldShowPersonalizationInterestsModal(input: {
  onboarded: boolean;
  urlProfile: ForYouTestProfile;
  storedQuery?: string | null;
}): boolean {
  if (input.onboarded) return false;
  if (forYouTestIsActive(input.urlProfile)) return false;
  const stored = profileFromStoredQuery(input.storedQuery ?? null);
  if (stored && forYouTestIsActive(stored)) return false;
  return true;
}

/** Read persisted For You filter query from localStorage (browser only). */
export function readForYouTestStoredQuery(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(FOR_YOU_TEST_STORAGE_KEY);
}
