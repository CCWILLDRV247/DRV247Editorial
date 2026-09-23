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

/** Garage integration point. Porsche 911 964 → make:porsche:model:911:gen:964 */
export function canonicalEntityId(input: {
  kind: string;
  name: string;
  make?: string | null;
  model?: string | null;
  generation?: string | null;
  variant?: string | null;
}): string {
  const make = slugify(input.make || (input.kind === "make" ? input.name : "") || "unknown");
  if (input.kind === "make") return `make:${make}`;
  const model = slugify(input.model || (input.kind === "model" ? input.name : "") || "");
  if (input.kind === "model") return `make:${make}:model:${model}`;
  if (input.kind === "generation") {
    return `make:${make}:model:${model}:gen:${slugify(input.name)}`;
  }
  if (input.kind === "variant") {
    return `make:${make}:model:${model}:variant:${slugify(input.name)}`;
  }
  if (input.kind === "chassis") {
    return `make:${make}:model:${model}:chassis:${slugify(input.name)}`;
  }
  return `make:${make}`;
}
