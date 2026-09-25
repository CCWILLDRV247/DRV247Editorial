import catalogFile from "@/config/intelligence/print-publications.json";
import {
  FOR_YOU_DEMO_PROFILES,
  forYouTestIsActive,
  type ForYouTestProfile,
} from "@/lib/engine/for-you-test";
import { GARAGE_VEHICLES } from "@/lib/intelligence/ui-catalog";

export type PrintPublicationStatus = "active" | "ceased";

export type PrintPublication = {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  publisher: string | null;
  country: string | null;
  language: string;
  frequency: string | null;
  format: string[];
  status: PrintPublicationStatus;
  websiteUrl: string | null;
  shopUrl: string | null;
  subscribeUrl: string | null;
  coverImageUrl: string | null;
  marques: string[];
  interests: string[];
  featured: boolean;
  issues?: unknown[];
  rssUrl?: string | null;
  affiliateUrl?: string | null;
};

export type PrintCta = {
  kind: "buy" | "subscribe" | "site";
  label: string;
  href: string;
};

export type PrintFocus = "porsche" | "ferrari" | "classic" | "modified" | "jdm";

export type PrintShelf = {
  featured: PrintPublication[];
  recommended: PrintPublication[];
  explore: PrintPublication[];
  filters: { id: PrintFocus; label: string }[];
  activeFocus: PrintFocus | null;
};

export const PRINT_SECTION_LINE = catalogFile.section.line;

export const PRINT_FILTERS: { id: PrintFocus; label: string }[] = [
  { id: "porsche", label: "Porsche" },
  { id: "ferrari", label: "Ferrari" },
  { id: "classic", label: "Classic" },
  { id: "modified", label: "Modified" },
  { id: "jdm", label: "JDM" },
];

const PORSCHE_FIRST = [
  "000-magazine",
  "christophorus",
  "gt-purely-porsche",
  "911-and-porsche-world",
];

const MODIFIED_JDM_FIRST = ["maxers", "copacetic", "brainfuel"];

const CLASSIC_FERRARI_FIRST = ["magneto", "octane", "auto-italia", "ferrari-magazine"];

function asNullableUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.startsWith("https://") ? trimmed : null;
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export function parsePrintPublication(raw: unknown): PrintPublication | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.slug !== "string" || typeof row.title !== "string") {
    return null;
  }
  const status = row.status === "ceased" ? "ceased" : "active";
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    tagline: typeof row.tagline === "string" ? row.tagline : "",
    description: typeof row.description === "string" ? row.description : "",
    publisher: typeof row.publisher === "string" ? row.publisher : null,
    country: typeof row.country === "string" ? row.country : null,
    language: typeof row.language === "string" ? row.language : "English",
    frequency: typeof row.frequency === "string" ? row.frequency : null,
    format: asStringList(row.format),
    status,
    websiteUrl: asNullableUrl(row.websiteUrl),
    shopUrl: asNullableUrl(row.shopUrl),
    subscribeUrl: asNullableUrl(row.subscribeUrl),
    coverImageUrl: asNullableUrl(row.coverImageUrl),
    marques: asStringList(row.marques),
    interests: asStringList(row.interests),
    featured: row.featured === true,
  };
}

export function loadPrintPublications(): PrintPublication[] {
  return catalogFile.publications
    .map((row) => parsePrintPublication(row))
    .filter((row): row is PrintPublication => Boolean(row));
}

export function getPrintPublication(slug: string): PrintPublication | null {
  return loadPrintPublications().find((row) => row.slug === slug) ?? null;
}

export function printCtas(publication: PrintPublication): PrintCta[] {
  const ctas: PrintCta[] = [];
  if (publication.shopUrl) ctas.push({ kind: "buy", label: "Buy issue", href: publication.shopUrl });
  if (publication.subscribeUrl) {
    ctas.push({ kind: "subscribe", label: "Subscribe", href: publication.subscribeUrl });
  }
  if (publication.websiteUrl) {
    ctas.push({ kind: "site", label: "Official site", href: publication.websiteUrl });
  }
  return ctas;
}

export function isPrintFocus(value: string | undefined): value is PrintFocus {
  return PRINT_FILTERS.some((filter) => filter.id === value);
}

export function publicationMatchesFocus(publication: PrintPublication, focus: PrintFocus | null) {
  if (!focus) return true;
  if (focus === "porsche") return publication.marques.some((marque) => norm(marque) === "porsche");
  if (focus === "ferrari") return publication.marques.some((marque) => norm(marque) === "ferrari");
  if (focus === "classic") return publication.interests.some((interest) => norm(interest) === "classic");
  if (focus === "modified") return publication.interests.some((interest) => norm(interest) === "modified");
  return publication.interests.some((interest) => norm(interest) === "jdm");
}

