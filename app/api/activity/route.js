import { getDb } from "@/lib/mongodb";
import { guard, json } from "@/lib/http";

export const dynamic = "force-dynamic";

const healthy = (d) => d.formatted && Object.values(d.software || {}).every(Boolean) && d.liveServer && d.keyboard && d.mouse;

// Accountability log: who inspected what and when, plus who deleted a record.
export async function GET(req) {
  const { res } = await guard(req);
  if (res) return res;
  const docs = await (await getDb()).collection("inspections").find({}).sort({ createdAt: -1 }).limit(200).toArray();
  const events = [];
  for (const d of docs) {
    events.push({ type: "inspected", who: d.inspector, lab: d.lab, pc: d.pc, at: d.createdAt, ok: !!healthy(d) });
    if (d.deletedAt) events.push({ type: "deleted", who: d.deletedBy, by: d.inspector, lab: d.lab, pc: d.pc, at: d.deletedAt });
  }
  events.sort((a, b) => b.at.localeCompare(a.at));
  return json(events.slice(0, 100));
}
