import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildNewsArticleJsonLd,
  buildCollectionPageJsonLd,
  buildWebPageJsonLd,
  buildWebSiteJsonLd,
} from "./json-ld";
import {
  EDITORIAL_SITE_DESCRIPTION,
  EDITORIAL_SITE_TITLE,
  POLICY_META,
  buildCategoryMetadata,
  buildHomeMetadata,
  buildPolicyMetadata,
  buildRootLayoutMetadata,
  buildSavedMetadata,
  buildStoryMetadata,
  editorialCanonicalPath,
} from "./metadata";
import { robotsForPersonalizedView, searchParamsHavePersonalizationFilters } from "./personalization";

describe("SEO personalization / noindex", () => {
  it("detects filter query params", () => {
    assert.equal(searchParamsHavePersonalizationFilters({}), false);
    assert.equal(searchParamsHavePersonalizationFilters({ make: "Porsche" }), true);
    assert.equal(searchParamsHavePersonalizationFilters({ profile: "A" }), true);
    assert.equal(searchParamsHavePersonalizationFilters({ make: "" }), false);
    assert.equal(searchParamsHavePersonalizationFilters({ interest: ["Classic"] }), true);
  });

  it("returns noindex robots only for filtered URLs", () => {
    assert.equal(robotsForPersonalizedView({}), undefined);
    assert.deepEqual(robotsForPersonalizedView({ make: "Ferrari" }), { index: false, follow: true });
  });
});

describe("SEO metadata helpers", () => {
  it("builds canonical editorial URLs", () => {
    assert.equal(editorialCanonicalPath("/"), "https://editorial.drv247.com");
    assert.equal(editorialCanonicalPath("/category/cars"), "https://editorial.drv247.com/category/cars");
    assert.equal(editorialCanonicalPath("/story/42"), "https://editorial.drv247.com/story/42");
    assert.equal(editorialCanonicalPath("/policy"), "https://editorial.drv247.com/policy");
  });

  it("home metadata stays indexable without query params", () => {
    const meta = buildHomeMetadata({});
    assert.equal(meta.robots, undefined);
    assert.equal(meta.alternates?.canonical, "https://editorial.drv247.com");
    assert.equal(meta.description, EDITORIAL_SITE_DESCRIPTION);
    assert.deepEqual(meta.title, { absolute: EDITORIAL_SITE_TITLE });
    assert.match(String(meta.openGraph?.title), /DRV247 Editorial/);
    assert.equal(meta.openGraph?.description, EDITORIAL_SITE_DESCRIPTION);
    assert.equal(meta.twitter?.description, EDITORIAL_SITE_DESCRIPTION);
  });

  it("root layout metadata carries editorial defaults", () => {
    const root = buildRootLayoutMetadata();
    assert.equal(root.description, EDITORIAL_SITE_DESCRIPTION);
    const title = root.title;
    assert.equal(typeof title === "object" && title && "default" in title ? title.default : title, EDITORIAL_SITE_TITLE);
    assert.match(
      String(typeof title === "object" && title && "template" in title ? title.template : ""),
      /DRV247 Editorial/,
    );
    assert.equal(root.openGraph?.description, EDITORIAL_SITE_DESCRIPTION);
  });

  it("category metadata uses desk blurb", () => {
    const meta = buildCategoryMetadata("cars", "Cars", {});
    assert.match(String(meta.description), /Classics, new metal/);
    assert.deepEqual(meta.robots, undefined);
  });

  it("filtered listing metadata is noindex with clean canonical", () => {
    const meta = buildCategoryMetadata("culture", "Culture", { make: "BMW" });
    assert.deepEqual(meta.robots, { index: false, follow: true });
    assert.equal(meta.alternates?.canonical, "https://editorial.drv247.com/category/culture");
  });

  it("story metadata includes article Open Graph", () => {
    const meta = buildStoryMetadata(
      {
        id: 9,
        title: "Test headline",
        summary: "Teaser only.",
        imageUrl: "https://cdn.example.com/hero.jpg",
        publishedAt: "2026-01-15T12:00:00.000Z",
        publicationName: "Example Pub",
      },
      {},
    );
    assert.equal((meta.openGraph as { type?: string } | undefined)?.type, "article");
    assert.equal(meta.alternates?.canonical, "https://editorial.drv247.com/story/9");
  });

  it("saved shelf is noindex and off the sitemap contract", () => {
    const meta = buildSavedMetadata();
    assert.equal(meta.title, "Saved");
    assert.deepEqual(meta.robots, { index: false, follow: true });
    assert.equal(meta.alternates?.canonical, undefined);
  });

  it("policy metadata is indexable with an editorial canonical", () => {
    const meta = buildPolicyMetadata();
    assert.equal(meta.title, POLICY_META.title);
    assert.equal(meta.description, POLICY_META.description);
    assert.equal(meta.alternates?.canonical, "https://editorial.drv247.com/policy");
    assert.deepEqual(meta.robots, { index: true, follow: true });
    assert.equal((meta.openGraph as { type?: string } | undefined)?.type, "website");
  });
});

describe("SEO JSON-LD", () => {
  it("NewsArticle includes required fields without full body", () => {
    const json = buildNewsArticleJsonLd({
      headline: "Grid notes",
      description: "Short teaser.",
      imageUrl: "https://cdn.example.com/a.jpg",
      datePublished: "2026-01-15T12:00:00.000Z",
      authorName: "Daily Sportscar",
      pageUrl: "https://editorial.drv247.com/story/1",
    });
    assert.equal(json["@type"], "NewsArticle");
    assert.equal(json.headline, "Grid notes");
    assert.equal(json.description, "Short teaser.");
    assert.deepEqual(json.image, ["https://cdn.example.com/a.jpg"]);
    const publisher = json.publisher as { name: string };
    assert.equal(publisher.name, "DRV247");
    assert.equal((json.mainEntityOfPage as { "@id": string })["@id"], "https://editorial.drv247.com/story/1");
    assert.equal(json.articleBody, undefined);
  });

  it("CollectionPage stays minimal", () => {
    const json = buildCollectionPageJsonLd({
      name: "Cars",
      description: "Desk lane",
      pageUrl: "https://editorial.drv247.com/category/cars",
    });
    assert.equal(json["@type"], "CollectionPage");
    assert.equal(json.url, "https://editorial.drv247.com/category/cars");
  });

  it("WebSite JSON-LD describes the editorial product", () => {
    const json = buildWebSiteJsonLd();
    assert.equal(json["@type"], "WebSite");
    assert.equal(json.description, EDITORIAL_SITE_DESCRIPTION);
    assert.equal(json.url, "https://editorial.drv247.com");
  });

  it("policy WebPage JSON-LD stays on the editorial host", () => {
    const json = buildWebPageJsonLd({
      name: POLICY_META.title,
      description: POLICY_META.description,
      pageUrl: "https://editorial.drv247.com/policy",
    });
    assert.equal(json["@type"], "WebPage");
    assert.equal(json.url, "https://editorial.drv247.com/policy");
    assert.equal(json.name, "Editorial policy");
  });
});
