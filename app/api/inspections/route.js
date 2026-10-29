import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/mongodb";
import { fail, guard, json } from "@/lib/http";
import { SOFTWARE } from "@/lib/layouts";
import { validateInspection } from "@/lib/validate";

export const dynamic = "force-dynamic";

const toRec = (d) => ({
  id: d._id, lab: d.lab, pc: d.pc, date: d.date, inspector: d.inspector, inspectorUsername: d.inspectorUsername, createdAt: d.createdAt,
  formatted: d.formatted, os: d.os, ram: d.ram, software: d.software, liveServer: d.liveServer,
  otherExtensions: d.otherExtensions, keyboard: d.keyboard, mouse: d.mouse,
});

export async function GET(req) {
  const { res } = await guard(req);
  if (res) return res;
  const docs = await (await getDb()).collection("inspections").find({ deletedAt: null }).sort({ date: 1, createdAt: 1 }).toArray();
  return json(docs.map(toRec));
}

export async function POST(req) {
  const { user, res } = await guard(req, ["admin", "inspector"]);
  if (res) return res;
  const b = await req.json().catch(() => null);
  const err = validateInspection(b);
  if (err) return fail(err);
  const doc = {
    _id: randomUUID(), lab: Number(b.lab), pc: Number(b.pc), date: b.date,
    inspector: user.name, inspectorId: user.id, inspectorUsername: user.username, createdAt: new Date().toISOString(),
    formatted: b.formatted, os: b.os, ram: b.ram,
    software: Object.fromEntries(SOFTWARE.map(([k]) => [k, b.software[k]])),
    liveServer: b.liveServer, otherExtensions: (b.otherExtensions || "").trim(), keyboard: b.keyboard, mouse: b.mouse,
    deletedAt: null, deletedBy: null,
  };
  const db = await getDb();
  await db.collection("inspections").insertOne(doc);
  await db.collection("drafts").deleteOne({ _id: `${doc.lab}-${doc.pc}` }); // the draft is finished
  return json(toRec(doc), 201);
}
