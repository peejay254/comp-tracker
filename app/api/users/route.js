import bcrypt from "bcryptjs";
import { getDb } from "@/lib/mongodb";
import { fail, guard, json, PASSWORD_MIN } from "@/lib/http";

export const dynamic = "force-dynamic";
const ROLES = ["admin", "inspector", "viewer"];

export async function GET(req) {
  const { res } = await guard(req, ["admin"]);
  if (res) return res;
  const users = await (await getDb()).collection("users").find({}, { projection: { passwordHash: 0, tokenVersion: 0 } }).sort({ username: 1 }).toArray();
  return json(users.map((u) => ({ id: String(u._id), username: u.username, name: u.name, role: u.role, active: u.active, createdAt: u.createdAt })));
}

export async function POST(req) {
  const { res } = await guard(req, ["admin"]);
  if (res) return res;
  const b = await req.json().catch(() => ({}));
  const username = String(b.username || "").trim().toLowerCase();
  const name = String(b.name || "").trim();
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) return fail("Username: 3–30 letters, numbers, dot, dash or underscore.");
  if (name.length < 2 || name.length > 60) return fail("Enter the person's full name.");
  if (!ROLES.includes(b.role)) return fail("Invalid role.");
  if (String(b.password || "").length < PASSWORD_MIN) return fail(`Password must be at least ${PASSWORD_MIN} characters.`);
  try {
    await (await getDb()).collection("users").insertOne({
      username, name, role: b.role, active: true, tokenVersion: 0,
      passwordHash: await bcrypt.hash(String(b.password), 12), createdAt: new Date().toISOString(),
    });
  } catch (e) { if (e.code === 11000) return fail("That username is already taken.", 409); throw e; }
  return json({ ok: true }, 201);
}
