/** Query keys used by For You test filters (see `parseForYouTestProfile`). */
export const PERSONALIZATION_QUERY_KEYS = [
  "profile",
  "preset",
  "make",
  "model",
  "generation",
  "variant",
  "interest",
  "interests",
  "location",
] as const;

function paramHasValue(value: string | string[] | undefined): boolean {
  if (value === undefined) return false;
  if (Array.isArray(value)) return value.some((item) => item.trim().length > 0);
  return value.trim().length > 0;
}

/** True when the URL carries filter/personalization query params (localStorage-only filters do not count). */
export function searchParamsHavePersonalizationFilters(
  params: Record<string, string | string[] | undefined>,
): boolean {
  return PERSONALIZATION_QUERY_KEYS.some((key) => paramHasValue(params[key]));
}

export function robotsForPersonalizedView(
  params: Record<string, string | string[] | undefined>,
): { index: false; follow: true } | undefined {
  if (!searchParamsHavePersonalizationFilters(params)) return undefined;
  return { index: false, follow: true };
}
