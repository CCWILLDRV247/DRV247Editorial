/** Stable Vercel Analytics custom-event names. Do not rename without a dashboard cutover. */
export const ENGAGEMENT_EVENTS = {
  share: "story_share",
  save: "story_save",
  unsave: "story_unsave",
  feedback: "experience_feedback",
  outbound: "outbound_original_click",
} as const;

export type EngagementEventName = (typeof ENGAGEMENT_EVENTS)[keyof typeof ENGAGEMENT_EVENTS];

export type StoryShareMethod = "web_share" | "copy";

export type ExperienceFeedbackRating = "useful" | "not_for_me" | "browsing";

export type EngagementEventPayload =
  | { name: typeof ENGAGEMENT_EVENTS.share; data: { articleId: number; method: StoryShareMethod } }
  | { name: typeof ENGAGEMENT_EVENTS.save; data: { articleId: number } }
  | { name: typeof ENGAGEMENT_EVENTS.unsave; data: { articleId: number } }
  | {
      name: typeof ENGAGEMENT_EVENTS.feedback;
      data: { articleId: number; rating: ExperienceFeedbackRating };
    }
  | { name: typeof ENGAGEMENT_EVENTS.outbound; data: { articleId: number } };

export function engagementEventNames(): EngagementEventName[] {
  return Object.values(ENGAGEMENT_EVENTS);
}

export function isEngagementEventName(value: string): value is EngagementEventName {
  return (engagementEventNames() as string[]).includes(value);
}

export async function trackEngagement(event: EngagementEventPayload): Promise<void> {
  try {
    const { track } = await import("@vercel/analytics");
    track(event.name, event.data);
  } catch {
    // Analytics must never block share, save, or outbound.
  }
}
