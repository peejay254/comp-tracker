import { COMPUTERS, OS_OPTIONS, RAM_OPTIONS, SOFTWARE } from "./layouts";

const isBool = (v) => typeof v === "boolean";

/** Returns an error message, or null when the inspection is valid. */
export function validateInspection(b) {
  if (!b || typeof b !== "object") return "Invalid request.";
  const lab = Number(b.lab), pc = Number(b.pc);
  if (!COMPUTERS[lab]) return "Unknown lab.";
  if (!Number.isInteger(pc) || pc < 1 || pc > COMPUTERS[lab].length) return "Unknown computer for this lab.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date) || Number.isNaN(Date.parse(b.date))) return "Invalid date.";
  if (Date.parse(b.date) > Date.now() + 36 * 3600 * 1000) return "Date cannot be in the future.";
  if (!OS_OPTIONS.includes(b.os)) return "Invalid operating system.";
  if (!RAM_OPTIONS.includes(b.ram)) return "Invalid RAM size.";
  if (![b.formatted, b.liveServer, b.keyboard, b.mouse].every(isBool)) return "Please answer every question.";
  if (!b.software || !SOFTWARE.every(([k]) => isBool(b.software[k]))) return "Please answer every software question.";
  if (b.otherExtensions != null && (typeof b.otherExtensions !== "string" || b.otherExtensions.length > 200)) return "Other extensions is too long.";
  return null;
}

const tri = (v) => v === null || v === undefined || isBool(v);

/** Lenient check for unfinished (draft) inspections: every field is optional. */
export function sanitizeDraft(b) {
  if (!b || typeof b !== "object" || !b.data || typeof b.data !== "object") return { error: "Invalid draft." };
  const step = Number(b.step);
  if (!Number.isInteger(step) || step < 0 || step > 4) return { error: "Invalid step." };
  const d = b.data;
  if (d.date && (!/^\d{4}-\d{2}-\d{2}$/.test(d.date) || Number.isNaN(Date.parse(d.date)))) return { error: "Invalid date." };
  if (d.os && !OS_OPTIONS.includes(d.os)) return { error: "Invalid operating system." };
  if (d.ram && !RAM_OPTIONS.includes(d.ram)) return { error: "Invalid RAM size." };
  if (![d.formatted, d.liveServer, d.keyboard, d.mouse].every(tri)) return { error: "Invalid answer." };
  if (d.software != null && (typeof d.software !== "object" || !SOFTWARE.every(([k]) => tri(d.software[k])))) return { error: "Invalid software answer." };
  if (d.otherExtensions != null && (typeof d.otherExtensions !== "string" || d.otherExtensions.length > 200)) return { error: "Other extensions is too long." };
  return {
    step,
    data: {
      date: d.date || null, formatted: d.formatted ?? null, os: d.os || "", ram: d.ram || "",
      software: Object.fromEntries(SOFTWARE.map(([k]) => [k, d.software?.[k] ?? null])),
      liveServer: d.liveServer ?? null, otherExtensions: (d.otherExtensions || "").trim(),
      keyboard: d.keyboard ?? null, mouse: d.mouse ?? null,
    },
  };
}
