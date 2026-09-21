import { MagazineLink } from "@/components/magazine-link";

export function MoreNav({
  items,
}: {
  items: { slug: string; name: string; href: string; query?: string }[];
}) {
  return (
    <details className="relative shrink-0">
      <summary className="touch-manipulation cursor-pointer font-display text-base font-bold uppercase text-[#1b1d1f]/70 [&::-webkit-details-marker]:hidden">
        More
      </summary>
      <div
        role="menu"
        className="absolute right-0 z-50 mt-2 min-w-[10rem] border border-[#1b1d1f]/10 bg-white p-3 shadow-sm"
      >
        {items.map((item) => (
          <MagazineLink
            key={item.slug}
            role="menuitem"
            href={item.href}
            query={item.query}
            className="block py-1 font-display text-base font-bold uppercase text-[#1b1d1f]"
          >
            {item.name}
          </MagazineLink>
        ))}
      </div>
    </details>
  );
}
