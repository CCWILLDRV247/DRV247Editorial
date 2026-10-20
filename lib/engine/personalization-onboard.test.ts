import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isPersonalizationOnboarded,
  shouldShowPersonalizationInterestsModal,
} from "./personalization-onboard";
import { parseForYouTestProfile } from "./for-you-test";

describe("personalization onboard", () => {
  const empty = parseForYouTestProfile({});

  it("recognises onboarded flag", () => {
    assert.equal(isPersonalizationOnboarded("1"), true);
    assert.equal(isPersonalizationOnboarded(null), false);
    assert.equal(isPersonalizationOnboarded(""), false);
  });

  it("shows modal for first visit with no filters", () => {
    assert.equal(
      shouldShowPersonalizationInterestsModal({
        onboarded: false,
        urlProfile: empty,
        storedQuery: null,
      }),
      true,
    );
  });

  it("hides when already onboarded", () => {
    assert.equal(
      shouldShowPersonalizationInterestsModal({
        onboarded: true,
        urlProfile: empty,
        storedQuery: null,
      }),
      false,
    );
  });

  it("hides when URL already carries personalization", () => {
    const profile = parseForYouTestProfile({ interest: "Classic" });
    assert.equal(
      shouldShowPersonalizationInterestsModal({
        onboarded: false,
        urlProfile: profile,
        storedQuery: null,
      }),
      false,
    );
  });

  it("hides when localStorage already has filter state", () => {
    assert.equal(
      shouldShowPersonalizationInterestsModal({
        onboarded: false,
        urlProfile: empty,
        storedQuery: "interest=JDM",
      }),
      false,
    );
  });
});
