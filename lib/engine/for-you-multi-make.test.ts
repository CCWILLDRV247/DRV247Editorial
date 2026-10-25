import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  articleMatchesForYouTest,
  forYouTestFilterSearchString,
  parseForYouTestProfile,
  profileMakes,
} from "./for-you-test";
import { contextFromTestProfile } from "./personalize";

describe("for-you multi-marque profile", () => {
  it("round-trips multiple make params in filter search string", () => {
    const profile = parseForYouTestProfile({
      make: ["Porsche", "Ferrari"],
      interest: ["Classic"],
    });
    assert.deepEqual(profileMakes(profile), ["Porsche", "Ferrari"]);
    assert.equal(profile.make, "Porsche");

    const query = forYouTestFilterSearchString(profile);
    assert.equal(
      query,
      "make=Porsche&make=Ferrari&interest=Classic",
    );

    const restored = parseForYouTestProfile(new URLSearchParams(query));
    assert.deepEqual(profileMakes(restored), ["Porsche", "Ferrari"]);
    assert.deepEqual(restored.interests, profile.interests);
  });

  it("builds one garage vehicle per marque for rank overlay", () => {
    const profile = parseForYouTestProfile({ make: ["Porsche", "Ferrari"] });
    const { vehicles } = contextFromTestProfile(profile);
    assert.equal(vehicles.length, 2);
    assert.deepEqual(
      vehicles.map((vehicle) => vehicle.make),
      ["Porsche", "Ferrari"],
    );
  });

  it("hard filter matches articles for any selected marque", () => {
    const profile = parseForYouTestProfile({ make: ["Porsche", "Ferrari"] });
    const porscheStory = {
      makes: ["Porsche"],
      models: ["911"],
      interests: [],
      locations: [],
    };
    const ferrariStory = {
      makes: ["Ferrari"],
      models: ["F355"],
      interests: [],
      locations: [],
    };
    const hondaStory = {
      makes: ["Honda"],
      models: ["Civic"],
      interests: [],
      locations: [],
    };
    assert.equal(articleMatchesForYouTest(porscheStory, profile), true);
    assert.equal(articleMatchesForYouTest(ferrariStory, profile), true);
    assert.equal(articleMatchesForYouTest(hondaStory, profile), false);
  });

  it("keeps legacy single make query param", () => {
    const profile = parseForYouTestProfile(new URLSearchParams("make=Porsche&interest=Track"));
    assert.deepEqual(profileMakes(profile), ["Porsche"]);
    assert.equal(forYouTestFilterSearchString(profile), "make=Porsche&interest=Track");
  });
});
