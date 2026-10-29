import { getDb } from "@/lib/mongodb";
import { guard, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export const toDraft = (d) => ({ id: d._id, lab: d.lab, pc: d.pc, step: d.step, data: d.data, inspector: d.inspector, updatedAt: d.updatedAt });

export async function GET(req) {
  const { res } = await guard(req);
  if (res) return res;
  const docs = await (await getDb()).collection("drafts").find({}).sort({ updatedAt: -1 }).toArray();
  return json(docs.map(toDraft));
}
