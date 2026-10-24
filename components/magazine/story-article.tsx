import { notFound } from "next/navigation";
import { OutboundStoryLink } from "@/components/engagement/outbound-story-link";
import { StoryActions } from "@/components/engagement/story-actions";
import { StoryOpenSignal } from "@/components/engagement/story-open-signal";
import { communityLabelForArticle } from "@/lib/engagement/aggregates";
import { MagazineLink } from "@/components/magazine-link";
import { StoryCopyTransition } from "@/components/story-copy-transition";
import { StoryImage } from "@/components/story-image";
import { StoryHeroMedia } from "@/components/story-media-transition";
import { withTestQuery } from "@/lib/engine/for-you-test";
import { getMagazineStory } from "@/lib/engine/magazine";
import { isVideoStory } from "@/lib/engine/video-story";
import { MAGAZINE_LAYOUT } from "@/lib/engine/editorial-composition";
import {
  STORY_BACK_CHROME,
  STORY_BACK_CHROME_BORDER,
  STORY_TEASER,
  storyTeaserExcerpt,
} from "@/lib/engine/story-teaser";
import { formatStoryDate } from "@/lib/format";

export async function StoryArticle({
  id,
  testQuery,
}: {
  id: number;
  testQuery?: string;
}) {
  const story = await getMagazineStory(id);
  if (!story) notFound();
  const communityLabel = await communityLabelForArticle(story.id);
  const excerpt = storyTeaserExcerpt({
    title: story.title,
    summary: story.summary,
    aiSummary: story.aiSummary,
  });
  const published = formatStoryDate(story.publishedAt);
  const meta = [story.source.name, published, story.desk?.labelName, story.category.name]
    .filter(Boolean)
    .join(" · ");
  const categoryHref = withTestQuery(`/category/${story.category.slug}`, testQuery);

  return (
    <article className={`${MAGAZINE_LAYOUT.reading} pb-20`}>
      <StoryHeroMedia>
        <div className={MAGAZINE_LAYOUT.storyHeroMedia}>
          <StoryImage
            src={story.imageUrl}
            sources={story.imageSources}
            category={story.category.name}
            alt=""
            priority
            video={isVideoStory(story)}
          />
        </div>
      </StoryHeroMedia>
      <StoryCopyTransition>
        <div className={STORY_TEASER.copy}>
          <StoryOpenSignal articleId={story.id} />
          {communityLabel ? <p className={STORY_TEASER.community}>{communityLabel}</p> : null}
          <p className={STORY_TEASER.meta}>{meta}</p>
          <h1 className={STORY_TEASER.headline}>{story.title}</h1>
          {excerpt ? <p className={STORY_TEASER.excerpt}>{excerpt}</p> : null}
          {story.desk?.note ? <p className={STORY_TEASER.deskNote}>{story.desk.note}</p> : null}
          <StoryActions
            articleId={story.id}
            title={story.title}
            text={excerpt ?? undefined}
          />
          <OutboundStoryLink href={story.canonicalUrl} articleId={story.id}>
            {isVideoStory(story) ? `Watch on ${story.source.name}` : `Read on ${story.source.name}`}
          </OutboundStoryLink>
          <p className="mt-4 text-[14px] leading-5 text-[#1b1d1f]/70">
            DRV247 is an aggregator. We store a headline, a short feed excerpt, a short extract from
            the original, and the outbound link — never the full third-party article or the video
            file.
          </p>
          <MagazineLink
            href={categoryHref}
            className={`mt-6 flex h-11 w-full items-center justify-center ${STORY_BACK_CHROME} ${STORY_BACK_CHROME_BORDER}`}
          >
            Back to {story.category.name}
          </MagazineLink>
        </div>
      </StoryCopyTransition>
    </article>
  );
}
