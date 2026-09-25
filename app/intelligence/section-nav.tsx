import Link from "next/link";

export function IntelligenceSectionNav({
  current,
  query,
}: {
  current: "home" | "print";
  query?: string;
}) {
  const printHref = query ? `/intelligence/print?${query}` : "/intelligence/print";
  const item = (active: boolean) =>
    active
      ? "font-display text-lg font-bold uppercase tracking-[-0.02em] text-[#1b1d1f]"
      : "font-display text-lg font-bold uppercase tracking-[-0.02em] text-[#1b1d1f]/70 hover:text-[#1b1d1f]";

  return (
    <nav aria-label="Intelligence" className="flex flex-wrap gap-6">
      <Link href="/intelligence" className={item(current === "home")} aria-current={current === "home" ? "page" : undefined}>
        Build / Maintain
      </Link>
      <Link href={printHref} className={item(current === "print")} aria-current={current === "print" ? "page" : undefined}>
        Print
      </Link>
    </nav>
  );
}
