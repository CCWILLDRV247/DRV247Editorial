/** Next.js `<Link transitionTypes>` value for For You / category → story. */
export const STORY_OPEN_TRANSITION = "story-open";

/** Added on in-app chevron pop so the listing fade reverses. */
export const STORY_BACK_TRANSITION = "story-back";

export function storyMediaTransitionName(storyId: number) {
  return `story-media-${storyId}`;
}