export function garageVehicleToProfile(vehicleId: string | undefined): ForYouTestProfile | null {
  const vehicle = GARAGE_VEHICLES.find((row) => row.id === vehicleId);
  if (!vehicle) return null;
  const interests =
    vehicle.id === "veh-e46" ? ["Modified", "Performance"] : vehicle.id === "veh-355" ? ["Classic", "Performance"] : ["Air-cooled", "Classic"];
  return {
    make: vehicle.make,
    model: vehicle.model,
    generation: vehicle.generation,
    variant: vehicle.variant ?? undefined,
    interests,
  };
}

export function resolvePrintProfile(
  profile: ForYouTestProfile,
  vehicleId?: string,
): ForYouTestProfile {
  if (forYouTestIsActive(profile)) return profile;
  return garageVehicleToProfile(vehicleId) ?? profile;
}

export function printPersonalisationScore(publication: PrintPublication, profile: ForYouTestProfile): number {
  if (!forYouTestIsActive(profile)) return 0;
  let score = 0;
  const make = profile.make ? norm(profile.make) : "";
  const interests = profile.interests.map(norm);

  if (make && publication.marques.some((marque) => norm(marque) === make)) score += 40;

  const porscheBoost = rankedBoost(publication.slug, PORSCHE_FIRST);
  if (make === "porsche" && porscheBoost != null) score += 80 - porscheBoost * 4;

  const modified = interests.includes("modified") || interests.includes("jdm");
  const jdmBoost = rankedBoost(publication.slug, MODIFIED_JDM_FIRST);
  if (modified && jdmBoost != null) score += 70 - jdmBoost * 4;

  const ferrariClassic = make === "ferrari" && interests.includes("classic");
  const ferrariBoost = rankedBoost(publication.slug, CLASSIC_FERRARI_FIRST);
  if (ferrariClassic && ferrariBoost != null) score += 80 - ferrariBoost * 4;

  for (const interest of profile.interests) {
    if (publication.interests.some((item) => norm(item) === norm(interest))) score += 12;
  }

  return score;
}

function briefRank(publication: PrintPublication, profile: ForYouTestProfile): number | null {
  if (!forYouTestIsActive(profile)) return null;
  const make = profile.make ? norm(profile.make) : "";
  const interests = profile.interests.map(norm);
  if (make === "porsche") return rankedBoost(publication.slug, PORSCHE_FIRST);
  if (interests.includes("modified") || interests.includes("jdm")) {
    return rankedBoost(publication.slug, MODIFIED_JDM_FIRST);
  }
  if (make === "ferrari" && interests.includes("classic")) {
    return rankedBoost(publication.slug, CLASSIC_FERRARI_FIRST);
  }
  return null;
}

export function orderPrintCatalogue(
  publications: PrintPublication[],
  profile: ForYouTestProfile,
): PrintPublication[] {
  return [...publications].sort((left, right) => {
    const leftRank = briefRank(left, profile);
    const rightRank = briefRank(right, profile);
    if (leftRank != null || rightRank != null) {
      if (leftRank == null) return 1;
      if (rightRank == null) return -1;
      if (leftRank !== rightRank) return leftRank - rightRank;
    }
    const scoreDelta = printPersonalisationScore(right, profile) - printPersonalisationScore(left, profile);
    if (scoreDelta !== 0) return scoreDelta;
    return publications.indexOf(left) - publications.indexOf(right);
  });
}

export function buildPrintShelf(
  profile: ForYouTestProfile,
  focus: PrintFocus | null = null,
  publications = loadPrintPublications(),
): PrintShelf {
  const featured = publications.filter((row) => row.featured);
  const ordered = orderPrintCatalogue(publications, profile);
  const recommended = forYouTestIsActive(profile)
    ? ordered.filter((row) => printPersonalisationScore(row, profile) > 0 && publicationMatchesFocus(row, focus))
    : [];
  const explore = ordered.filter((row) => publicationMatchesFocus(row, focus));
  return {
    featured,
    recommended,
    explore,
    filters: PRINT_FILTERS,
    activeFocus: focus,
  };
}

export function printDemoProfile(id: "A" | "B" | "C" | "D"): ForYouTestProfile {
  return { ...FOR_YOU_DEMO_PROFILES[id] };
}

function rankedBoost(slug: string, order: string[]) {
  const index = order.indexOf(slug);
  return index === -1 ? null : index;
}

function norm(value: string) {
  return value.toLowerCase().trim();
}
