// [NEW FILE] POST /api/computers/6-12/reset  (admin only)
// Puts a computer back to its default "Not inspected" state: its inspection records are soft-deleted
// (kept with who/when/why, so the activity log still shows it) and any unfinished draft is removed.
import { getDb } from "@/lib/mongodb";
import { fail, guard, json } from "@/lib/http";
import { resolveComputer } from "@/lib/labs";

export const dynamic = "force-dynamic";

export async function POST(req, { params }) {
  const { user, res } = await guard(req, ["admin"]);
  if (res) return res;
  const { key } = await params;
  const k = await resolveComputer(key);
  if (!k) return fail("Unknown computer.", 404);
  const db = await getDb();
  const r = await db.collection("inspections").updateMany(
    { lab: k.lab, pc: k.pc, deletedAt: null },
    { $set: { deletedAt: new Date().toISOString(), deletedBy: user.name, deletedReason: "reset" } });
  const d = await db.collection("drafts").deleteOne({ _id: key });
  return json({ ok: true, inspections: r.modifiedCount, drafts: d.deletedCount });
}
