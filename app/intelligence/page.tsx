import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-chrome";
import { VehicleEntry } from "./vehicle-entry";

export const metadata: Metadata = {
  title: "What do you want to do with your car?",
  description:
    "Change it, or look after it. BUILD discovers. MAINTAIN replaces. Vehicle Intelligence for your garage.",
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function IntelligencePage() {
  return (
    <div className="min-h-full overflow-x-clip bg-white">
      <SiteHeader title="Your car" backHref="/" />
      <main className="pt-2">
        <VehicleEntry />
      </main>
    </div>
  );
}
