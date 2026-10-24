import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { editorialCanonicalPath } from "@/lib/seo/metadata";
import {
  canUseWebShare,
  editorialStoryPath,
  editorialStorySharePayload,
  editorialStoryShareUrl,
  isPublisherUrl,
  shareEditorialStory,
} from "./share";

describe("editorial share URL", () => {
  it("builds the production teaser path, not the publisher link", () => {
    assert.equal(editorialStoryPath(42), "/story/42");
    assert.equal(editorialStoryShareUrl(42), "https://editorial.drv247.com/story/42");
    assert.equal(editorialStoryShareUrl(9), editorialCanonicalPath("/story/9"));
    assert.equal(isPublisherUrl("https://www.topgear.com/car-news/foo"), true);
    assert.equal(isPublisherUrl("https://editorial.drv247.com/story/42"), false);
    assert.doesNotMatch(editorialStoryShareUrl(7), /topgear/);
  });

  it("rejects invalid article ids", () => {
    assert.throws(() => editorialStoryShareUrl(0));
    assert.throws(() => editorialStoryShareUrl(-3));
    assert.throws(() => editorialStoryShareUrl(1.5));
  });

  it("share payload only includes the editorial URL", () => {
    const payload = editorialStorySharePayload({
      articleId: 12,
      title: "Test headline",
      text: "Teaser only.",
    });
    assert.equal(payload.url, "https://editorial.drv247.com/story/12");
    assert.equal(payload.title, "Test headline");
    assert.equal(payload.text, "Teaser only.");
    assert.equal(isPublisherUrl(String(payload.url)), false);
  });

  it("uses Web Share when available and copies otherwise", async () => {
    const shared: ShareData[] = [];
    const copied: string[] = [];
    const web = await shareEditorialStory(
      { articleId: 4, title: "Shared" },
      { share: async (data) => void shared.push(data ?? {}) },
    );
    assert.equal(web.method, "web_share");
    assert.equal(web.url, "https://editorial.drv247.com/story/4");
    assert.equal(shared[0]?.url, web.url);

    const copiedResult = await shareEditorialStory(
      { articleId: 5, title: "Copied" },
      { share: undefined as unknown as Navigator["share"] },
      { writeText: async (text) => void copied.push(text) },
    );
    assert.equal(copiedResult.method, "copy");
    assert.deepEqual(copied, ["https://editorial.drv247.com/story/5"]);
    assert.equal(canUseWebShare({ share: async () => undefined }), true);
    assert.equal(canUseWebShare({} as Navigator), false);
  });
});
