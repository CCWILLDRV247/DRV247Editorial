import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("hero image optimization", () => {
  it("sends hero and featured-pick images through next/image", () => {
    const storyImage = readFileSync(new URL("../../components/story-image.tsx", import.meta.url), "utf8");
    const frame = readFileSync(new URL("../../components/story-image-frame.tsx", import.meta.url), "utf8");
    assert.match(storyImage, /optimize=\{priority \|\| eager\}/);
    assert.match(frame, /from "next\/image"/);
    assert.match(frame, /quality=\{HERO_QUALITY\}/);
    assert.match(frame, /HERO_QUALITY = 75/);
    assert.match(frame, /HERO_SIZES = "\(max-width: 1080px\) 100vw, 1080px"/);
    assert.match(frame, /preload=\{priority\}/);
    assert.match(frame, /onError=\{\(\) => setUseNative\(true\)\}/);
  });

  it("keeps rail cards on a lazy native img walker", () => {
    const frame = readFileSync(new URL("../../components/story-image-frame.tsx", import.meta.url), "utf8");
    const card = readFileSync(new URL("../../components/story-card.tsx", import.meta.url), "utf8");
    const carousel = readFileSync(new URL("../../components/category-carousel.tsx", import.meta.url), "utf8");
    const storyCard = card.slice(card.indexOf("export function StoryCard"), card.indexOf("export function StoryHero"));
    const pickCard = card.slice(card.indexOf("export function PickCard"));
    assert.match(frame, /<img/);
    assert.match(frame, /loading=\{loadEager \? "eager" : "lazy"\}/);
    assert.match(frame, /data-next/);
    assert.doesNotMatch(storyCard, /priority/);
    assert.doesNotMatch(storyCard, /eager/);
    assert.doesNotMatch(pickCard, /priority/);
    assert.doesNotMatch(pickCard, /eager/);
    assert.doesNotMatch(carousel, /priority/);
    assert.doesNotMatch(carousel, /eager/);
  });
});
