import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { editorialRobots } from "./robots-config";
import { EDITORIAL_SITE_URL } from "./site";
import {
  buildSitemapEntries,
  countStoryUrlsInSitemap,
  isIndexableStory,
  staticSitemapPaths,
  type IndexableStoryRow,
  type MediaSourceRow,
} from "./sitemap-entries";

function story(overrides: Partial<IndexableStoryRow> = {}): IndexableStoryRow {
  return {
    id: 42,
    sourceId: "auto_001",
    url: "https://example.com/good-story",
    canonicalUrl: "https://example.com/good-story",
    title: "Good story",
    excerpt: "A real article teaser.",
    publishedAt: 1_700_000_000_000,
    lastProcessed: null,
    ...overrides,
  };
}

function source(overrides: Partial<MediaSourceRow> = {}): MediaSourceRow {
  return {
    id: "auto_001",
    enabled: true,
    url: "https://example.com",
    ...overrides,
  };
}

describe("editorial SEO sitemap", () => {
  it("robots allows public routes and disallows admin", () => {
    const robots = editorialRobots();
    const rule = Array.isArray(robots.rules) ? robots.rules[0] : robots.rules;
    assert.equal(rule?.allow, "/");
    const disallow = rule?.disallow;
    const blocked = Array.isArray(disallow) ? disallow : disallow ? [disallow] : [];
    assert.ok(blocked.some((path) => path.startsWith("/admin")));
    assert.match(String(robots.sitemap), /editorial\.drv247\.com\/sitemap\.xml$/);
  });

  it("static sitemap paths include home and PRIMARY_NAV categories", () => {
    const paths = staticSitemapPaths().map((entry) => entry.path);
    assert.deepEqual(paths, ["/", "/category/cars", "/category/culture", "/category/driving", "/category/events"]);
  });

  it("indexable stories require enabled sources and editorial eligibility", () => {
    const row = story();
    assert.equal(isIndexableStory(row, source(), false), true);
    assert.equal(isIndexableStory(row, source({ enabled: false }), false), false);
    assert.equal(
      isIndexableStory(
        story({ url: "https://shop.example.com/products/tee", canonicalUrl: "https://shop.example.com/products/tee" }),
        source(),
        false,
      ),
      false,
    );
  });

  it("buildSitemapEntries includes static routes and eligible story IDs", () => {
    const sourceMap = new Map<string, MediaSourceRow>([["auto_001", source()]]);
    const entries = buildSitemapEntries([story({ id: 7 }), story({ id: 8, sourceId: "off" })], sourceMap, new Set());
    assert.ok(entries.every((entry) => entry.url.startsWith(EDITORIAL_SITE_URL)));
    assert.ok(entries.some((entry) => entry.url.endsWith("/story/7")));
    assert.ok(!entries.some((entry) => entry.url.endsWith("/story/8")));
    assert.equal(countStoryUrlsInSitemap(entries), 1);
  });
});
