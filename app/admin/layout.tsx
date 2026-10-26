import type { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <TooltipProvider delay={300}>{children}</TooltipProvider>;
}
