import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TEASER_CATEGORY_FEEDS } from "../../../config/teaser-feeds";
import { isTeaserStoryUrl, parseWpCategoryPosts, skipsOriginalPageFetch } from "./wp-json";

const feed = TEASER_CATEGORY_FEEDS.auto_132;

describe("HiConsumption Motors teasers", () => {
  it("keeps Motors permalinks and drops shop, gear, and the category index", () => {
    assert.equal(
      isTeaserStoryUrl(
        "https://hiconsumption.com/motors/alpine-a310-vision-concept/",
        feed,
      ),
      true,
    );
    assert.equal(
      isTeaserStoryUrl("https://hiconsumption.com/category/motors/", feed),
      false,
    );
    assert.equal(
      isTeaserStoryUrl("https://hiconsumption.com/gear/yeti-loadout-gobox/", feed),
      false,
    );
    assert.equal(
      isTeaserStoryUrl("https://hiconsumption.com/shop/motors/cap/", feed),
      false,
    );
    assert.equal(
      isTeaserStoryUrl("https://shop.hiconsumption.com/products/cap", feed),
      false,
    );
  });

  it("stores title, excerpt, summary, and image, and ignores the article body", () => {
    const body = "FULL ARTICLE BODY that must never be stored as the teaser.";
    const items = parseWpCategoryPosts(
      JSON.stringify([
        {
          id: 1,
          date_gmt: "2026-10-13T19:00:45",
          link: "https://hiconsumption.com/motors/suzuki-jimny/",
          categories: [1039, 99],
          title: { rendered: "Baby &#8217;90s Jimny" },
          excerpt: { rendered: "<p>Somebody in Japan is lowering a Jimny.</p>" },
          content: { rendered: `<p>${body}</p>` },
          yoast_head_json: {
            author: "Ryan Calder",
            og_description: "Somebody in Japan is lowering a Jimny.",
            og_image: [{ url: "https://cdn.hiconsumption.com/wp-content/uploads/jimny.jpg" }],
          },
        },
        {
          id: 2,
          link: "https://hiconsumption.com/gear/speaker/",
          categories: [1039],
          title: { rendered: "A speaker" },
          excerpt: { rendered: "<p>Not motors.</p>" },
        },
        {
          id: 3,
          link: "https://hiconsumption.com/motors/wrong-vertical/",
          categories: [12],
          title: { rendered: "Wrong category" },
          excerpt: { rendered: "<p>No.</p>" },
        },
        {
          id: 4,
          link: "https://hiconsumption.com/motors/embed-story/",
          title: { rendered: "Embed context story" },
          excerpt: { rendered: "<p>No categories array on embed.</p>" },
          yoast_head_json: {
            og_description: "Standfirst from Yoast.",
            og_image: [{ url: "https://cdn.hiconsumption.com/wp-content/uploads/embed.jpg" }],
          },
        },
      ]),
      feed,
    );

    assert.equal(items.length, 2);
    assert.equal(items[0]?.title, "Baby ’90s Jimny");
    assert.equal(items[0]?.excerpt, "Somebody in Japan is lowering a Jimny.");
    assert.equal(items[0]?.summary, "Somebody in Japan is lowering a Jimny.");
    assert.equal(
      items[0]?.imageUrl,
      "https://cdn.hiconsumption.com/wp-content/uploads/jimny.jpg",
    );
    assert.equal(items[0]?.method, "wp-json");
    assert.equal(JSON.stringify(items[0]).includes(body), false);
    assert.equal(items[1]?.canonicalUrl, "https://hiconsumption.com/motors/embed-story");
    assert.equal(items[1]?.summary, "Standfirst from Yoast.");
    assert.equal(skipsOriginalPageFetch("wp-json"), true);
  });
});
