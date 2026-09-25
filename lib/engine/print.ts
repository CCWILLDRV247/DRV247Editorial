import catalogFile from "@/config/print-publications.json";
import { forYouTestIsActive, type ForYouTestProfile } from "./for-you-test";

export type PrintPublicationStatus = "active" | "ceased";
export type PrintImageKind = "cover" | "logo";

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
  imageKind: PrintImageKind | null;
  marques: string[];
  interests: string[];
  sections: string[];
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

export type PrintModule = {
  heading: string;
  dek: string;
  publications: PrintPublication[];
};

export const PRINT_SECTION_LINE = catalogFile.section.line;
export const FOR_YOU_PRINT_MAX = 4;
export const SECTION_PRINT_MAX = 3;

const PORSCHE_FIRST = [
  "000-magazine",
  "christophorus",
  "gt-purely-porsche",
  "911-and-porsche-world",
];

const MODIFIED_JDM_FIRST = ["maxers", "copacetic", "brainfuel"];

const CLASSIC_FERRARI_FIRST = ["magneto", "octane", "auto-italia", "ferrari-magazine"];

/** Unfiltered category clusters — relevant titles only, never the whole catalogue. */
const UNFILTERED_SECTION: Record<string, string[]> = {
  culture: ["the-road-rat", "magneto", "000-magazine"],
  cars: ["911-and-porsche-world", "auto-italia"],
  driving: ["the-road-rat", "octane"],
  motorsport: ["christophorus", "ferrari-magazine"],
};

function asNullableUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.startsWith("https://") ? trimmed : null;
}

function asNullableAsset(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.startsWith("https://") || trimmed.startsWith("/print/")) return trimmed;
  return null;
}

function asImageKind(value: unknown): PrintImageKind | null {
  return value === "cover" || value === "logo" ? value : null;
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
    status: row.status === "ceased" ? "ceased" : "active",
    websiteUrl: asNullableUrl(row.websiteUrl),
    shopUrl: asNullableUrl(row.shopUrl),
    subscribeUrl: asNullableUrl(row.subscribeUrl),
    coverImageUrl: asNullableAsset(row.coverImageUrl),
    imageKind: asImageKind(row.imageKind),
    marques: asStringList(row.marques),
    interests: asStringList(row.interests),
    sections: asStringList(row.sections),
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

export function printEditorialCopy(profile?: ForYouTestProfile): { heading: string; dek: string } {
  const make = profile?.make ? norm(profile.make) : "";
  const interests = (profile?.interests ?? []).map(norm);
  if (make === "porsche") {
    return {
      heading: "Worth holding",
      dek: "The ones that still treat Porsche as a study.",
    };
  }
  if (interests.includes("jdm") || interests.includes("modified")) {
    return {
      heading: "Worth holding",
      dek: "Print for the driveway, not the showroom.",
    };
  }
  if (make === "ferrari" && interests.includes("classic")) {
    return {
      heading: "Worth holding",
      dek: "Ink, Maranello, and the long read.",
    };
  }
  if (interests.includes("classic")) {
    return {
      heading: "Worth holding",
      dek: "The magazines that still take paper seriously.",
    };
  }
  return {
    heading: "Worth holding",
    dek: PRINT_SECTION_LINE,
  };
}

function briefList(profile: ForYouTestProfile): string[] | null {
  const make = profile.make ? norm(profile.make) : "";
  const interests = profile.interests.map(norm);
  if (make === "porsche") return PORSCHE_FIRST;
  if (interests.includes("modified") || interests.includes("jdm")) return MODIFIED_JDM_FIRST;
  if (make === "ferrari" && interests.includes("classic")) return CLASSIC_FERRARI_FIRST;
  return null;
}

export function printModuleForYou(profile?: ForYouTestProfile): PrintModule | null {
  const publications = loadPrintPublications();
  const copy = printEditorialCopy(profile);
  if (profile && forYouTestIsActive(profile)) {
    const listed = briefList(profile);
    const recommended = listed
      ? listed
          .map((slug) => publications.find((row) => row.slug === slug))
          .filter((row): row is PrintPublication => Boolean(row))
      : orderPrintCatalogue(publications, profile)
          .filter((row) => printPersonalisationScore(row, profile) > 0)
          .slice(0, FOR_YOU_PRINT_MAX);
    if (recommended.length === 0) return null;
    return { ...copy, publications: recommended };
  }
  const featured = publications.filter((row) => row.featured).slice(0, 5);
  if (featured.length === 0) return null;
  return { heading: "Worth holding", dek: PRINT_SECTION_LINE, publications: featured };
}

export function printModuleForSection(
  slug: string,
  profile?: ForYouTestProfile,
): PrintModule | null {
  const publications = loadPrintPublications().filter((row) => row.sections.includes(slug));
  if (publications.length === 0) return null;
  const copy = printEditorialCopy(profile);
  if (profile && forYouTestIsActive(profile)) {
    const matched = orderPrintCatalogue(publications, profile)
      .filter((row) => printPersonalisationScore(row, profile) > 0)
      .slice(0, SECTION_PRINT_MAX);
    if (matched.length === 0) return null;
    return { ...copy, publications: matched };
  }
  const allowed = UNFILTERED_SECTION[slug] ?? [];
  const cluster = allowed
    .map((item) => publications.find((row) => row.slug === item))
    .filter((row): row is PrintPublication => Boolean(row))
    .slice(0, SECTION_PRINT_MAX);
  if (cluster.length === 0) return null;
  return { heading: "Worth holding", dek: PRINT_SECTION_LINE, publications: cluster };
}

function rankedBoost(slug: string, order: string[]) {
  const index = order.indexOf(slug);
  return index === -1 ? null : index;
}

function norm(value: string) {
  return value.toLowerCase().trim();
}
