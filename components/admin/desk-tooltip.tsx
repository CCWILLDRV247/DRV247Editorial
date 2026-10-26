"use client";

import type { ComponentProps, ReactElement, ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type Side = ComponentProps<typeof TooltipContent>["side"];

function DeskTooltip({
  label,
  side = "top",
  children,
}: {
  label: string;
  side?: Side;
  children: ReactElement;
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent side={side} className="max-w-xs text-pretty">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

type DeskButtonProps = ComponentProps<typeof Button> & {
  tooltip: string;
  tooltipSide?: Side;
};

export function DeskButton({ tooltip, tooltipSide, children, ...props }: DeskButtonProps) {
  return (
    <DeskTooltip label={tooltip} side={tooltipSide}>
      <Button {...props}>{children}</Button>
    </DeskTooltip>
  );
}

type DeskNativeButtonProps = ComponentProps<"button"> & {
  tooltip: string;
  tooltipSide?: Side;
};

export function DeskNativeButton({
  tooltip,
  tooltipSide,
  children,
  type = "button",
  ...props
}: DeskNativeButtonProps) {
  return (
    <DeskTooltip label={tooltip} side={tooltipSide}>
      <button type={type} {...props}>
        {children}
      </button>
    </DeskTooltip>
  );
}

type DeskLinkProps = ComponentProps<typeof Link> & {
  tooltip: string;
  tooltipSide?: Side;
  children: ReactNode;
};

export function DeskLink({ tooltip, tooltipSide, children, ...props }: DeskLinkProps) {
  return (
    <DeskTooltip label={tooltip} side={tooltipSide}>
      <Link {...props}>{children}</Link>
    </DeskTooltip>
  );
}

export { DeskTooltip };
