"use client";

import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Drv247Wordmark } from "@/components/drv247-wordmark";
import { MagazineLink } from "@/components/magazine-link";
import { PRIMARY_NAV } from "@/config/magazine-nav";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

function navHrefActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

const MOBILE_NAV_LINK_CLASS =
  "block py-5 font-display text-[2rem] font-bold uppercase leading-none tracking-[-0.02em] sm:text-[2.125rem]";

export function MobileNavMenu({
  testQuery,
  className,
}: {
  testQuery?: string;
  className?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={`size-9 shrink-0 text-[#1b1d1f] hover:bg-[#1b1d1f]/5 ${className ?? ""}`}
          />
        }
      >
        <Menu className="size-5" strokeWidth={2.25} aria-hidden />
        <span className="sr-only">Open menu</span>
      </SheetTrigger>
      <SheetContent
        side="right"
        fullWidth
        showCloseButton
        className="gap-0 border-[#1b1d1f]/10 bg-white p-0"
      >
        <div className="flex items-center justify-between border-b border-[#1b1d1f]/10 py-4 pl-5 pr-14">
          <SheetTitle className="sr-only">Site navigation</SheetTitle>
          <MagazineLink
            href="/"
            query={testQuery}
            aria-label="DRV247 home"
            className="inline-flex shrink-0 items-center"
          >
            <Drv247Wordmark className="h-6 w-auto" />
          </MagazineLink>
          <SheetClose className="sr-only">Close menu</SheetClose>
        </div>
        <nav
          aria-label="Primary"
          className="flex flex-1 flex-col overflow-y-auto px-5 py-2"
        >
          <ul className="flex flex-col">
            {PRIMARY_NAV.map((item) => {
              const active = navHrefActive(pathname, item.href);
              return (
                <li key={item.slug} className="border-b border-[#1b1d1f]/8">
                  <MagazineLink
                    href={item.href}
                    query={testQuery}
                    onClick={() => setOpen(false)}
                    className={`${MOBILE_NAV_LINK_CLASS} ${
                      active ? "text-[#1b1d1f]" : "text-[#1b1d1f]/75"
                    }`}
                  >
                    {item.name}
                  </MagazineLink>
                </li>
              );
            })}
            <li className="border-b border-[#1b1d1f]/8">
              <MagazineLink
                href="/saved"
                query={testQuery}
                onClick={() => setOpen(false)}
                className={`${MOBILE_NAV_LINK_CLASS} ${
                  navHrefActive(pathname, "/saved") ? "text-[#1b1d1f]" : "text-[#1b1d1f]/75"
                }`}
              >
                Saved
              </MagazineLink>
            </li>
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
