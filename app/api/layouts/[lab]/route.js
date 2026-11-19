// [NEW FILE] Admin only.
//   PUT  /api/layouts/:lab  { sections: [{ cols, pcs: [...] }] }       -> save a new arrangement (drag & drop)
//   POST /api/layouts/:lab  { action: "add", section }                 -> add a new computer to the end of a section
//   POST /api/layouts/:lab  { action: "remove", pc }                   -> remove a computer that has no data
import { getDb } from "@/lib/mongodb";
import { fail, guard, json } from "@/lib/http";
import { LAB_IDS } from "@/lib/layouts";
import { getLab, saveLab } from "@/lib/labs";

export const dynamic = "force-dynamic";
const MAX_PER_LAB = 40;
const allPcs = (doc) => doc.sections.flatMap((s) => s.pcs);

async function labFrom(params) {
  const lab = Number((await params).lab);
  return LAB_IDS.includes(lab) ? lab : null;
}

export async function PUT(req, { params }) {
  const { user, res } = await guard(req, ["admin"]);
  if (res) return res;
  const lab = await labFrom(params);
  if (!lab) return fail("Unknown lab.", 404);
  const b = await req.json().catch(() => null);
  if (!b || !Array.isArray(b.sections)) return fail("Invalid layout.");
  const cur = await getLab(lab);
  if (b.sections.length !== cur.sections.length) return fail("This lab changed while you were editing. Reload and try again.", 409);

  const seen = new Set(), sections = [];
  for (let i = 0; i < b.sections.length; i++) {
    const s = b.sections[i];
    const cols = Number(s?.cols);
    if (!Number.isInteger(cols) || cols < 1 || cols > 8) return fail("Columns must be between 1 and 8.");
    if (!Array.isArray(s.pcs) || s.pcs.some((p) => !Number.isInteger(p))) return fail("Invalid layout.");
    for (const p of s.pcs) { if (seen.has(p)) return fail("Invalid layout."); seen.add(p); }
    sections.push({ name: cur.sections[i].name || "", cols, pcs: s.pcs });
  }
  const before = allPcs(cur);
  if (seen.size !== before.length || before.some((p) => !seen.has(p))) return fail("This lab changed while you were editing. Reload and try again.", 409);

  await saveLab(lab, { sections, nextPc: cur.nextPc }, user.name);
  return json({ sections, nextPc: cur.nextPc });
}

export async function POST(req, { params }) {
  const { user, res } = await guard(req, ["admin"]);
  if (res) return res;
  const lab = await labFrom(params);
  if (!lab) return fail("Unknown lab.", 404);
  const b = await req.json().catch(() => ({}));
  const cur = await getLab(lab);

  if (b.action === "add") {
    const si = Number(b.section);
    if (!Number.isInteger(si) || !cur.sections[si]) return fail("Unknown section.");
    const pcs = allPcs(cur);
    if (pcs.length >= MAX_PER_LAB) return fail(`A lab can have at most ${MAX_PER_LAB} computers.`);
    const pc = Math.max(cur.nextPc || 0, Math.max(0, ...pcs) + 1); // numbers are never reused
    cur.sections[si].pcs.push(pc);
    cur.nextPc = pc + 1;
    await saveLab(lab, cur, user.name);
    return json({ pc, sections: cur.sections, nextPc: cur.nextPc }, 201);
  }

  if (b.action === "remove") {
    const pc = Number(b.pc);
    const si = cur.sections.findIndex((s) => s.pcs.includes(pc));
    if (!Number.isInteger(pc) || si < 0) return fail("Unknown computer.", 404);
    const db = await getDb();
    const used = await db.collection("inspections").countDocuments({ lab, pc, deletedAt: null });
    const draft = await db.collection("drafts").countDocuments({ _id: `${lab}-${pc}` });
    if (used || draft) return fail("This computer has inspection data. Reset it first, then remove it.");
    cur.sections[si].pcs = cur.sections[si].pcs.filter((p) => p !== pc);
    await saveLab(lab, cur, user.name);
    return json({ ok: true, sections: cur.sections, nextPc: cur.nextPc });
  }

  return fail("Unknown action.");
}
