import type { Metadata } from "next";
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
    <main className="min-h-full bg-white text-ink">
      <VehicleEntry />
    </main>
  );
}
