import { editorialCanonicalPath } from "@/lib/seo/metadata";

export function editorialStoryPath(articleId: number): string {
  return `/story/${articleId}`;
}

/** Production editorial teaser URL. Recipients get OG from #85; never the publisher link. */
export function editorialStoryShareUrl(articleId: number): string {
  if (!Number.isInteger(articleId) || articleId <= 0) {
    throw new Error("editorialStoryShareUrl requires a positive article id");
  }
  return editorialCanonicalPath(editorialStoryPath(articleId));
}

export function editorialStorySharePayload(input: {
  articleId: number;
  title: string;
  text?: string;
}): ShareData {
  const url = editorialStoryShareUrl(input.articleId);
  const title = input.title.trim();
  const text = input.text?.trim();
  return text ? { title, text, url } : { title, url };
}

export function isPublisherUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host !== "editorial.drv247.com";
  } catch {
    return true;
  }
}

export function canUseWebShare(nav: Pick<Navigator, "share"> | undefined = globalThis.navigator): boolean {
  return typeof nav?.share === "function";
}

export async function copyText(text: string, clipboard?: Pick<Clipboard, "writeText">): Promise<boolean> {
  const api = clipboard ?? globalThis.navigator?.clipboard;
  if (api?.writeText) {
    try {
      await api.writeText(text);
      return true;
    } catch {
      // Fall through to execCommand for older WebViews.
    }
  }
  if (typeof document === "undefined") return false;
  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.left = "-9999px";
  document.body.appendChild(field);
  field.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  field.remove();
  return ok;
}

export async function shareEditorialStory(
  input: { articleId: number; title: string; text?: string },
  nav: Pick<Navigator, "share"> | undefined = globalThis.navigator,
  clipboard?: Pick<Clipboard, "writeText">,
): Promise<{ method: "web_share" | "copy"; url: string } | { method: "failed"; url: string }> {
  const payload = editorialStorySharePayload(input);
  const url = String(payload.url);
  if (canUseWebShare(nav)) {
    try {
      await nav!.share(payload);
      return { method: "web_share", url };
    } catch (error) {
      if (isAbortError(error)) return { method: "failed", url };
    }
  }
  const copied = await copyText(url, clipboard);
  return copied ? { method: "copy", url } : { method: "failed", url };
}

function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name = "name" in error ? String(error.name) : "";
  return name === "AbortError";
}
