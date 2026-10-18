import { HOMEPAGE_COMPOSITION, MAGAZINE_LAYOUT } from "@/lib/engine/editorial-composition";
import type { PrintModule } from "@/lib/engine/print";
import { PrintCoverCard } from "./print-cover-card";

const PAGE_GUTTER = MAGAZINE_LAYOUT.gutter;

export function PrintModuleRail({
  module,
  testQuery,
}: {
  module: PrintModule;
  testQuery?: string;
}) {
  if (module.publications.length === 0) return null;
  return (
    <section className="min-w-0">
      <div className={PAGE_GUTTER}>
        <p className={HOMEPAGE_COMPOSITION.sectionTitle}>{module.heading}</p>
        <p className="mt-2 font-display text-[11px] font-bold uppercase tracking-[0.08em] text-[#1b1d1f]/50 md:mt-1.5 md:text-xs md:text-[#1b1d1f]/55">
          {module.dek}
        </p>
      </div>
      <div
        data-magazine-rail="print"
        className={`${PAGE_GUTTER} ${MAGAZINE_LAYOUT.rail}`}
      >
        {module.publications.map((publication) => (
          <div key={publication.id} className={MAGAZINE_LAYOUT.printRailCard}>
            <PrintCoverCard publication={publication} query={testQuery} compact />
          </div>
        ))}
      </div>
    </section>
  );
}
