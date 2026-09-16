export const MAGAZINE_NAV = [
  { slug: "racing", name: "Racing" },
  { slug: "classic", name: "Classic" },
  { slug: "modified", name: "Modified" },
  { slug: "concourse", name: "Concourse" },
  { slug: "culture", name: "Culture" },
] as const;

export const NAV_KEYWORDS: Record<string, string[]> = {
  racing: ["motorsport", "performance", "sports cars"],
  classic: ["classic", "collector", "collector cars", "restoration", "history"],
  modified: ["modified"],
  concourse: ["events", "photography", "collector", "concourse"],
  culture: ["car culture", "lifestyle", "design", "people", "interviews", "road trips", "features"],
};
