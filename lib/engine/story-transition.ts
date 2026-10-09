/** Next.js `router.push({ transitionTypes })` value for For You / category → story. */
export const STORY_OPEN_TRANSITION = "story-open";

/** Added on in-app chevron pop so the listing fade reverses. */
export const STORY_BACK_TRANSITION = "story-back";

/** Shared CSS / React view-transition name for the active card image and teaser hero. */
export const STORY_MEDIA_NAME = "story-media";

export const LAST_STORY_MEDIA_KEY = "drv247-story-media-id";

/** Manual chevron reverse — same duration/easing as inbound story-media. */
export const STORY_BACK_MORPH_MS = 320;
export const STORY_BACK_LISTING_MS = 280;
export const STORY_BACK_MORPH_EASING = "cubic-bezier(0.25, 0.1, 0.25, 1)";
