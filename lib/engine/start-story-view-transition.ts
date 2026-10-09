import { LAST_STORY_MEDIA_KEY, STORY_MEDIA_NAME } from "./story-transition";

/** Same-document view transition used by card open. Chevron back must not call this. */

function isInvalidSnapshot(error: unknown) {
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return /InvalidStateError|invalid state|Snapshot capture failed|aborted/i.test(text);
}

function documentIsNavigating() {
  const nav = (window as Window & { navigation?: { transition?: unknown } }).navigation;
  return Boolean(nav?.transition);
}

function hasActiveViewTransition() {
  return Boolean(
    (document as Document & { activeViewTransition?: unknown }).activeViewTransition,
  );
}

export function startTypedViewTransition(
  type: string,
  update: () => void | Promise<void>,
) {
  if (typeof document === "undefined" || typeof document.startViewTransition !== "function") {
    return Promise.resolve(update());
  }
  if (hasActiveViewTransition() || documentIsNavigating()) {
    return Promise.resolve(update());
  }

  const run = () => Promise.resolve(update());

  try {
    const transition = document.startViewTransition({
      update: run,
      types: [type],
    });
    void transition.ready.catch((error) => {
      if (!isInvalidSnapshot(error)) return;
    });
    return transition.finished.catch((error) => {
      if (isInvalidSnapshot(error)) return;
    });
  } catch (error) {
    if (isInvalidSnapshot(error)) return Promise.resolve(update());
    try {
      const transition = document.startViewTransition(run);
      try {
        transition.types?.add(type);
      } catch {
        // Older browsers expose startViewTransition but not types.
      }
      void transition.ready.catch(() => undefined);
      return transition.finished.catch(() => undefined);
    } catch {
      return Promise.resolve(update());
    }
  }
}

export function waitForMagazinePaint(isReady: () => boolean, timeoutMs = 2500) {
  return new Promise<void>((resolve) => {
    if (isReady()) {
      resolve();
      return;
    }
    const finish = () => {
      observer.disconnect();
      window.clearTimeout(timer);
      resolve();
    };
    const observer = new MutationObserver(() => {
      if (isReady()) finish();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    const timer = window.setTimeout(finish, timeoutMs);
  });
}

export function applyLastStoryMediaName() {
  if (typeof document === "undefined") return;
  let id = "";
  try {
    id = sessionStorage.getItem(LAST_STORY_MEDIA_KEY) ?? "";
  } catch {
    return;
  }
  if (!id) return;
  document.querySelectorAll("[data-story-media]").forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    node.style.viewTransitionName =
      node.getAttribute("data-story-media") === id ? STORY_MEDIA_NAME : "";
  });
}

function setViewTransitionClass(node: Element | null, className: string) {
  if (!(node instanceof HTMLElement)) return;
  const style = node.style as CSSStyleDeclaration & { viewTransitionClass?: string };
  if ("viewTransitionClass" in style) style.viewTransitionClass = className;
}

/** Used by listing layout after a chevron pop so the opened card remorphs. */
export function nameListingForStoryBack() {
  applyLastStoryMediaName();
  setViewTransitionClass(document.querySelector("main"), "story-feed");
}

