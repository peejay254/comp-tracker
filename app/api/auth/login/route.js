import bcrypt from "bcryptjs";
import { getDb } from "@/lib/mongodb";
import { createSession } from "@/lib/auth";
import { fail, json, sameOrigin } from "@/lib/http";

export const dynamic = "force-dynamic";
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 12); // keeps timing equal for unknown users
const MAX_FAILS = 8, LOCK_MS = 15 * 60 * 1000;

export async function POST(req) {
  if (!sameOrigin(req)) return fail("Request blocked.", 403);
  const b = await req.json().catch(() => ({}));
  const username = String(b.username || "").trim().toLowerCase();
  const password = String(b.password || "");
  if (!username || !password || password.length > 200) return fail("Enter your username and password.");

  const db = await getDb();
  const attempts = db.collection("login_attempts");
  const rec = await attempts.findOne({ _id: username });
  if (rec && rec.count >= MAX_FAILS) return fail("Too many failed attempts. Try again in 15 minutes.", 429);

  const user = await db.collection("users").findOne({ username });
  const ok = await bcrypt.compare(password, user?.passwordHash || DUMMY_HASH);
  if (!user || !user.active || !ok) {
    await attempts.updateOne({ _id: username }, { $inc: { count: 1 }, $setOnInsert: { expireAt: new Date(Date.now() + LOCK_MS) } }, { upsert: true });
    return fail("Incorrect username or password.", 401);
  }
  await attempts.deleteOne({ _id: username });
  await createSession(user);
  return json({ ok: true });
}
