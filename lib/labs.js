// [NEW FILE] Server-side access to the lab floor plans stored in MongoDB (collection "labs").
// A lab that an admin has never edited has no document: its default plan from lib/layouts.js is used.
import { getDb } from "./mongodb";
import { LAB_IDS, buildComputers, defaultLab } from "./layouts";

const col = async () => (await getDb()).collection("labs");
const shape = (d) => ({ sections: d.sections, nextPc: d.nextPc });

export async function getLab(lab) {
  const d = await (await col()).findOne({ _id: lab });
  return d ? shape(d) : defaultLab(lab);
}

export async function getAllLabs() {
  const docs = await (await col()).find({}).toArray();
  return Object.fromEntries(LAB_IDS.map((lab) => {
    const d = docs.find((x) => x._id === lab);
    return [lab, d ? shape(d) : defaultLab(lab)];
  }));
}

export async function saveLab(lab, doc, by) {
  await (await col()).replaceOne({ _id: lab },
    { _id: lab, sections: doc.sections, nextPc: doc.nextPc, updatedAt: new Date().toISOString(), updatedBy: by }, { upsert: true });
}

export const computersOf = (doc) => buildComputers(doc.sections);

/** "6-12" -> { lab: 6, pc: 12 } when that computer exists in the lab's current layout, else null. */
export async function resolveComputer(key) {
  const m = /^(\d+)-(\d+)$/.exec(key);
  if (!m) return null;
  const lab = Number(m[1]), pc = Number(m[2]);
  if (!LAB_IDS.includes(lab)) return null;
  const doc = await getLab(lab);
  return doc.sections.some((s) => s.pcs.includes(pc)) ? { lab, pc } : null;
}
