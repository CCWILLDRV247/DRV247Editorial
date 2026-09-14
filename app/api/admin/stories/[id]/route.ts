import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
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

  const db = getDb();
  const updated = db
    .update(stories)
    .set({
      ...(typeof body.hidden === "boolean" ? { hidden: body.hidden } : {}),
      ...(typeof body.categoryId === "number" ? { categoryId: body.categoryId } : {}),
    })
    .where(eq(stories.id, storyId))
    .returning()
    .get();

  if (!updated) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }
  revalidatePath("/admin");
  revalidatePath("/");
  return NextResponse.json({ story: updated });
}
