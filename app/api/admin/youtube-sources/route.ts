import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { addYoutubeMediaSource } from "@/lib/engine/youtube-sources";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    channel?: string;
    publication?: string;
    country?: string;
    maxArticles?: number;
    enabled?: boolean;
  } | null;

  if (!body?.channel?.trim()) {
    return NextResponse.json({ error: "Channel URL or ID is required" }, { status: 400 });
  }

  try {
    const result = await addYoutubeMediaSource({
      raw: body.channel,
      publication: body.publication,
      country: body.country,
      maxArticles: body.maxArticles,
      enabled: body.enabled,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not add YouTube channel";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
