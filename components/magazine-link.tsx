"use client";

import {
  createContext,
  useContext,
  useEffect,
  type AnchorHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";
import {
  MAGAZINE_HISTORY_KEY,
  isMagazinePath,
  magazineHref,
  magazineLocation,
  popMagazineVisit,
  previousMagazineHref,
  readMagazineHistory,
  recordMagazineVisit,
  shouldPopMagazineHistory,
  writeMagazineHistory,
} from "@/lib/engine/magazine-history";

const MagazineQueryContext = createContext<string | undefined>(undefined);

function loadStack() {
  try {
    return readMagazineHistory(window.sessionStorage.getItem(MAGAZINE_HISTORY_KEY));
  } catch {
    return [];
  }
}

function saveStack(stack: string[]) {
  try {
    window.sessionStorage.setItem(MAGAZINE_HISTORY_KEY, writeMagazineHistory(stack));
  } catch {
    // Private mode can throw; chevron then uses the For You fallback.
  }
}

function MagazineHistorySync() {
  useEffect(() => {
    const href = magazineLocation(window.location.pathname, window.location.search);
    if (!isMagazinePath(window.location.pathname)) return;
    saveStack(recordMagazineVisit(loadStack(), href));
  }, []);
  return null;
}

export function MagazineQueryProvider({
  testQuery,
  children,
}: {
  testQuery?: string;
  children: ReactNode;
}) {
  return (
    <MagazineQueryContext.Provider value={testQuery}>
      <MagazineHistorySync />
      {children}
    </MagazineQueryContext.Provider>
  );
}

export function useMagazineQuery() {
  return useContext(MagazineQueryContext);
}

type MagazineLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  query?: string;
};

/**
 * Native <a> so the browser pushes a real history entry.
 * Next.js <Link> soft-nav has dropped the garage query and replaced the
 * current entry (Back then leaves the magazine).
 */
export function MagazineLink({ href, query, ...props }: MagazineLinkProps) {
  const ctx = useMagazineQuery();
  return <a {...props} href={magazineHref(href, query ?? ctx)} />;
}

export function MagazineBack({
  href,
  query,
  className,
  children,
}: {
  href: string;
  query?: string;
  className?: string;
  children: ReactNode;
}) {
  const ctx = useMagazineQuery();
  const fallback = magazineHref(href, query ?? ctx);

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const current = magazineLocation(window.location.pathname, window.location.search);
    const stack = loadStack();
    const previous = previousMagazineHref(stack, current);
    if (!shouldPopMagazineHistory(previous)) return;
    event.preventDefault();
    saveStack(popMagazineVisit(stack, current));
    window.history.back();
  }

  return (
    <a href={fallback} aria-label="Back" className={className} onClick={onClick}>
      {children}
    </a>
  );
}
