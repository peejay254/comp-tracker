import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";

export const COOKIE = "ct_session";
const MAX_AGE = 60 * 60 * 12; // 12 hours

const secret = () => {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET must be set to a random string of 32+ characters");
  return new TextEncoder().encode(s);
};

export async function createSession(user) {
  const token = await new SignJWT({ role: user.role, v: user.tokenVersion || 0 })
    .setProtectedHeader({ alg: "HS256" }).setSubject(String(user._id)).setIssuedAt().setExpirationTime(`${MAX_AGE}s`).sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: MAX_AGE,
    secure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === "true" : process.env.NODE_ENV === "production",
  });
}

export async function destroySession() { (await cookies()).delete(COOKIE); }

/** Verifies the cookie AND re-checks the user in the database, so deactivated users and
 *  password resets take effect immediately. */
export async function getSession() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    const u = await (await getDb()).collection("users").findOne({ _id: new ObjectId(payload.sub) });
    if (!u || !u.active || (u.tokenVersion || 0) !== payload.v) return null;
    return { id: String(u._id), username: u.username, name: u.name, role: u.role };
  } catch { return null; }
}
