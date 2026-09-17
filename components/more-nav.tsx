"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";

export function MoreNav({
  items,
}: {
  items: { slug: string; name: string; href: string }[];
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className="touch-manipulation font-display text-base font-bold uppercase text-[#1b1d1f]/70"
      >
        More
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-50 mt-2 min-w-[10rem] border border-[#1b1d1f]/10 bg-white p-3 shadow-sm"
        >
          {items.map((item) => (
            <Link
              key={item.slug}
              role="menuitem"
              href={item.href}
              onClick={() => setOpen(false)}
              className="block py-1 font-display text-base font-bold uppercase text-[#1b1d1f]"
            >
              {item.name}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
