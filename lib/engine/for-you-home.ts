import { sameStoryKey } from "./normalize";
import {
  canonicalInterest,
  contextFromTestProfile,
  cultureBridgeTags,
  garageVehicleLabel,
  interestsMatch,
} from "./personalize";
import type { EditorialDto } from "./queries";
import type { ForYouTestProfile } from "./for-you-test";
import { forYouTestIsActive } from "./for-you-test";
import type { VehicleTier } from "./rank";

const DIRECT_TIERS = new Set<VehicleTier>(["variant", "vehicle", "model", "generation"]);

export type ForYouCandidate = Pick<
  EditorialDto,
  | "id"
  | "title"
  | "publication"
  | "makes"
  | "models"
  | "interests"
  | "categories"
  | "why"
  | "vehicleTier"
  | "duplicateGroupId"
  | "rankScore"
  | "imageUrl"
  | "showInPrimaryFeed"
  | "qualityBand"
>;

export type ForYouCopy = {
  headerTitle: string;
  kicker: string;
  dek: string;
  blurb: string;
  interstitial: string;
};

export type ForYouLane = {
  heading: string;
  dek?: string;
  empty?: string;
  stories: ForYouCandidate[];
};

export type ForYouHomePlan = {
  copy: ForYouCopy;
  vehicleKnown: boolean;
  interestsKnown: boolean;
  forYourCar: ForYouLane;
  yourInterests: ForYouLane;
  discover: ForYouLane;
};

export function forYouVehicleName(profile?: ForYouTestProfile) {
  if (!profile) return "";
  return [profile.make, profile.model].map((part) => part?.trim()).filter(Boolean).join(" ");
}

export function forYouVehicleSpec(profile?: ForYouTestProfile) {
  if (!profile) return "";
  const fromGarage = contextFromTestProfile(profile).vehicles[0];
  if (fromGarage) return garageVehicleLabel(fromGarage);
  return forYouVehicleName(profile);
}

export function forYouInterestLabel(profile?: ForYouTestProfile) {
  if (!profile?.interests.length) return "";
  return profile.interests.map(canonicalInterest).join(" · ");
}

export function forYouCopy(profile?: ForYouTestProfile): ForYouCopy {
  const active = profile && forYouTestIsActive(profile);
  const car = forYouVehicleName(profile);
  const spec = forYouVehicleSpec(profile);
  const interests = forYouInterestLabel(profile);
  if (car) {
    return {
      headerTitle: `For your ${car}`,
      kicker: `FOR YOUR ${car.toUpperCase()}`,
      dek: interests ? `${spec} · ${interests}` : spec,
      blurb: "Stories selected around your cars and interests.",
      interstitial: "THE TRUTH SHALL SET YOU FREE",
    };
  }
  if (active && profile?.interests.length) {
    return {
      headerTitle: "For You",
      kicker: "FOR YOU",
      dek: interests,
      blurb: "Stories selected around your interests. Add a car and the desk organises around it.",
      interstitial: "THE TRUTH SHALL SET YOU FREE",
    };
  }
  return {
    headerTitle: "For You",
    kicker: "FOR YOU",
    dek: "Tell us what you drive to make DRV247 yours.",
    blurb: "Your personalised front door to the car world.",
    interstitial: "THE TRUTH SHALL SET YOU FREE",
  };
}

function subjectKey(article: Pick<ForYouCandidate, "title" | "duplicateGroupId">) {
  return article.duplicateGroupId || sameStoryKey(article.title);
}

function makeOf(article: Pick<ForYouCandidate, "makes">) {
  return (article.makes[0] ?? "").toLowerCase();
}

function matchesInterest(article: Pick<ForYouCandidate, "interests" | "why">, profile?: ForYouTestProfile) {
  if (!profile?.interests.length) return false;
  if (article.why.some((reason) => /follow/i.test(reason))) return true;
  return profile.interests.some((interest) =>
    article.interests.some((item) => interestsMatch(item, canonicalInterest(interest))),
  );
}

function primaryInterestIndex(
  article: Pick<ForYouCandidate, "interests" | "why">,
  profile?: ForYouTestProfile,
) {
  if (!profile?.interests.length) return Number.POSITIVE_INFINITY;
  for (let index = 0; index < profile.interests.length; index += 1) {
    const interest = canonicalInterest(profile.interests[index]!);
    if (article.why.some((reason) => reason.toLowerCase().includes(interest.toLowerCase()))) return index;
    if (article.interests.some((item) => interestsMatch(item, interest))) return index;
  }
  return Number.POSITIVE_INFINITY;
}

function sortByProfileInterests<T extends ForYouCandidate>(pool: T[], profile?: ForYouTestProfile) {
  return [...pool].sort((left, right) => {
    const leftIndex = primaryInterestIndex(left, profile);
    const rightIndex = primaryInterestIndex(right, profile);
    if (leftIndex !== rightIndex) return leftIndex - rightIndex;
    return right.rankScore - left.rankScore;
  });
}

function matchesUserCar(article: Pick<ForYouCandidate, "makes" | "models">, profile?: ForYouTestProfile) {
  const make = (profile?.make ?? "").toLowerCase();
  const model = (profile?.model ?? "").toLowerCase();
  if (make && article.makes.some((item) => item.toLowerCase() === make)) return true;
  if (model && article.models.some((item) => item.toLowerCase() === model)) return true;
  return false;
}

function matchesCulture(
  article: Pick<ForYouCandidate, "interests" | "categories">,
  profile?: ForYouTestProfile,
) {
  const vehicle = profile ? contextFromTestProfile(profile).vehicles[0] : undefined;
  if (!vehicle) return false;
  const bridge = cultureBridgeTags(
    vehicle,
    [...article.interests, ...article.categories],
    profile?.interests ?? [],
  );
  return bridge.length > 0;
}

