// [UPDATED FILE] v3 change: validateInspection now receives the lab's computers (they can be added by an admin).
// Earlier changes are marked [NEW] / [CHANGED].
import { ISSUE_MAP, ISSUE_TYPES, OS_OPTIONS, RAM_OPTIONS, SEVERITIES, SOFTWARE, WIZARD_STEPS } from "./layouts"; // [CHANGED] extra imports

const isBool = (v) => typeof v === "boolean";

/** [NEW] Validates + cleans the list of challenges. strict = a finished inspection (drafts are lenient). */
export function cleanIssues(list, strict) {
  if (list == null) return { issues: [] };
  if (!Array.isArray(list) || list.length > ISSUE_TYPES.length) return { error: "Invalid problems list." };
  const seen = new Set(), issues = [];
  for (const i of list) {
    if (!i || !ISSUE_MAP[i.type] || seen.has(i.type)) return { error: "Invalid problem type." };
    if (!SEVERITIES.some((s) => s.key === i.severity)) return { error: "Invalid problem severity." };
    if (i.note != null && typeof i.note !== "string") return { error: "Invalid problem note." };
    const note = (i.note || "").trim();
    if (note.length > 500) return { error: "A problem note is too long (500 characters max)." };
    if (strict && i.type === "other" && !note) return { error: "Describe the “Other” problem." };
    seen.add(i.type);
    issues.push({ type: i.type, severity: i.severity, note });
  }
  return { issues };
}

/** Returns an error message, or null when the inspection is valid. */
export function validateInspection(b, comps) { // [v3 CHANGED] comps = the lab's computers from the database (null = unknown lab)
  if (!b || typeof b !== "object") return "Invalid request.";
  const pc = Number(b.pc);
  if (!comps) return "Unknown lab.";
  if (!Number.isInteger(pc) || !comps.some((c) => c.pc === pc)) return "Unknown computer for this lab.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date) || Number.isNaN(Date.parse(b.date))) return "Invalid date.";
  if (Date.parse(b.date) > Date.now() + 36 * 3600 * 1000) return "Date cannot be in the future.";
  if (!OS_OPTIONS.includes(b.os)) return "Invalid operating system.";
  if (!RAM_OPTIONS.includes(b.ram)) return "Invalid RAM size.";
  if (![b.formatted, b.liveServer, b.keyboard, b.mouse].every(isBool)) return "Please answer every question.";
  if (!b.software || !SOFTWARE.every(([k]) => isBool(b.software[k]))) return "Please answer every software question.";
  if (b.otherExtensions != null && (typeof b.otherExtensions !== "string" || b.otherExtensions.length > 200)) return "Other extensions is too long.";
  const ic = cleanIssues(b.issues, true); // [NEW]
  if (ic.error) return ic.error;          // [NEW]
  return null;
}

const tri = (v) => v === null || v === undefined || isBool(v);

/** Lenient check for unfinished (draft) inspections: every field is optional. */
export function sanitizeDraft(b) {
  if (!b || typeof b !== "object" || !b.data || typeof b.data !== "object") return { error: "Invalid draft." };
  const step = Number(b.step);
  if (!Number.isInteger(step) || step < 0 || step > WIZARD_STEPS - 1) return { error: "Invalid step." }; // [CHANGED]
  const d = b.data;
  if (d.date && (!/^\d{4}-\d{2}-\d{2}$/.test(d.date) || Number.isNaN(Date.parse(d.date)))) return { error: "Invalid date." };
  if (d.os && !OS_OPTIONS.includes(d.os)) return { error: "Invalid operating system." };
  if (d.ram && !RAM_OPTIONS.includes(d.ram)) return { error: "Invalid RAM size." };
  if (![d.formatted, d.liveServer, d.keyboard, d.mouse].every(tri)) return { error: "Invalid answer." };
  if (d.software != null && (typeof d.software !== "object" || !SOFTWARE.every(([k]) => tri(d.software[k])))) return { error: "Invalid software answer." };
  if (d.otherExtensions != null && (typeof d.otherExtensions !== "string" || d.otherExtensions.length > 200)) return { error: "Other extensions is too long." };
  const ic = cleanIssues(d.issues, false);        // [NEW]
  if (ic.error) return { error: ic.error };       // [NEW]
  return {
    step,
    data: {
      date: d.date || null, formatted: d.formatted ?? null, os: d.os || "", ram: d.ram || "",
      software: Object.fromEntries(SOFTWARE.map(([k]) => [k, d.software?.[k] ?? null])),
      liveServer: d.liveServer ?? null, otherExtensions: (d.otherExtensions || "").trim(),
      keyboard: d.keyboard ?? null, mouse: d.mouse ?? null, issues: ic.issues, // [CHANGED] issues added
    },
  };
}
