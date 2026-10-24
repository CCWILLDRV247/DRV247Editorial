"use client";

import { Bookmark } from "lucide-react";
import { usePathname } from "next/navigation";
import { MagazineLink } from "@/components/magazine-link";

export function SavedHeaderLink({ testQuery }: { testQuery?: string }) {
  const pathname = usePathname();
  const active = pathname === "/saved";

  return (
    <MagazineLink
      href="/saved"
      query={testQuery}
      aria-label="Saved stories"
      aria-current={active ? "page" : undefined}
      className="flex size-9 shrink-0 items-center justify-center text-[#1b1d1f] hover:bg-[#1b1d1f]/5"
    >
      <Bookmark className="size-5" strokeWidth={2.25} fill={active ? "currentColor" : "none"} aria-hidden />
    </MagazineLink>
  );
}
