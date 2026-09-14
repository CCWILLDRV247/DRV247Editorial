import { createHash } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "drv247_admin";

export function adminPassword() {
  return process.env.ADMIN_PASSWORD || "desk247";
}

export function adminToken(password = adminPassword()) {
  return createHash("sha256").update(`drv247-admin:${password}`).digest("hex");
}

export async function isAdminSession() {
  const jar = await cookies();
  return jar.get(ADMIN_COOKIE)?.value === adminToken();
}

export async function requireAdmin() {
  if (!(await isAdminSession())) {
    throw new Error("Unauthorized");
  }
}
