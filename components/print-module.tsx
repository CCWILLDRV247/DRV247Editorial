import { HOMEPAGE_COMPOSITION } from "@/lib/engine/editorial-composition";
import type { PrintModule } from "@/lib/engine/print";
import { PrintCoverCard } from "./print-cover-card";

const PAGE_GUTTER =
  "min-w-0 pl-[calc(10px+env(safe-area-inset-left,0px))] pr-[calc(10px+env(safe-area-inset-right,0px))]";

export function PrintModuleRail({
  module,
  testQuery,
}: {
  module: PrintModule;
  testQuery?: string;
}) {
  if (module.publications.length === 0) return null;
  return (
    <section className={`min-w-0 ${PAGE_GUTTER}`}>
      <p className={HOMEPAGE_COMPOSITION.sectionTitle}>{module.heading}</p>
      <p className="mt-2 font-display text-[11px] font-bold uppercase tracking-[0.08em] text-[#1b1d1f]/50 md:mt-1.5 md:text-xs md:text-[#1b1d1f]/55">
        {module.dek}
      </p>
      <div className="mt-4 flex min-w-0 gap-2.5 overflow-x-auto pb-2 snap-x snap-mandatory [scrollbar-width:thin] md:mt-5 md:gap-2">
        {module.publications.map((publication) => {
          const path = `/print/${publication.slug}`;
          const href = testQuery ? `${path}?${testQuery}` : path;
          return (
            <div key={publication.id} className="w-[9.75rem] shrink-0 snap-start md:w-[11.5rem]">
              <PrintCoverCard publication={publication} href={href} compact />
            </div>
          );
        })}
      </div>
    </section>
  );
}
