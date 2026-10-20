import type { Metadata } from "next";

function trimEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** Root-layout verification meta tags from optional env vars (Search Console, Bing). */
export function buildSiteVerificationMetadata(): Pick<Metadata, "verification"> {
  const google = trimEnv(process.env.GOOGLE_SITE_VERIFICATION);
  const bing = trimEnv(process.env.BING_SITE_VERIFICATION);

  if (!google && !bing) {
    return {};
  }

  const verification: NonNullable<Metadata["verification"]> = {};
  if (google) {
    verification.google = google;
  }
  if (bing) {
    verification.other = { ...(verification.other ?? {}), "msvalidate.01": bing };
  }

  return { verification };
}
