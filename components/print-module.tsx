import { SectionKicker } from "@/components/site-chrome";
import { MAGAZINE_LAYOUT } from "@/lib/engine/editorial-composition";
import type { PrintModule } from "@/lib/engine/print";
import { PrintCoverCard } from "./print-cover-card";

const PAGE_GUTTER = MAGAZINE_LAYOUT.gutter;

export function PrintModuleRail({
  module,
  testQuery,
  kickerIndex,
}: {
  module: PrintModule;
  testQuery?: string;
  kickerIndex?: number;
}) {
  if (module.publications.length === 0) return null;
  return (
    <section className="min-w-0">
      <div className={PAGE_GUTTER}>
        <SectionKicker index={kickerIndex}>{module.heading}</SectionKicker>
        <p className="mt-2 font-display text-[11px] font-bold uppercase tracking-[0.08em] text-[#1b1d1f]/50 md:mt-1.5 md:text-xs md:text-[#1b1d1f]/55">
          {module.dek}
        </p>
      </div>
      <div className={`${PAGE_GUTTER} ${MAGAZINE_LAYOUT.rail}`}>
        {module.publications.map((publication) => {
          const path = `/print/${publication.slug}`;
          const href = testQuery ? `${path}?${testQuery}` : path;
          return (
            <div key={publication.id} className={MAGAZINE_LAYOUT.printRailCard}>
              <PrintCoverCard publication={publication} href={href} compact />
            </div>
          );
        })}
      </div>
    </section>
  );
}
