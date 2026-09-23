import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { liveSourceIdsMissingProducts } from "./ingest";

describe("liveSourceIdsMissingProducts", () => {
  it("asks only for enabled live sources with no persisted rows", () => {
    const missing = liveSourceIdsMissingProducts(
      [
        { id: "src-eurospares-live", enabled: true, kind: "sitemap" },
        { id: "src-design911-live", enabled: true, kind: "sitemap" },
        { id: "src-design911", enabled: true, kind: "csv" },
        { id: "src-manual", enabled: true, kind: "manual" },
        { id: "src-off", enabled: false, kind: "sitemap" },
      ],
      ["src-design911", "src-manual"],
    );
    assert.deepEqual(missing, ["src-eurospares-live", "src-design911-live"]);
  });

  it("skips a live source once it has products", () => {
    const missing = liveSourceIdsMissingProducts(
      [
        { id: "src-eurospares-live", enabled: 1, kind: "sitemap" },
        { id: "src-design911-live", enabled: 1, kind: "sitemap" },
      ],
      ["src-eurospares-live"],
    );
    assert.deepEqual(missing, ["src-design911-live"]);
  });

  it("returns empty when live catalogues are already loaded", () => {
    const missing = liveSourceIdsMissingProducts(
      [
        { id: "src-eurospares-live", enabled: true, kind: "sitemap" },
        { id: "src-design911-live", enabled: true, kind: "sitemap" },
      ],
      ["src-eurospares-live", "src-design911-live"],
    );
    assert.deepEqual(missing, []);
  });
});
