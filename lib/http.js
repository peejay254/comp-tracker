import { NextResponse } from "next/server";
import { getSession } from "./auth";

export const json = (data, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
export const fail = (message, status = 400) => json({ error: message }, status);

/** CSRF defence (on top of SameSite cookies): browsers always send Origin on cross-site POSTs. */
export function sameOrigin(req) {
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser client
  try { return new URL(origin).host === (req.headers.get("x-forwarded-host") || req.headers.get("host")); } catch { return false; }
}

/** Use at the top of every API handler. Returns { user } or { res } to return immediately. */
export async function guard(req, roles) {
  if (req.method !== "GET" && !sameOrigin(req)) return { res: fail("Request blocked.", 403) };
  const user = await getSession();
  if (!user) return { res: fail("Session expired. Please sign in again.", 401) };
  if (roles && !roles.includes(user.role)) return { res: fail("You do not have permission to do that.", 403) };
  return { user };
}

export const PASSWORD_MIN = 10;
