export function isVideoStory(story: {
  source: { type: string };
  canonicalUrl: string;
}) {
  return story.source.type === "youtube" || /youtube\.com\/watch\?v=/i.test(story.canonicalUrl);
}
