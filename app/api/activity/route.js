// [UPDATED FILE] Changes are marked with [CHANGED].
import { getDb } from "@/lib/mongodb";
import { guard, json } from "@/lib/http";
import { isHealthy } from "@/lib/layouts"; // [CHANGED] shared health check, so recorded challenges count

export const dynamic = "force-dynamic";

// Accountability log: who inspected what and when, plus who deleted a record.
export async function GET(req) {
  const { res } = await guard(req);
  if (res) return res;
  const docs = await (await getDb()).collection("inspections").find({}).sort({ createdAt: -1 }).limit(200).toArray();
  const events = [];
  for (const d of docs) {
    events.push({ type: "inspected", who: d.inspector, lab: d.lab, pc: d.pc, at: d.createdAt, ok: isHealthy(d) }); // [CHANGED]
    if (d.deletedAt) events.push({ type: d.deletedReason === "reset" ? "reset" : "deleted", who: d.deletedBy, by: d.inspector, lab: d.lab, pc: d.pc, at: d.deletedAt }); // [v3 CHANGED] admin resets
  }
  events.sort((a, b) => b.at.localeCompare(a.at));
  return json(events.slice(0, 100));
}