function consecutiveMakeRun<T extends Pick<ForYouCandidate, "makes">>(picked: T[], make: string) {
  if (!make || picked.length < 2) return false;
  return makeOf(picked[picked.length - 1]!) === make && makeOf(picked[picked.length - 2]!) === make;
}

export function takeDiverse<T extends Pick<ForYouCandidate, "id" | "title" | "makes" | "duplicateGroupId">>(
  pool: T[],
  n: number,
  used: Set<number>,
  usedSubjects: Set<string>,
  opts?: { avoidMake?: string },
): T[] {
  const picked: T[] = [];

  const tryTake = (strict: boolean) => {
    for (const article of pool) {
      if (picked.length >= n) return;
      if (used.has(article.id)) continue;
      const subject = subjectKey(article);
      if (subject && usedSubjects.has(subject)) continue;
      const make = makeOf(article);
      if (strict && opts?.avoidMake && make === opts.avoidMake.toLowerCase()) continue;
      if (strict && consecutiveMakeRun(picked, make)) continue;
      picked.push(article);
      used.add(article.id);
      if (subject) usedSubjects.add(subject);
    }
  };

  tryTake(true);
  if (picked.length < n) tryTake(false);
  return picked;
}

export function curateForYouHome(
  ranked: ForYouCandidate[],
  profile?: ForYouTestProfile,
  reserveIds: ReadonlySet<number> = new Set(),
): ForYouHomePlan {
  const copy = forYouCopy(profile);
  const vehicleKnown = Boolean(profile?.make || profile?.model);
  const interestsKnown = Boolean(profile?.interests.length);
  const spec = forYouVehicleSpec(profile);
  const used = new Set<number>(reserveIds);
  const usedSubjects = new Set<string>();
  const available = ranked.filter((article) => !reserveIds.has(article.id));
  const primaryPool = available.filter((article) => article.showInPrimaryFeed !== false);
  const discoverPool = available;

  const direct = primaryPool.filter(
    (article) => DIRECT_TIERS.has(article.vehicleTier) && matchesUserCar(article, profile),
  );
  const marque = primaryPool.filter((article) => article.vehicleTier === "make" && matchesUserCar(article, profile));
  const culture = primaryPool.filter(
    (article) => article.vehicleTier === "category" || matchesCulture(article, profile),
  );
  const interestHits = sortByProfileInterests(
    primaryPool.filter((article) => matchesInterest(article, profile)),
    profile,
  );

  let forYourCarStories: ForYouCandidate[] = [];
  let forYourCarEmpty: string | undefined;
  if (vehicleKnown) {
    const primary = takeDiverse([...direct, ...marque], 6, used, usedSubjects);
    const filler = takeDiverse([...culture, ...interestHits], 3, used, usedSubjects, {
      avoidMake: profile?.make,
    });
    const mixed: ForYouCandidate[] = [];
    let p = 0;
    let f = 0;
    while (mixed.length < 6 && (p < primary.length || f < filler.length)) {
      const make = p < primary.length ? makeOf(primary[p]!) : "";
      if (consecutiveMakeRun(mixed, make) && f < filler.length) {
        mixed.push(filler[f]!);
        f += 1;
        continue;
      }
      if (p < primary.length) {
        mixed.push(primary[p]!);
        p += 1;
      } else {
        mixed.push(filler[f]!);
        f += 1;
      }
    }
    forYourCarStories = mixed.slice(0, 6);
    if (forYourCarStories.length === 0) {
      forYourCarEmpty = spec
        ? `Nothing on the desk for your ${spec} yet — the wider mix is below.`
        : "Nothing on the desk for your car yet — the wider mix is below.";
    } else if (forYourCarStories.length < 3) {
      forYourCarEmpty = spec
        ? `A short desk for your ${spec}. More of the car world sits below.`
        : "A short desk for your car. More of the car world sits below.";
    }
  }

  const yourInterestsStories = interestsKnown
    ? takeDiverse(interestHits, 6, used, usedSubjects, { avoidMake: profile?.make })
    : [];
  const discoverStories = takeDiverse(
    discoverPool.filter((article) => {
      if (!vehicleKnown) return true;
      if (article.showInPrimaryFeed === false) return true;
      return makeOf(article) !== (profile?.make ?? "").toLowerCase() || article.vehicleTier === "none";
    }),
    6,
    used,
    usedSubjects,
    { avoidMake: profile?.make },
  );
  const interestLabel = forYouInterestLabel(profile);

  return {
    copy,
    vehicleKnown,
    interestsKnown,
    forYourCar: {
      heading: vehicleKnown ? `For your ${forYouVehicleName(profile)}` : "For You",
      dek: vehicleKnown ? "Stories selected around your cars and interests" : undefined,
      empty: forYourCarEmpty,
      stories: forYourCarStories,
    },
    yourInterests: {
      heading: interestLabel || "Your interests",
      dek: interestsKnown ? "Selected around what you follow" : undefined,
      empty:
        interestsKnown && yourInterestsStories.length === 0
          ? "No interest matches on the desk yet — Discover still runs."
          : undefined,
      stories: yourInterestsStories,
    },
    discover: {
      heading: "Discover",
      dek: vehicleKnown
        ? interestLabel
          ? `Wider stories beyond ${forYouVehicleName(profile)}`
          : "The rest of the car world"
        : "The desk, unfiltered",
      stories: discoverStories,
    },
  };
}
