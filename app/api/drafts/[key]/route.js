import { getDb } from "@/lib/mongodb";
import { fail, guard, json } from "@/lib/http";
import { COMPUTERS } from "@/lib/layouts";
import { sanitizeDraft } from "@/lib/validate";

export const dynamic = "force-dynamic";

// One shared draft per computer, keyed "lab-pc" (e.g. "6-12"). Saved on the server so any
// inspector can continue it later, from any device.
function parseKey(key) {
  const m = /^(\d+)-(\d+)$/.exec(key);
  if (!m) return null;
  const lab = Number(m[1]), pc = Number(m[2]);
  return COMPUTERS[lab] && pc >= 1 && pc <= COMPUTERS[lab].length ? { lab, pc } : null;
}

export async function PUT(req, { params }) {
  const { user, res } = await guard(req, ["admin", "inspector"]);
  if (res) return res;
  const { key } = await params;
  const k = parseKey(key);
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
