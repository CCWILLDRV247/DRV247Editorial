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
