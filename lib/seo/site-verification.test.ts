import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { buildSiteVerificationMetadata } from "./site-verification";

const envKeys = ["GOOGLE_SITE_VERIFICATION", "BING_SITE_VERIFICATION"] as const;

function restoreEnv(snapshot: Record<string, string | undefined>) {
  for (const key of envKeys) {
    const value = snapshot[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

describe("SEO site verification metadata", () => {
  let snapshot: Record<string, string | undefined>;

  afterEach(() => {
    restoreEnv(snapshot);
  });

  it("returns empty when env vars are unset", () => {
    snapshot = {
      GOOGLE_SITE_VERIFICATION: process.env.GOOGLE_SITE_VERIFICATION,
      BING_SITE_VERIFICATION: process.env.BING_SITE_VERIFICATION,
    };
    delete process.env.GOOGLE_SITE_VERIFICATION;
    delete process.env.BING_SITE_VERIFICATION;
    assert.deepEqual(buildSiteVerificationMetadata(), {});
  });

  it("maps Google and Bing env vars to metadata.verification", () => {
    snapshot = {
      GOOGLE_SITE_VERIFICATION: process.env.GOOGLE_SITE_VERIFICATION,
      BING_SITE_VERIFICATION: process.env.BING_SITE_VERIFICATION,
    };
    process.env.GOOGLE_SITE_VERIFICATION = " google-token ";
    process.env.BING_SITE_VERIFICATION = "bing-token";
    assert.deepEqual(buildSiteVerificationMetadata(), {
      verification: {
        google: "google-token",
        other: { "msvalidate.01": "bing-token" },
      },
    });
  });
});
