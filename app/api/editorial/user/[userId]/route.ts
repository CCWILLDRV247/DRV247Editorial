import { NextResponse } from "next/server";
import { getDemoUser, listEditorial } from "@/lib/engine/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  const { userId } = await context.params;
  const user = await getDemoUser(userId);
  if (!user) {
    return NextResponse.json({ error: "Unknown demo user" }, { status: 404 });
  }
  const articles = await listEditorial({ userId, limit: 40 });
  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      location: user.location,
      interests: user.interests,
      vehicles: user.vehicles,
    },
    articles,
  });
}
