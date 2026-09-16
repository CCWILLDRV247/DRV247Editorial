"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { stories } from "@/lib/db/schema";

export async function toggleStoryHidden(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const hidden = formData.get("hidden") === "true";
  if (!id) return;
  getDb()
    .update(stories)
    .set({ hidden })
    .where(eq(stories.id, id))
    .run();
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function recategorizeStory(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const categoryId = Number(formData.get("categoryId"));
  if (!id || !categoryId) return;
  getDb()
    .update(stories)
    .set({ categoryId })
    .where(eq(stories.id, id))
    .run();
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/category");
}
