import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { InterludeCompositionVariant } from "./editorial-composition";
import {
  INTERLUDE_FEED_TYPOGRAPHY,
  INTERLUDE_TYPE_SCALE,
  INTERLUDE_VARIANT_TYPOGRAPHY,
} from "./interlude-typography";

const BASELINE = {
  statement: {
    labelPx: 11,
    type: ["clamp(2.75rem,16vw,7.5rem)", "clamp(4rem,11vw,8.5rem)"],
  },
  pause: { labelPx: 10, type: ["clamp(2.5rem,14vw,6.5rem)"] },
  whisper: { labelPx: 10, type: ["clamp(2.25rem,11vw,5.5rem)"] },
  accent: { labelPx: 10, type: ["clamp(2.5rem,13vw,6rem)"] },
  feed: { type: ["clamp(2.75rem,12vw,8.4rem)"] },
} as const;

function parseClamp(input: string) {
  const match = input.match(/^clamp\(([\d.]+)rem,([\d.]+)vw,([\d.]+)rem\)$/);
  assert.ok(match, `expected clamp() string, got ${input}`);
  return {
    min: Number(match[1]),
    vw: Number(match[2]),
    max: Number(match[3]),
  };
}

function scaledRem(value: number) {
  return Math.round(value * INTERLUDE_TYPE_SCALE * 1000) / 1000;
}

function extractClamps(fragment: string) {
  return [...fragment.matchAll(/clamp\([\d.]+rem,[\d.]+vw,[\d.]+rem\)/g)].map(
    (match) => match[0],
  );
}

function extractLabelPx(fragment: string) {
  const match = fragment.match(/text-\[(\d+)px\]/);
  return match ? Number(match[1]) : undefined;
}

describe("interlude typography", () => {
  it("scales every homepage variant label and type clamp by 20%", () => {
    const variants: InterludeCompositionVariant[] = [
      "statement",
      "pause",
      "whisper",
      "accent",
    ];
    for (const variant of variants) {
      const baseline = BASELINE[variant];
      const typography = INTERLUDE_VARIANT_TYPOGRAPHY[variant];
      assert.equal(
        extractLabelPx(typography.label),
        Math.round(baseline.labelPx * INTERLUDE_TYPE_SCALE),
      );

      const clamps = extractClamps(typography.type);
      assert.equal(clamps.length, baseline.type.length);
      clamps.forEach((clamp, index) => {
        const scaled = parseClamp(clamp);
        const base = parseClamp(baseline.type[index]!);
        assert.equal(scaled.min, scaledRem(base.min));
        assert.equal(scaled.vw, scaledRem(base.vw));
        assert.equal(scaled.max, scaledRem(base.max));
      });
    }
  });

  it("scales category feed interstitial copy by 20%", () => {
    const [baseline] = BASELINE.feed.type;
    const [scaled] = extractClamps(INTERLUDE_FEED_TYPOGRAPHY.type);
    const base = parseClamp(baseline);
    const next = parseClamp(scaled!);
    assert.equal(next.min, scaledRem(base.min));
    assert.equal(next.vw, scaledRem(base.vw));
    assert.equal(next.max, scaledRem(base.max));
  });
});
