import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { createSession } from "@/lib/auth";
import { fail, guard, json, PASSWORD_MIN } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const { user, res } = await guard(req);
  if (res) return res;
  const b = await req.json().catch(() => ({}));
  const next = String(b.next || "");
  if (next.length < PASSWORD_MIN || next.length > 200) return fail(`New password must be at least ${PASSWORD_MIN} characters.`);
  const users = (await getDb()).collection("users");
  const me = await users.findOne({ _id: new ObjectId(user.id) });
  if (!(await bcrypt.compare(String(b.current || ""), me.passwordHash))) return fail("Current password is incorrect.");
  // Bumping tokenVersion signs the user out everywhere else
  const upd = await users.findOneAndUpdate({ _id: me._id },
    { $set: { passwordHash: await bcrypt.hash(next, 12) }, $inc: { tokenVersion: 1 } }, { returnDocument: "after" });
  await createSession(upd);
  return json({ ok: true });
}
