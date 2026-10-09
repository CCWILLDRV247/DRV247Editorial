import { LAST_STORY_MEDIA_KEY, STORY_BACK_TRANSITION, STORY_MEDIA_NAME } from "./story-transition";

/** Same-document view transition used by card open and chevron back. */

export function startTypedViewTransition(
  type: string,
  update: () => void | Promise<void>,
) {
  if (typeof document === "undefined" || typeof document.startViewTransition !== "function") {
    return Promise.resolve(update());
  }

  const run = () => Promise.resolve(update());

  try {
    const transition = document.startViewTransition({
      update: run,
      types: [type],
    });
    return transition.finished.catch(() => undefined);
  } catch {
    const transition = document.startViewTransition(run);
    try {
      transition.types?.add(type);
    } catch {
      // Older browsers expose startViewTransition but not types.
    }
    return transition.finished.catch(() => undefined);
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

let pendingStoryBackPath: string | null = null;

/**
 * Arm reverse motion, then the caller must history.back() *outside*
 * startViewTransition. The capture popstate starts the only VT; wrapping
 * back() inside the update is ignored in Safari.
 */
export function armStoryBackTransition(previousHref: string) {
  pendingStoryBackPath = previousHref.split("?")[0] || previousHref;
  setViewTransitionClass(document.querySelector("article"), "story-copy");
}

function onStoryBackPopState() {
  const destPath = pendingStoryBackPath;
  if (!destPath) return;
  pendingStoryBackPath = null;
  void startTypedViewTransition(STORY_BACK_TRANSITION, async () => {
    await waitForMagazinePaint(
      () =>
        window.location.pathname === destPath &&
        Boolean(document.querySelector("[data-story-media]")),
    );
    nameListingForStoryBack();
  });
}

const BACK_POP_FLAG = "__drv247StoryBackPop";

if (typeof window !== "undefined") {
  const scoped = window as Window & { [BACK_POP_FLAG]?: boolean };
  if (!scoped[BACK_POP_FLAG]) {
    scoped[BACK_POP_FLAG] = true;
    window.addEventListener("popstate", onStoryBackPopState, true);
  }
}
