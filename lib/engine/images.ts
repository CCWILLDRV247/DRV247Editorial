import { decodeXmlEntities, isUsableArticleImage } from "../text";
import { fetchImageHeaders, type ImageHeaders } from "./http";

export const IMAGE_SOURCE_TYPES = [
  "rss_media",
  "rss_enclosure",
  "youtube",
  "og",
  "twitter",
  "article",
  "publication",
  "fallback",
] as const;

export type ImageSourceType = (typeof IMAGE_SOURCE_TYPES)[number];

export const IMAGE_SOURCE_RANK: Record<ImageSourceType, number> = {
  rss_media: 1,
  rss_enclosure: 2,
  youtube: 2,
  og: 3,
  twitter: 4,
  article: 5,
  publication: 6,
  fallback: 7,
};

export type ImageStatus = "pending" | "ok" | "failed" | "skipped";

export type ImageCandidate = {
  url: string;
  sourceType: ImageSourceType;
  status?: ImageStatus;
  lastValidated?: number | null;
};

export type ImagePayload = {
  primary: string | null;
  sources: ImageCandidate[];
  fallback: "drv247";
  status: ImageStatus | "missing";
  lastValidated: number | null;
  sourceType: ImageSourceType | null;
};

export type ImageHeadersFetcher = (url: string) => Promise<ImageHeaders>;

const VALIDATE_TTL_MS = 6 * 60 * 60 * 1000;
const MIN_IMAGE_BYTES = 1500;
const MAX_VALIDATE_ATTEMPTS = 3;

const validationCache = new Map<string, { at: number; result: ImageValidation }>();

export type ImageValidation = {
  ok: boolean;
  status: number;
  contentType: string;
  contentLength: number | null;
  finalUrl: string;
  reason: string | null;
};

export function isImageSourceType(value: string | null | undefined): value is ImageSourceType {
  return Boolean(value && (IMAGE_SOURCE_TYPES as readonly string[]).includes(value));
}

export function rankImageCandidates(candidates: ImageCandidate[]): ImageCandidate[] {
  const sorted = [...candidates]
    .filter((candidate) => isUsableArticleImage(candidate.url))
    .sort((left, right) => IMAGE_SOURCE_RANK[left.sourceType] - IMAGE_SOURCE_RANK[right.sourceType]);
  const seen = new Set<string>();
  const unique: ImageCandidate[] = [];
  for (const candidate of sorted) {
    const key = normalizeCandidateKey(candidate.url);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(candidate);
  }
  return unique;
}

export function pickBestImage(candidates: ImageCandidate[]): ImageCandidate | null {
  return rankImageCandidates(candidates)[0] ?? null;
}

