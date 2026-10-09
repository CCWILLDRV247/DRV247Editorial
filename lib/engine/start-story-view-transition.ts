import {
  LAST_STORY_MEDIA_KEY,
  STORY_BACK_TRANSITION,
  STORY_MEDIA_NAME,
} from "./story-transition";

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

/**
 * Start the reverse morph in the click (user gesture). The caller must then
 * call history.back() *outside* this update — wrapping back() inside
 * startViewTransition is ignored and stays on the story.
 */
export function runStoryBackTransition(previousHref: string) {
  const destPath = previousHref.split("?")[0] || previousHref;
  setViewTransitionClass(document.querySelector("article"), "story-copy");
  return startTypedViewTransition(STORY_BACK_TRANSITION, async () => {
    await waitForMagazinePaint(
      () =>
        window.location.pathname === destPath &&
        Boolean(document.querySelector("[data-story-media]")),
    );
    applyLastStoryMediaName();
    setViewTransitionClass(document.querySelector("main"), "story-feed");
  });
}
