import { magazineLocation } from "./magazine-history";

export const MAGAZINE_RAIL_KEY = "drv247-magazine-rails";
export const MAGAZINE_RAIL_ATTR = "data-magazine-rail";

export type MagazineRailSnapshot = {
  href: string;
  y: number;
  rails: Record<string, number>;
};

export function readMagazineRails(raw: string | null): MagazineRailSnapshot | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const row = parsed as Partial<MagazineRailSnapshot>;
    if (typeof row.href !== "string" || !row.href) return null;
    const rails =
      row.rails && typeof row.rails === "object" && !Array.isArray(row.rails)
        ? Object.fromEntries(
            Object.entries(row.rails).flatMap(([id, left]) =>
              typeof left === "number" && Number.isFinite(left) ? [[id, left]] : [],
            ),
          )
        : {};
    return {
      href: row.href,
      y: typeof row.y === "number" && Number.isFinite(row.y) ? row.y : 0,
      rails,
    };
  } catch {
    return null;
  }
}

export function writeMagazineRails(snapshot: MagazineRailSnapshot) {
  return JSON.stringify(snapshot);
}

export function railsMatchPage(snapshot: MagazineRailSnapshot, href: string) {
  return snapshot.href === href;
}

export function captureMagazineRails() {
  if (typeof document === "undefined") return;
  const rails: Record<string, number> = {};
  document.querySelectorAll(`[${MAGAZINE_RAIL_ATTR}]`).forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    const id = node.getAttribute(MAGAZINE_RAIL_ATTR);
    if (!id) return;
    rails[id] = Math.round(node.scrollLeft);
  });
  const snapshot: MagazineRailSnapshot = {
    href: magazineLocation(window.location.pathname, window.location.search),
    y: Math.round(window.scrollY),
    rails,
  };
  try {
    window.sessionStorage.setItem(MAGAZINE_RAIL_KEY, writeMagazineRails(snapshot));
  } catch {
    // Private mode can throw; reverse then measures the card at 0.
  }
}

/** Apply saved rail + page scroll before the reverse morph measures the card. */
export function restoreMagazineRails() {
  if (typeof document === "undefined") return;
  let snapshot: MagazineRailSnapshot | null = null;
  try {
    snapshot = readMagazineRails(window.sessionStorage.getItem(MAGAZINE_RAIL_KEY));
  } catch {
    return;
  }
  if (!snapshot) return;
  const here = magazineLocation(window.location.pathname, window.location.search);
  if (!railsMatchPage(snapshot, here)) return;
  window.scrollTo(0, snapshot.y);
  for (const [id, left] of Object.entries(snapshot.rails)) {
    const node = document.querySelector(`[${MAGAZINE_RAIL_ATTR}="${id}"]`);
    if (node instanceof HTMLElement) node.scrollLeft = left;
  }
}
