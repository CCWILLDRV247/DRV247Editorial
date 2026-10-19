import { HOMEPAGE_LEAD_CARD_MAX } from "./homepage-hierarchy";
import type { StoryDto } from "@/lib/stories";

export type HomeLeadSelection = {
  hero: StoryDto | null;
  leadCards: StoryDto[];
  vehicleStories: StoryDto[];
  openerIds: number[];
};

/** Same hero/lead rules the homepage UI uses — keep rails on this opener set. */
export function selectHomeLead(
  forYourCar: { stories: StoryDto[] },
  yourInterests: { stories: StoryDto[] },
  picks: StoryDto[],
  carouselOpeners: number[] = [],
): HomeLeadSelection {
  const pickIds = new Set(picks.map((story) => story.id));
  const vehicleStories = forYourCar.stories.filter((story) => !pickIds.has(story.id));
  const hero =
    vehicleStories[0] ??
    yourInterests.stories.find((story) => !pickIds.has(story.id)) ??
    null;
  const leadCards = vehicleStories.slice(1, 1 + HOMEPAGE_LEAD_CARD_MAX);
  const openerIds = [
    ...(hero ? [hero.id] : []),
    ...leadCards.map((story) => story.id),
    ...carouselOpeners,
  ];
  return { hero, leadCards, vehicleStories, openerIds };
}
