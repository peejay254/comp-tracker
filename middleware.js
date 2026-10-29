import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

// First gate: no valid signed cookie -> login (pages) or 401 (API). Handlers re-check the user in the DB.
export async function middleware(req) {
  const token = req.cookies.get("ct_session")?.value;
  let ok = false;
  if (token && process.env.AUTH_SECRET) {
    try { await jwtVerify(token, new TextEncoder().encode(process.env.AUTH_SECRET), { algorithms: ["HS256"] }); ok = true; } catch {}
  }
  if (ok) return NextResponse.next();
  if (req.nextUrl.pathname.startsWith("/api/")) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const url = req.nextUrl.clone(); url.pathname = "/login"; url.search = "";
  return NextResponse.redirect(url);
}
//first assignment
export const config = { matcher: ["/((?!login|api/auth/login|api/health|_next/static|_next/image|favicon.ico).*)"] };
