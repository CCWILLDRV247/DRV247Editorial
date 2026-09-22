import type { Metadata } from "next";
import { IntelligenceDesk } from "./intelligence-desk";

export const metadata: Metadata = {
  title: "Vehicle Intelligence",
  description: "BUILD and MAINTAIN proof desk for the seeded garage.",
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function IntelligencePage() {
  return (
    <main className="min-h-full bg-white text-ink">
      <IntelligenceDesk />
    </main>
  );
}
