/** Autocar 202s and Top Gear 403s a custom crawler token; keep a browser UA. */
export const ENGINE_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

export async function fetchText(
  url: string,
  options?: { timeoutMs?: number; accept?: string },
): Promise<{ ok: boolean; status: number; text: string; contentType: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options?.timeoutMs ?? 12_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": ENGINE_UA,
        Accept: options?.accept ?? "text/html, application/xml, application/rss+xml, */*",
      },
      redirect: "follow",
    });
    const text = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      text,
      contentType: response.headers.get("content-type") ?? "",
    };
  } catch {
    return { ok: false, status: 0, text: "", contentType: "" };
  } finally {
    clearTimeout(timer);
  }
}

export type ImageHeaders = {
  ok: boolean;
  status: number;
  contentType: string;
  contentLength: number | null;
  finalUrl: string;
};

/** HEAD first, then a tiny ranged GET. Never download and store the image. */
export async function fetchImageHeaders(
  url: string,
  options?: { timeoutMs?: number },
): Promise<ImageHeaders> {
  const timeoutMs = options?.timeoutMs ?? 4_000;
  const head = await imageRequest(url, { method: "HEAD", timeoutMs });
  if (head.status === 405 || head.status === 501 || head.status === 403 || head.status === 0) {
    const ranged = await imageRequest(url, {
      method: "GET",
      timeoutMs,
      headers: { Range: "bytes=0-2047" },
    });
    if (ranged.status !== 0) return ranged;
  }
  return head;
}

async function imageRequest(
  url: string,
  options: { method: "HEAD" | "GET"; timeoutMs: number; headers?: Record<string, string> },
): Promise<ImageHeaders> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const response = await fetch(url, {
      method: options.method,
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": ENGINE_UA,
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        ...options.headers,
      },
    });
    await response.body?.cancel().catch(() => undefined);
    const lengthHeader = response.headers.get("content-length");
    const contentLength = lengthHeader ? Number(lengthHeader) : null;
    return {
      ok: response.ok,
      status: response.status,
      contentType: response.headers.get("content-type") ?? "",
      contentLength: Number.isFinite(contentLength) ? contentLength : null,
      finalUrl: response.url || url,
    };
  } catch {
    return { ok: false, status: 0, contentType: "", contentLength: null, finalUrl: url };
  } finally {
    clearTimeout(timer);
  }
}

export function looksLikeFeed(xml: string, contentType = ""): boolean {
  const head = xml.slice(0, 800).toLowerCase();
  const type = contentType.toLowerCase();
  if (type.includes("json") && !type.includes("xml") && !type.includes("rss") && !type.includes("atom")) {
    return false;
  }
  return (
    head.includes("<rss") ||
    head.includes("<feed") ||
    head.includes("<rdf:rdf") ||
    (type.includes("rss") && head.includes("<channel")) ||
    (type.includes("atom") && head.includes("<feed"))
  );
}
