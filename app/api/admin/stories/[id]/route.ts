import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { stories } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const storyId = Number(id);
  const body = (await request.json().catch(() => null)) as {
    hidden?: boolean;
    categoryId?: number;
  } | null;

  if (!storyId || !body) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.hidden === "boolean") patch.hidden = body.hidden;
  if (typeof body.categoryId === "number") patch.categoryId = body.categoryId;

  const db = getDb();
  const updated = db
    .update(stories)
    .set(patch)
    .where(eq(stories.id, storyId))
    .returning()
    .get();

  if (!updated) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }
  return NextResponse.json({ story: updated });
}
