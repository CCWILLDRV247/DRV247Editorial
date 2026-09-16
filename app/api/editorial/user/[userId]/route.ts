import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getDemoUser, listEditorial } from "@/lib/engine/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  getDb();
  const { userId } = await context.params;
  const user = getDemoUser(userId);
  if (!user) {
    return NextResponse.json({ error: "Unknown demo user" }, { status: 404 });
  }
  const articles = listEditorial({ userId, limit: 40 });
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
