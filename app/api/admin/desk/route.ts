import { eq, like } from "drizzle-orm";
import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { articles, deskPicks } from "@/lib/db/schema";
import {
  DESK_LABELS,
  isDeskPickLive,
  toDeskPublic,
  upsertDeskPick,
} from "@/lib/engine/desk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bustDeskCache() {
  revalidateTag("editorial", "max");
  revalidatePath("/");
  revalidatePath("/admin/engine");
}

export async function GET(request: Request) {
  await requireAdmin();
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const db = await getDb();
  const picks = await db.select().from(deskPicks);
  const pickRows = [];
  for (const pick of picks) {
    const article = (
      await db
        .select({
          id: articles.id,
          title: articles.title,
          publication: articles.publication,
        })
        .from(articles)
        .where(eq(articles.id, pick.articleId))
        .limit(1)
    )[0];
    pickRows.push({
      ...toDeskPublic(pick),
      live: isDeskPickLive(pick),
      article: article ?? null,
    });
  }
  pickRows.sort((a, b) => Number(b.featured) - Number(a.featured) || b.selectedAt - a.selectedAt);

  let search: { id: number; title: string; publication: string }[] = [];
  if (q) {
    search = await db
      .select({
        id: articles.id,
        title: articles.title,
        publication: articles.publication,
      })
      .from(articles)
      .where(like(articles.title, `%${q}%`))
      .limit(12);
  }

  return NextResponse.json({ labels: DESK_LABELS, picks: pickRows, search });
}

export async function POST(request: Request) {
  await requireAdmin();
  const body = (await request.json().catch(() => null)) as {
    articleId?: number;
    note?: string | null;
    label?: string;
    featured?: boolean;
    active?: boolean;
    expiresAt?: number | null;
    category?: string | null;
  } | null;
  const articleId = Number(body?.articleId);
  if (!articleId) {
    return NextResponse.json({ error: "Select an article" }, { status: 400 });
  }
  const db = await getDb();
  const result = await upsertDeskPick(db, {
    articleId,
    note: body?.note,
    label: body?.label,
    featured: body?.featured,
    active: body?.active,
    expiresAt: body?.expiresAt,
    category: body?.category,
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }
  bustDeskCache();
  return NextResponse.json({ pick: result.pick, labels: DESK_LABELS });
}

export async function PATCH(request: Request) {
  await requireAdmin();
  const body = (await request.json().catch(() => null)) as {
    id?: number;
    articleId?: number;
    note?: string | null;
    label?: string;
    featured?: boolean;
    active?: boolean;
    expiresAt?: number | null;
    category?: string | null;
  } | null;
  const db = await getDb();
  let articleId = Number(body?.articleId);
  if (!articleId && body?.id) {
    const existing = (
      await db.select().from(deskPicks).where(eq(deskPicks.id, Number(body.id))).limit(1)
    )[0];
    articleId = existing?.articleId ?? 0;
  }
  if (!articleId) {
    return NextResponse.json({ error: "Missing desk pick" }, { status: 400 });
  }
  const result = await upsertDeskPick(db, {
    articleId,
    note: body?.note,
    label: body?.label,
    featured: body?.featured,
    active: body?.active,
    expiresAt: body?.expiresAt,
    category: body?.category,
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }
  bustDeskCache();
  return NextResponse.json({ pick: result.pick });
}

export async function DELETE(request: Request) {
  await requireAdmin();
  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  const db = await getDb();
  await db.delete(deskPicks).where(eq(deskPicks.id, id));
  bustDeskCache();
  return NextResponse.json({ ok: true });
}
