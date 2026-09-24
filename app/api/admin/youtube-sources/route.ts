import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { addYoutubeMediaSource } from "@/lib/engine/youtube-sources";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function deskRedirect(request: Request, params: Record<string, string>) {
  const url = new URL("/admin/engine", request.url);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url, 303);
}

async function readChannelInput(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as {
      channel?: string;
      publication?: string;
      country?: string;
      maxArticles?: number;
      enabled?: boolean;
    } | null;
    return {
      channel: body?.channel?.trim() ?? "",
      publication: body?.publication,
      country: body?.country,
      maxArticles: body?.maxArticles,
      enabled: body?.enabled,
      form: false,
    };
  }
  const form = await request.formData().catch(() => null);
  return {
    channel: String(form?.get("channel") ?? "").trim(),
    publication: String(form?.get("publication") ?? "").trim() || undefined,
    country: String(form?.get("country") ?? "").trim() || undefined,
    maxArticles: Number(form?.get("maxArticles") ?? 8) || 8,
    enabled: true,
    form: true,
  };
}

export async function POST(request: Request) {
  const input = await readChannelInput(request);
  try {
    await requireAdmin();
  } catch {
    if (input.form) {
      return NextResponse.redirect(new URL("/admin/login?next=/admin/engine", request.url), 303);
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!input.channel) {
    if (input.form) {
      return deskRedirect(request, {
        youtube: "error",
        youtube_error: "Channel URL or ID is required",
      });
    }
    return NextResponse.json({ error: "Channel URL or ID is required" }, { status: 400 });
  }

  try {
    const result = await addYoutubeMediaSource({
      raw: input.channel,
      publication: input.publication,
      country: input.country,
      maxArticles: input.maxArticles,
      enabled: input.enabled,
    });
    if (input.form) {
      return deskRedirect(request, {
        youtube: result.created ? "added" : "updated",
        name: result.source?.publication ?? "",
      });
    }
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not add YouTube channel";
    if (input.form) {
      return deskRedirect(request, { youtube: "error", youtube_error: message.slice(0, 180) });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
