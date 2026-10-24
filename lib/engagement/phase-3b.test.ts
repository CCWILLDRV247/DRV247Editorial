import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { isPhase3bEnabled } from "./phase-3b";
import { DEFAULT_RANK_WEIGHTS } from "@/lib/engine/rank";

describe("Phase 3B stays off", () => {
  it("defaults off unless DRV247_PHASE_3B is 1 or true", () => {
    assert.equal(isPhase3bEnabled({}), false);
    assert.equal(isPhase3bEnabled({ DRV247_PHASE_3B: "" }), false);
    assert.equal(isPhase3bEnabled({ DRV247_PHASE_3B: "0" }), false);
    assert.equal(isPhase3bEnabled({ DRV247_PHASE_3B: "1" }), true);
    assert.equal(isPhase3bEnabled({ DRV247_PHASE_3B: "true" }), true);
  });

  it("does not add public 3B discovery UI or change popularity", () => {
    assert.equal(DEFAULT_RANK_WEIGHTS.popularity, 0);
    const home = readFileSync(new URL("../../components/for-you-home.tsx", import.meta.url), "utf8");
    assert.equal(home.includes("My Discoveries"), false);
    assert.equal(home.includes("Beyond Your Garage"), false);
    assert.equal(home.includes("What Enthusiasts Are Into"), false);
    const flag = readFileSync(new URL("./phase-3b.ts", import.meta.url), "utf8");
    assert.match(flag, /DRV247_PHASE_3B/);
  });
});
