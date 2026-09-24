import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { sources, type SourceType } from "@/lib/db/schema";
import { parseYoutubeChannelInput } from "@/lib/engine/youtube";
import { listAdminSources } from "@/lib/stories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPES = new Set(["rss", "youtube", "newsapi"]);

export async function GET() {
  const rows = await listAdminSources();
  return NextResponse.json({ sources: rows });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    name?: string;
    type?: string;
    identifier?: string;
    defaultCategoryId?: number;
    enabled?: boolean;
  } | null;

  if (!body?.name?.trim() || !body.identifier?.trim() || !TYPES.has(body.type ?? "")) {
    return NextResponse.json({ error: "Name, type, and identifier are required" }, { status: 400 });
  }
  if (!body.defaultCategoryId) {
    return NextResponse.json({ error: "Default category is required" }, { status: 400 });
  }

  let identifier = body.identifier.trim();
  if (body.type === "youtube") {
    const parsed = parseYoutubeChannelInput(identifier);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    identifier = parsed.value;
  }

  const db = await getDb();
  const result = (
    await db
      .insert(sources)
      .values({
        name: body.name.trim(),
        type: body.type as SourceType,
        identifier,
        defaultCategoryId: body.defaultCategoryId,
        enabled: body.enabled ?? true,
        lastFetchStatus: "idle",
        createdAt: Date.now(),
      })
      .returning()
  )[0];

  return NextResponse.json({ source: result });
}

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    id?: number;
    name?: string;
    type?: string;
    identifier?: string;
    defaultCategoryId?: number;
    enabled?: boolean;
  } | null;

  if (!body?.id) {
    return NextResponse.json({ error: "Missing source id" }, { status: 400 });
  }

  const db = await getDb();
  const current = (await db.select().from(sources).where(eq(sources.id, body.id)).limit(1))[0];
  if (!current) {
    return NextResponse.json({ error: "Source not found" }, { status: 404 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string") patch.name = body.name.trim();
  const nextType = body.type && TYPES.has(body.type) ? body.type : current.type;
  if (body.type && TYPES.has(body.type)) patch.type = body.type;
  if (typeof body.identifier === "string") {
    let identifier = body.identifier.trim();
    if (nextType === "youtube") {
      const parsed = parseYoutubeChannelInput(identifier);
      if ("error" in parsed) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
      }
      identifier = parsed.value;
    }
    patch.identifier = identifier;
  }
  if (typeof body.defaultCategoryId === "number") {
    patch.defaultCategoryId = body.defaultCategoryId;
  }
  if (typeof body.enabled === "boolean") patch.enabled = body.enabled;

  const updated = (
    await db.update(sources).set(patch).where(eq(sources.id, body.id)).returning()
  )[0];
  if (!updated) {
    return NextResponse.json({ error: "Source not found" }, { status: 404 });
  }
  return NextResponse.json({ source: updated });
}
