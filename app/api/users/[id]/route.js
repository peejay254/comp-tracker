import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { fail, guard, json, PASSWORD_MIN } from "@/lib/http";

export const dynamic = "force-dynamic";
const ROLES = ["admin", "inspector", "viewer"];

export async function PATCH(req, { params }) {
  const { user, res } = await guard(req, ["admin"]);
  if (res) return res;
  const { id } = await params;
  if (!ObjectId.isValid(id)) return fail("Invalid user.", 404);
  const b = await req.json().catch(() => ({}));
  const set = {};
  let bump = false;
  if (typeof b.active === "boolean") set.active = b.active;
  if (b.role !== undefined) { if (!ROLES.includes(b.role)) return fail("Invalid role."); set.role = b.role; }
  if (b.password !== undefined) {
    if (String(b.password).length < PASSWORD_MIN) return fail(`Password must be at least ${PASSWORD_MIN} characters.`);
    set.passwordHash = await bcrypt.hash(String(b.password), 12);
    bump = true; // signs that user out everywhere
  }
  if (id === user.id && (set.active === false || (set.role && set.role !== "admin"))) return fail("You cannot deactivate or demote your own account.");
  if (!Object.keys(set).length) return fail("Nothing to update.");
  const r = await (await getDb()).collection("users").updateOne({ _id: new ObjectId(id) }, { $set: set, ...(bump ? { $inc: { tokenVersion: 1 } } : {}) });
  return r.matchedCount ? json({ ok: true }) : fail("User not found.", 404);
}
