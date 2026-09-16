export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/&amp;/g, "and")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function duplicateKey(publication: string, title: string): string {
  return `${normalizeTitle(publication)}::${normalizeTitle(title)}`;
}

export function sameStoryKey(title: string): string {
  return normalizeTitle(title);
}

export function publisherScore(relevance: string): number {
  const head = relevance.toLowerCase();
  if (head.startsWith("excellent")) return 20;
  if (head.startsWith("good")) return 12;
  if (head.startsWith("medium")) return 6;
  return 4;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
