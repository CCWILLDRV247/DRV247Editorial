import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { contextualCommunityLabel, LABEL_FLOORS } from "./labels";

describe("contextual community labels", () => {
  it("returns null under cohort floors", () => {
    assert.equal(
      contextualCommunityLabel(1, [
        { event: "interested", articleId: 1, visitorKey: "a", cohort: "Ferrari" },
        { event: "save", articleId: 1, visitorKey: "b", cohort: "Ferrari" },
      ]),
      null,
    );
  });

  it("labels only with a real cohort that clears both floors", () => {
    const rows = Array.from({ length: LABEL_FLOORS.cohortUniqueVisitors }, (_, index) => ({
      event: "interested" as const,
      articleId: 9,
      visitorKey: `v-${index}`,
      cohort: "Ferrari",
    }));
    assert.equal(contextualCommunityLabel(9, rows), "Marked by Ferrari readers");
    assert.equal(contextualCommunityLabel(3, rows), null);
  });
});
