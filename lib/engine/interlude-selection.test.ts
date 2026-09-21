import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FOR_YOU_DEMO_PROFILES } from "./for-you-test";
import { getEditorialInterlude } from "./editorial-interlude";
import {
  buildInterludeContext,
  pickInterludeForContext,
  profileInterludeSeed,
  scoreInterludeCandidate,
  selectHomepageInterludes,
} from "./interlude-selection";
import type { InterludeContextSource } from "./interlude-selection";
import { DEFAULT_INTERLUDE_SELECTION_WEIGHTS } from "./interlude-selection";

function article(partial: Partial<InterludeContextSource> & Pick<InterludeContextSource, "primaryCategory">) {
  return {
    makes: [],
    models: [],
    interests: [],
    categories: [],
    ...partial,
  } satisfies InterludeContextSource;
}

describe("interlude selection", () => {
  it("scores category and tag matches from surrounding context", () => {
    const context = buildInterludeContext(
      [
        article({
          primaryCategory: "culture",
          categories: ["culture", "cars"],
          interests: ["Classic", "ownership"],
          makes: ["Ferrari"],
        }),
      ],
      FOR_YOU_DEMO_PROFILES.A,
    );
    const classic = getEditorialInterlude("some-cars-under-your-skin")!;
    const modified = getEditorialInterlude("best-builds-never-finished")!;
    const classicScore = scoreInterludeCandidate(classic, context, {
      weights: DEFAULT_INTERLUDE_SELECTION_WEIGHTS,
      usedIds: new Set(),
      previous: [],
      seed: 1,
    });
    const modifiedScore = scoreInterludeCandidate(modified, context, {
      weights: DEFAULT_INTERLUDE_SELECTION_WEIGHTS,
      usedIds: new Set(),
      previous: [],
      seed: 1,
    });
    assert.ok(classicScore > modifiedScore);
  });

  it("penalises reusing the same interlude", () => {
    const context = buildInterludeContext([], FOR_YOU_DEMO_PROFILES.A);
    const line = getEditorialInterlude("truth-shall-set-you-free")!;
    const fresh = scoreInterludeCandidate(line, context, {
      weights: DEFAULT_INTERLUDE_SELECTION_WEIGHTS,
      usedIds: new Set(),
      previous: [],
      seed: 2,
    });
    const reused = scoreInterludeCandidate(line, context, {
      weights: DEFAULT_INTERLUDE_SELECTION_WEIGHTS,
      usedIds: new Set([line.id]),
      previous: [],
      seed: 2,
    });
    assert.ok(fresh > reused);
  });

  it("penalises consecutive lines with the same editorial type", () => {
    const context = buildInterludeContext(
      [article({ primaryCategory: "motorsport", interests: ["Performance", "Motorsport"] })],
      FOR_YOU_DEMO_PROFILES.C,
    );
    const first = getEditorialInterlude("how-much-power-too-much")!;
    const second = getEditorialInterlude("manual-still-matters")!;
    const isolated = scoreInterludeCandidate(second, context, {
      weights: DEFAULT_INTERLUDE_SELECTION_WEIGHTS,
      usedIds: new Set(),
      previous: [],
      seed: 3,
    });
    const consecutive = scoreInterludeCandidate(second, context, {
      weights: DEFAULT_INTERLUDE_SELECTION_WEIGHTS,
      usedIds: new Set([first.id]),
      previous: [first],
      seed: 3,
    });
    assert.ok(isolated > consecutive);
  });

  it("penalises consecutive lines that share multiple tags", () => {
    const context = buildInterludeContext(
      [article({ primaryCategory: "culture", interests: ["Classic", "collecting"] })],
      FOR_YOU_DEMO_PROFILES.A,
    );
    const first = getEditorialInterlude("built-to-be-remembered")!;
    const second = getEditorialInterlude("concours-quietest-argument")!;
    const isolated = scoreInterludeCandidate(second, context, {
      weights: DEFAULT_INTERLUDE_SELECTION_WEIGHTS,
      usedIds: new Set(),
      previous: [],
      seed: 4,
    });
    const consecutive = scoreInterludeCandidate(second, context, {
      weights: DEFAULT_INTERLUDE_SELECTION_WEIGHTS,
      usedIds: new Set([first.id]),
      previous: [first],
      seed: 4,
    });
    assert.ok(isolated > consecutive);
  });

  it("profiles A and C can pick different before-categories interludes", () => {
    const ferrariDesk: InterludeContextSource[] = [
      article({
        primaryCategory: "culture",
        categories: ["culture"],
        interests: ["Classic", "Performance"],
        makes: ["Ferrari"],
      }),
      article({
        primaryCategory: "cars",
        categories: ["cars"],
        interests: ["Classic"],
        makes: ["Ferrari"],
      }),
    ];
    const skylineDesk: InterludeContextSource[] = [
      article({
        primaryCategory: "cars",
        categories: ["cars"],
        interests: ["JDM", "Modified"],
        makes: ["Nissan"],
        models: ["Skyline"],
      }),
      article({
        primaryCategory: "motorsport",
        categories: ["motorsport"],
        interests: ["Performance", "Modified"],
        makes: ["Nissan"],
      }),
    ];

    const profileA = selectHomepageInterludes({
      picks: ferrariDesk.slice(0, 1),
      forYourCar: ferrariDesk,
      yourInterests: ferrariDesk,
      carousels: [
        { slug: "cars", articles: ferrariDesk },
        { slug: "culture", articles: ferrariDesk },
        { slug: "driving", articles: ferrariDesk },
      ],
      profile: FOR_YOU_DEMO_PROFILES.A,
      seed: profileInterludeSeed(FOR_YOU_DEMO_PROFILES.A),
    });
    const profileC = selectHomepageInterludes({
      picks: skylineDesk.slice(0, 1),
      forYourCar: skylineDesk,
      yourInterests: skylineDesk,
      carousels: [
        { slug: "cars", articles: skylineDesk },
        { slug: "culture", articles: skylineDesk },
        { slug: "driving", articles: skylineDesk },
      ],
      profile: FOR_YOU_DEMO_PROFILES.C,
      seed: profileInterludeSeed(FOR_YOU_DEMO_PROFILES.C),
    });

    const beforeA = profileA.find((item) => item.slot === "before-categories")?.interlude.id;
    const beforeC = profileC.find((item) => item.slot === "before-categories")?.interlude.id;
    assert.ok(beforeA);
    assert.ok(beforeC);
    assert.notEqual(beforeA, beforeC);
  });

  it("does not repeat interludes across homepage slots", () => {
    const desk = [
      article({
        primaryCategory: "cars",
        interests: ["Performance", "Modified"],
        makes: ["Nissan"],
      }),
      article({
        primaryCategory: "motorsport",
        interests: ["Motorsport"],
        makes: ["Nissan"],
      }),
    ];
    const selected = selectHomepageInterludes({
      picks: desk,
      forYourCar: desk,
      yourInterests: desk,
      carousels: [
        { slug: "cars", articles: desk },
        { slug: "culture", articles: desk },
        { slug: "driving", articles: desk },
        { slug: "events", articles: desk },
      ],
      profile: FOR_YOU_DEMO_PROFILES.C,
    });
    const ids = selected.map((item) => item.interlude.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(ids.length >= 1 && ids.length <= 4);
  });

  it("prefers contextual picks over the truth line for modified JDM desks", () => {
    const context = buildInterludeContext(
      [
        article({
          primaryCategory: "cars",
          interests: ["JDM", "Modified", "Performance"],
          makes: ["Nissan"],
          models: ["Skyline"],
        }),
      ],
      FOR_YOU_DEMO_PROFILES.C,
    );
    const pick = pickInterludeForContext(context, {
      seed: profileInterludeSeed(FOR_YOU_DEMO_PROFILES.C),
    });
    assert.notEqual(pick?.interlude.id, "truth-shall-set-you-free");
  });
});
