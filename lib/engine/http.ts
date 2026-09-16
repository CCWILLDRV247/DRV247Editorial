export const ENGINE_UA = "DRV247-Editorial/1.0 (+https://drv247.com)";

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
