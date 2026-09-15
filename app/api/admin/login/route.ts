import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminCookieOptions, adminPassword, adminToken, safeAdminPath } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function readLogin(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as
      | { password?: string; next?: string }
      | null;
    return {
      password: String(body?.password ?? ""),
      next: safeAdminPath(body?.next),
      json: true,
    };
  }
  const form = await request.formData().catch(() => null);
  return {
    password: String(form?.get("password") ?? ""),
    next: safeAdminPath(form?.get("next")),
    json: false,
  };
}

export async function POST(request: Request) {
  const { password, next, json } = await readLogin(request);
  const accept = request.headers.get("accept") ?? "";
  const wantsJson = json || (accept.includes("application/json") && !accept.includes("text/html"));

  if (password !== adminPassword()) {
    if (wantsJson) {
      return NextResponse.json({ error: "Wrong password" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/admin/login?error=1", request.url), 303);
  }

  const response = wantsJson
    ? NextResponse.json({ ok: true, next })
    : NextResponse.redirect(new URL(next, request.url), 303);
  response.cookies.set(ADMIN_COOKIE, adminToken(), adminCookieOptions());
  return response;
}
