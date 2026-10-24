import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  STORY_TEASER,
  STORY_TEASER_RELEVANCE_HINT,
  storyTeaserExcerpt,
  teaserTextRepeats,
} from "./story-teaser";

const article = readFileSync(new URL("../../components/magazine/story-article.tsx", import.meta.url), "utf8");
const actions = readFileSync(new URL("../../components/engagement/story-actions.tsx", import.meta.url), "utf8");
const outbound = readFileSync(
  new URL("../../components/engagement/outbound-story-link.tsx", import.meta.url),
  "utf8",
);

function count(source: string, needle: string) {
  return source.split(needle).length - 1;
}

describe("story teaser excerpt", () => {
  it("prefers the feed summary and never invents copy", () => {
    assert.equal(
      storyTeaserExcerpt({
        title: "Porsche 911 GT3",
        summary: "A short dek from the feed.",
        aiSummary: "A longer extract from the original page.",
      }),
      "A short dek from the feed.",
    );
  });

  it("falls back to the stored extract when the summary repeats the title", () => {
    assert.equal(
      storyTeaserExcerpt({
        title: "Porsche 911 GT3",
        summary: "Porsche 911 GT3",
        aiSummary: "Weissach’s latest Touring stays naturally aspirated.",
      }),
      "Weissach’s latest Touring stays naturally aspirated.",
    );
    assert.equal(
      storyTeaserExcerpt({
        title: "Porsche 911 GT3",
        summary: "Porsche 911 GT3.",
        aiSummary: "Weissach’s latest Touring stays naturally aspirated.",
      }),
      "Weissach’s latest Touring stays naturally aspirated.",
    );
  });

  it("hides an excerpt that only repeats the title", () => {
    assert.equal(
      storyTeaserExcerpt({
        title: "Porsche 911 GT3",
        summary: "Porsche 911 GT3",
        aiSummary: "porsche 911 gt3!",
      }),
      null,
    );
    assert.equal(teaserTextRepeats("Hello world", "Hello world."), true);
    assert.equal(teaserTextRepeats("Hello world", "Something else"), false);
  });

  it("uses the extract when there is no feed summary", () => {
    assert.equal(
      storyTeaserExcerpt({
        title: "Porsche 911 GT3",
        summary: "   ",
        aiSummary: "From the original standfirst.",
      }),
      "From the original standfirst.",
    );
  });
});

describe("story teaser hierarchy", () => {
  it("orders hero, publisher and date, headline, excerpt, engagement, then the publisher CTA", () => {
    const hero = article.indexOf("StoryHeroMedia");
    const meta = article.indexOf("STORY_TEASER.meta");
    const headline = article.indexOf("STORY_TEASER.headline");
    const excerpt = article.indexOf("STORY_TEASER.excerpt");
    const toolbar = article.indexOf("<StoryActions");
    const cta = article.indexOf("<OutboundStoryLink");
    assert.ok(hero > 0 && meta > hero && headline > meta && excerpt > headline && toolbar > excerpt && cta > toolbar);
    assert.match(article, /story\.source\.name/);
    assert.match(article, /formatStoryDate/);
    assert.match(article, /storyTeaserExcerpt/);
    assert.doesNotMatch(article, /StoryRelevance/);
    assert.doesNotMatch(article, /storyIntro|storyExtract/);
  });

  it("keeps a wrapping Alumni headline at 32–40px and a sentence-case body excerpt", () => {
    assert.match(STORY_TEASER.headline, /font-display/);
    assert.match(STORY_TEASER.headline, /clamp\(2rem,8\.5vw,2\.5rem\)/);
    assert.match(STORY_TEASER.headline, /leading-\[1\.1\]/);
    assert.doesNotMatch(STORY_TEASER.headline, /uppercase/);
    assert.doesNotMatch(STORY_TEASER.headline, /leading-\[0\.62\]/);
    assert.doesNotMatch(STORY_TEASER.headline, /9vw/);
    assert.doesNotMatch(STORY_TEASER.headline, /[^.\d]5rem/);
    assert.match(STORY_TEASER.excerpt, /text-\[17px\]/);
    assert.match(STORY_TEASER.excerpt, /leading-\[1\.5\]/);
    assert.doesNotMatch(STORY_TEASER.excerpt, /font-display/);
    assert.doesNotMatch(STORY_TEASER.excerpt, /uppercase/);
    assert.match(STORY_TEASER.meta, /text-\[13px\]/);
    assert.doesNotMatch(STORY_TEASER.meta, /uppercase/);
    assert.match(article, /STORY_TEASER\.headline/);
    assert.match(article, /STORY_TEASER\.excerpt/);
  });
});

describe("story teaser compact toolbar", () => {
  it("renders Interested, Save, a Share icon, and More with Less like this inside", () => {
    assert.match(actions, />\s*Interested\s*</);
    assert.match(actions, /saved \? "Saved" : "Save"/);
    assert.match(actions, /aria-label="Share"/);
    assert.match(actions, /Share2/);
    assert.match(actions, />\s*More\s*</);
    assert.match(actions, /Less like this/);
    assert.match(actions, /DropdownMenu/);
    assert.doesNotMatch(actions, /grid-cols-2/);
  });

  it("keeps 44×44 targets, pressed state, and the relevance hint for assistive tech only", () => {
    assert.match(STORY_TEASER.toolText, /h-11/);
    assert.match(STORY_TEASER.toolText, /min-w-11/);
    assert.match(STORY_TEASER.toolIcon, /size-11/);
    assert.match(actions, /aria-pressed=\{polarity === "interested"\}/);
    assert.match(actions, /aria-pressed=\{saved\}/);
    assert.match(actions, /role="status"/);
    assert.match(actions, /aria-live="polite"/);
    assert.match(actions, /sr-only/);
    assert.match(actions, /STORY_TEASER_RELEVANCE_HINT/);
    assert.equal(STORY_TEASER_RELEVANCE_HINT, "Relevance — not a quality rating");
    assert.doesNotMatch(actions, /mb-2 font-display text-sm font-bold uppercase/);
    assert.doesNotMatch(article, /Relevance — not a quality rating/);
  });

  it("fires each existing engagement event once and keeps the outbound publisher CTA", () => {
    assert.equal(count(actions, "name: ENGAGEMENT_EVENTS.interested"), 1);
    assert.equal(count(actions, "ENGAGEMENT_EVENTS.save :"), 1);
    assert.equal(count(actions, "ENGAGEMENT_EVENTS.unsave"), 1);
    assert.equal(count(actions, "name: ENGAGEMENT_EVENTS.share"), 1);
    assert.equal(count(actions, "name: ENGAGEMENT_EVENTS.lessLike"), 1);
    assert.equal(count(actions, "void recordMagazineEngagement"), 4);
    assert.match(actions, /await shareEditorialStory/);
    assert.match(actions, /toggleSavedArticleInStorage\(articleId\)/);
    assert.match(actions, /toggleArticleRelevanceInStorage\(articleId, next\)/);
    assert.match(article, /OutboundStoryLink/);
    assert.match(article, /Read on \$\{story\.source\.name\}/);
    assert.match(article, /Watch on \$\{story\.source\.name\}/);
    assert.match(outbound, /ENGAGEMENT_EVENTS\.outbound/);
    assert.match(outbound, /w-full/);
    assert.match(outbound, /uppercase/);
  });
});
