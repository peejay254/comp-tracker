// [UPDATED FILE] Only change: the computer is now looked up in the lab's stored layout (resolveComputer)
// instead of the hard-coded COMPUTERS table, because admins can now add computers.
import { getDb } from "@/lib/mongodb";
import { fail, guard, json } from "@/lib/http";
import { resolveComputer } from "@/lib/labs"; // [v3 CHANGED]
import { sanitizeDraft } from "@/lib/validate";

export const dynamic = "force-dynamic";

// One shared draft per computer, keyed "lab-pc" (e.g. "6-12"). Saved on the server so any
// inspector can continue it later, from any device.
export async function PUT(req, { params }) {
  const { user, res } = await guard(req, ["admin", "inspector"]);
  if (res) return res;
  const { key } = await params;
  const k = await resolveComputer(key); // [v3 CHANGED]
  if (!k) return fail("Unknown computer.", 404);
  const clean = sanitizeDraft(await req.json().catch(() => null));
  if (clean.error) return fail(clean.error);
  const doc = { lab: k.lab, pc: k.pc, step: clean.step, data: clean.data, inspector: user.name, inspectorId: user.id, updatedAt: new Date().toISOString() };
  await (await getDb()).collection("drafts").updateOne({ _id: key }, { $set: doc }, { upsert: true });
  return json({ id: key, lab: k.lab, pc: k.pc, step: doc.step, data: doc.data, inspector: doc.inspector, updatedAt: doc.updatedAt });
}

export async function DELETE(req, { params }) {
  const { res } = await guard(req, ["admin", "inspector"]);
  if (res) return res;
  const { key } = await params;
  await (await getDb()).collection("drafts").deleteOne({ _id: key });
  return json({ ok: true });
}
