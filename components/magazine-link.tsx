"use client";

import {
  createContext,
  useContext,
  type AnchorHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";
import { magazineHref, shouldUseHistoryBack } from "@/lib/engine/magazine-history";

const MagazineQueryContext = createContext<string | undefined>(undefined);

export function MagazineQueryProvider({
  testQuery,
  children,
}: {
  testQuery?: string;
  children: ReactNode;
}) {
  return (
    <MagazineQueryContext.Provider value={testQuery}>{children}</MagazineQueryContext.Provider>
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
    if (!shouldUseHistoryBack(document.referrer, window.location.origin)) return;
    event.preventDefault();
    window.history.back();
  }

  return (
    <a href={fallback} aria-label="Back" className={className} onClick={onClick}>
      {children}
    </a>
  );
}
