import { CarouselStoryCard } from "@/components/category-carousel";
import { HOMEPAGE_COMPOSITION, MAGAZINE_LAYOUT, isSoloMagazineRail } from "@/lib/engine/editorial-composition";
import type { CommunityDiscovery } from "@/lib/engagement/community";

export function CommunityDiscoverySection({
  community,
}: {
  community: CommunityDiscovery;
}) {
  if (community.stories.length === 0) {
    return (
      <section className="min-w-0" aria-labelledby="community-discovery-heading">
        <div className={MAGAZINE_LAYOUT.gutter}>
          <p
            id="community-discovery-heading"
            className={HOMEPAGE_COMPOSITION.sectionTitle}
          >
            {community.heading}
          </p>
          <p className="mt-2 max-w-xl text-base leading-[22px] tracking-[-0.32px] text-[#1b1d1f]/75 md:mt-3">
            Nothing on the desk for this mix yet — check back after the next pull.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="min-w-0" aria-labelledby="community-discovery-heading">
      <div className={MAGAZINE_LAYOUT.gutter}>
        <p id="community-discovery-heading" className={HOMEPAGE_COMPOSITION.sectionTitle}>
          {community.heading}
        </p>
        {community.dek ? (
          <p className="mt-2 font-display text-[11px] font-bold uppercase tracking-[0.08em] text-[#1b1d1f]/50 md:mt-1.5 md:text-xs md:text-[#1b1d1f]/55">
            {community.dek}
          </p>
        ) : null}
      </div>
      <div className={MAGAZINE_LAYOUT.railGutter}>
        <div
          data-magazine-rail="community"
          data-community-mode={community.mode}
          data-magazine-rail-solo={isSoloMagazineRail(community.stories.length) ? "" : undefined}
          className={
            isSoloMagazineRail(community.stories.length) ? MAGAZINE_LAYOUT.railSolo : MAGAZINE_LAYOUT.rail
          }
        >
          {community.stories.map((story) => (
            <CarouselStoryCard
              key={story.id}
              story={story}
              solo={isSoloMagazineRail(community.stories.length)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