export function resolveCandidateUrl(raw: string, baseUrl: string): string | null {
  if (!isUsableArticleImage(raw)) return null;
  try {
    const cleaned = decodeXmlEntities(raw.trim()).trim();
    const url = new URL(cleaned, baseUrl);
    if (url.protocol === "http:") url.protocol = "https:";
    if (url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function resolveCandidates(
  candidates: ImageCandidate[] | null | undefined,
  baseUrl: string,
): ImageCandidate[] {
  const resolved: ImageCandidate[] = [];
  for (const candidate of candidates ?? []) {
    const url = resolveCandidateUrl(candidate.url, baseUrl);
    if (!url) continue;
    resolved.push({ ...candidate, url });
  }
  return rankImageCandidates(resolved);
}

export async function validateImageUrl(
  url: string,
  options?: { fetchHeaders?: ImageHeadersFetcher; now?: number },
): Promise<ImageValidation> {
  const now = options?.now ?? Date.now();
  const cached = validationCache.get(url);
  if (cached && now - cached.at < VALIDATE_TTL_MS) return cached.result;

  const fetchHeaders = options?.fetchHeaders ?? ((target: string) => fetchImageHeaders(target));
  let headers: ImageHeaders;
  try {
    headers = await fetchHeaders(url);
  } catch {
    headers = {
      ok: false,
      status: 0,
      contentType: "",
      contentLength: null,
      finalUrl: url,
    };
  }

  const result = interpretImageHeaders(url, headers);
  validationCache.set(url, { at: now, result });
  return result;
}

export function interpretImageHeaders(url: string, headers: ImageHeaders): ImageValidation {
  const contentType = headers.contentType.toLowerCase().split(";")[0]?.trim() ?? "";
  const contentLength = headers.contentLength;
  if (!headers.ok || headers.status >= 400 || headers.status === 0) {
    return fail(headers, hotlinkReason(headers.status) ?? `http_${headers.status || "timeout"}`);
  }
  if (contentType.startsWith("text/html") || contentType.includes("json") || contentType === "text/plain") {
    return fail(headers, "not_image");
  }
  if (contentType.includes("svg")) return fail(headers, "svg");
  if (contentType && !contentType.startsWith("image/") && contentType !== "application/octet-stream") {
    return fail(headers, "not_image");
  }
  if (!contentType && !looksLikeImagePath(url) && !looksLikeImagePath(headers.finalUrl)) {
    return fail(headers, "not_image");
  }
  if (contentLength !== null && contentLength < MIN_IMAGE_BYTES) {
    return fail(headers, "too_small");
  }
  return {
    ok: true,
    status: headers.status,
    contentType,
    contentLength,
    finalUrl: headers.finalUrl,
    reason: null,
  };
}

export async function selectPrimaryImage(
  candidates: ImageCandidate[],
  options?: {
    fetchHeaders?: ImageHeadersFetcher;
    maxAttempts?: number;
    skipNetwork?: boolean;
    now?: number;
  },
): Promise<ImagePayload> {
  const ranked = rankImageCandidates(candidates);
  const now = options?.now ?? Date.now();
  if (!ranked.length) {
    return emptyImagePayload();
  }
  if (options?.skipNetwork) {
    const best = ranked[0];
    return {
      primary: best.url,
      sources: ranked.map((candidate) => ({ ...candidate, status: "pending" as const })),
      fallback: "drv247",
      status: "pending",
      lastValidated: null,
      sourceType: best.sourceType,
    };
  }

  const maxAttempts = options?.maxAttempts ?? MAX_VALIDATE_ATTEMPTS;
  const sources: ImageCandidate[] = [];
  let primary: ImageCandidate | null = null;
  let attempts = 0;
  for (const candidate of ranked) {
    if (attempts >= maxAttempts && primary) {
      sources.push({ ...candidate, status: "pending", lastValidated: null });
      continue;
    }
    attempts += 1;
    const check = await validateImageUrl(candidate.url, {
      fetchHeaders: options?.fetchHeaders,
      now,
    });
    const next: ImageCandidate = {
      ...candidate,
      status: check.ok ? "ok" : "failed",
      lastValidated: now,
    };
    sources.push(next);
    if (check.ok && !primary) primary = next;
  }

  return {
    primary: primary?.url ?? null,
    sources,
    fallback: "drv247",
    status: primary ? "ok" : "failed",
    lastValidated: now,
    sourceType: primary?.sourceType ?? null,
  };
}

export function emptyImagePayload(): ImagePayload {
  return {
    primary: null,
    sources: [],
    fallback: "drv247",
    status: "missing",
    lastValidated: null,
    sourceType: null,
  };
}

export function parseImagePayload(metadata: string | null | undefined): ImagePayload | null {
  if (!metadata?.trim()) return null;
  try {
    const parsed = JSON.parse(metadata) as { image?: Partial<ImagePayload> };
    const image = parsed.image;
    if (!image || typeof image !== "object") return null;
    const sources = Array.isArray(image.sources)
      ? image.sources
          .filter((row): row is ImageCandidate => Boolean(row && typeof row.url === "string"))
          .map((row) => ({
            url: row.url,
            sourceType: isImageSourceType(row.sourceType) ? row.sourceType : "article",
            status: row.status,
            lastValidated: row.lastValidated ?? null,
          }))
      : [];
    const primary = typeof image.primary === "string" && image.primary.trim() ? image.primary : null;
    return {
      primary,
      sources,
      fallback: "drv247",
      status: image.status === "ok" || image.status === "failed" || image.status === "pending" || image.status === "missing"
        ? image.status
        : primary
          ? "ok"
          : "missing",
      lastValidated: typeof image.lastValidated === "number" ? image.lastValidated : null,
      sourceType: isImageSourceType(image.sourceType) ? image.sourceType : primary ? "article" : null,
    };
  } catch {
    return null;
  }
}

export function mergeImageMetadata(
  metadata: string | null | undefined,
  image: ImagePayload,
): string {
  let parsed: Record<string, unknown> = {};
  if (metadata?.trim()) {
    try {
      const value = JSON.parse(metadata) as unknown;
      if (value && typeof value === "object" && !Array.isArray(value)) {
        parsed = value as Record<string, unknown>;
      }
    } catch {
      parsed = {};
    }
  }
  return JSON.stringify({ ...parsed, image });
}

export function displayImageUrls(
  primary: string | null | undefined,
  payload: ImagePayload | null | undefined,
): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  const push = (url: string | null | undefined) => {
    if (!url?.trim()) return;
    if (!isUsableArticleImage(url)) return;
    if (seen.has(url)) return;
    seen.add(url);
    urls.push(url);
  };
  push(primary);
  push(payload?.primary);
  for (const source of payload?.sources ?? []) {
    if (source.status === "skipped") continue;
    push(source.url);
  }
  return urls;
}

function normalizeCandidateKey(url: string): string {
  return decodeXmlEntities(url.trim());
}

function looksLikeImagePath(url: string): boolean {
  return /\.(jpe?g|png|webp|gif|avif)(\?|#|$)/i.test(url);
}

function hotlinkReason(status: number): string | null {
  if (status === 401 || status === 403) return "hotlink_or_forbidden";
  if (status === 404 || status === 410) return "missing";
  return null;
}

function fail(headers: ImageHeaders, reason: string): ImageValidation {
  return {
    ok: false,
    status: headers.status,
    contentType: headers.contentType,
    contentLength: headers.contentLength,
    finalUrl: headers.finalUrl,
    reason,
  };
}
