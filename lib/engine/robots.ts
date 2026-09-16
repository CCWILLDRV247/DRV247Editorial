export type RobotsRules = {
  allow: string[];
  disallow: string[];
};

export function parseRobots(text: string, userAgent = "drv247-editorial"): RobotsRules {
  const lines = text.split(/\r?\n/);
  const groups: { agents: string[]; rules: RobotsRules }[] = [];
  let current: { agents: string[]; rules: RobotsRules } | null = null;

  for (const raw of lines) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    const [key, ...rest] = line.split(":");
    const value = rest.join(":").trim();
    const field = key.toLowerCase();
    if (field === "user-agent") {
      current = { agents: [value.toLowerCase()], rules: { allow: [], disallow: [] } };
      groups.push(current);
      continue;
    }
    if (!current) continue;
    if (field === "disallow") current.rules.disallow.push(value || "/");
    if (field === "allow") current.rules.allow.push(value);
  }

  const ua = userAgent.toLowerCase();
  const match =
    groups.find((group) => group.agents.some((agent) => agent === ua)) ??
    groups.find((group) => group.agents.includes("*"));
  return match?.rules ?? { allow: [], disallow: [] };
}

export function isPathAllowed(pathname: string, rules: RobotsRules): boolean {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const disallowHit = longestMatch(path, rules.disallow);
  const allowHit = longestMatch(path, rules.allow);
  if (allowHit > disallowHit) return true;
  if (disallowHit > 0) return false;
  return true;
}

function longestMatch(path: string, patterns: string[]): number {
  let best = 0;
  for (const pattern of patterns) {
    if (!pattern) continue;
    if (path.startsWith(pattern)) best = Math.max(best, pattern.length);
  }
  return best;
}
