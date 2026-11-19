// [UPDATED FILE] [v3 CHANGED] The floor plans are no longer hard-coded: see DEFAULT_LAYOUTS ... applyLayouts() below.
// The "Challenges" section at the end is from the previous update.
// Shared by the browser and the server: lab floor plans and form options.
export const LAB_IDS = Array.from({ length: 10 }, (_, i) => i + 1); // Lab 1..Lab 10
/* Floor plans, seen from the BACK of the lab looking toward the screen.
   Row 1 is nearest the screen; columns count left to right. */
/* [v3 CHANGED] DEFAULT floor plans, used until an admin edits a lab. The live plans are stored in MongoDB
   (collection "labs") and loaded into LAYOUTS / COMPUTERS by applyLayouts() (below).
   Seen from the BACK of the lab looking toward the screen. Row 1 is nearest the screen; columns count left to right. */
export const DEFAULT_LAYOUTS = {
  1: [{ name: "Left", rows: 3, cols: 3 }, { name: "Right", rows: 3, cols: 4 }],
  2: [{ rows: 3, cols: 4 }],
  3: [{ rows: 3, cols: 4 }],
  4: [{ rows: 3, cols: 4 }],
  5: [{ name: "Left", rows: 3, cols: 4 }, { name: "Right", rows: 3, cols: 3 }],
  6: [{ rows: 4, cols: 4 }],
  7: [{ rows: 3, cols: 4 }],
  8: [{ rows: 3, cols: 4 }],
  9: [{ rows: 3, cols: 4 }],
  10: [{ rows: 2, cols: 4 }],
};

/* [v3 NEW] Stored shape of a lab: { sections: [{ name, cols, pcs: [computerNumber, ...] }], nextPc }
   A computer's position is its place in `pcs` (filled row by row, left to right, `cols` per row).
   Computer numbers never change, so inspection data follows the computer when it is moved. */
export const defaultLab = (lab) => {
  let n = 0;
  const sections = DEFAULT_LAYOUTS[lab].map((s) => ({ name: s.name || "", cols: s.cols, pcs: Array.from({ length: s.rows * s.cols }, () => ++n) }));
  return { sections, nextPc: n + 1 };
};
export const buildComputers = (sections) => {
  const list = [];
  sections.forEach((sec, si) => sec.pcs.forEach((pc, i) =>
    list.push({ pc, section: si, name: sec.name || undefined, row: Math.floor(i / sec.cols) + 1, col: (i % sec.cols) + 1 })));
  return list;
};
export const LAYOUTS = {};   // lab -> [{ name, cols, rows, pcs }]   (filled by applyLayouts)
export const COMPUTERS = {}; // lab -> [{ pc, section, name, row, col }] in display order
/** Replace the live floor plans with the ones loaded from the server (browser) - missing labs use the defaults. */
export function applyLayouts(data) {
  for (const lab of LAB_IDS) {
    const sections = data?.[lab]?.sections || defaultLab(lab).sections;
    LAYOUTS[lab] = sections.map((s) => ({ name: s.name || undefined, cols: s.cols, rows: Math.ceil(s.pcs.length / s.cols), pcs: s.pcs }));
    COMPUTERS[lab] = buildComputers(sections);
  }
}
applyLayouts();
export const posOf = (lab, pc) => {
  const c = COMPUTERS[lab]?.find((x) => x.pc === pc);
  if (!c) return `Computer ${pc}`;
  return `${c.name ? c.name + " section · " : ""}Row ${c.row}, Col ${c.col}`;
};
export const layoutText = (lab) => LAYOUTS[lab].map((s) => `${s.rows}×${s.cols}`).join(" + ");
export const OS_OPTIONS = ["Linux Mint", "Windows"];
export const RAM_OPTIONS = ["2 GB", "4 GB", "6 GB", "8 GB", "12 GB", "16 GB"];
export const SOFTWARE = [
  ["vscode", "VS Code"],
  ["chrome", "Google Chrome"],
  ["xampp", "XAMPP"],
  ["insomnia", "Insomnia"],
];
export const today = () => new Date().toISOString().slice(0, 10);

/* ================= [NEW] Challenges found during an inspection ================= */
export const ISSUE_TYPES = [
  { key: "psu", label: "Power supply", icon: "🔌", fix: "Test with a known-good PSU and check the power cable and socket; replace the power supply if the machine will not power on.",
    quick: ["Does not power on at all", "Switches off by itself", "Fan spins but no display"] },
  { key: "grub", label: "GRUB / boot problem", icon: "🥾", fix: "Boot from a Linux live USB and repair GRUB (Boot-Repair or grub-install); check the boot order in BIOS. Reinstall the OS if the repair fails.",
    quick: ["Stuck at the grub rescue prompt", "OS missing from the boot menu", "“No bootable device” message"] },
  { key: "ram", label: "RAM problem", icon: "🧠", fix: "Reseat the modules and test one stick at a time (MemTest86). Replace faulty RAM, or add more if capacity is too low.",
    quick: ["Beeps on startup", "Random freezes or crashes", "Only part of the RAM is detected"] },
  { key: "disk", label: "Hard disk problem", icon: "💾", fix: "Check SMART status and the SATA/power cables. Back up data, then replace the disk if it has bad sectors or is not detected.",
    quick: ["Disk not detected in BIOS", "Clicking noise", "Very slow / bad sectors"] },
  { key: "mobo", label: "Motherboard", icon: "🔧", fix: "Inspect for swollen capacitors or burn marks and reset CMOS. Replace the motherboard if the fault persists.",
    quick: ["No POST / no beep", "Swollen capacitors"] },
  { key: "cpu", label: "CPU / overheating", icon: "🔥", fix: "Clean the dust, reapply thermal paste and check the CPU fan; replace the cooler or fan if temperatures stay high.",
    quick: ["Overheats and shuts down", "Fan very loud or not spinning"] },
  { key: "display", label: "Monitor / display", icon: "🖥️", fix: "Check the video cable and port and try another monitor; replace the cable or monitor if needed.",
    quick: ["No signal", "Flickering screen", "Cable or port damaged"] },
  { key: "network", label: "Network / LAN", icon: "🌐", fix: "Check the cable, switch port and link lights; replace the cable or network card if there is no link.", quick: [] },
  { key: "os", label: "OS install failure", icon: "💿", fix: "Re-create the install USB and reinstall; test the disk and RAM first if the install keeps failing.",
    quick: ["Installation fails midway", "Will not boot after install"] },
  { key: "bios", label: "CMOS battery / BIOS", icon: "🔋", fix: "Replace the CMOS battery (CR2032), then reset the BIOS date, time and settings.", quick: [] },
  { key: "usb", label: "USB / ports", icon: "🔌", fix: "Try other ports and check the front-panel header; repair or replace faulty ports or cables.", quick: [] },
  { key: "other", label: "Other", icon: "📝", fix: "Review the technician's notes and decide on the repair.", quick: [] },
];
export const ISSUE_MAP = Object.fromEntries(ISSUE_TYPES.map((t) => [t.key, t]));
export const SEVERITIES = [
  { key: "minor", label: "Minor", desc: "Still usable" },
  { key: "major", label: "Major", desc: "Limited use" },
  { key: "critical", label: "Critical", desc: "Unusable" },
];
export const WIZARD_STEPS = 6; // Basics, System, Software, Hardware, Challenges, Review

/** Every problem on a record (checklist failures + recorded challenges) with a suggested fix. */
export const suggestionsOf = (r) => {
  const out = [];
  const add = (label, fix, extra = {}) => out.push({ label, fix, ...extra });
  if (!r.formatted) add("Not formatted", "Back up any needed data, then format and reinstall the standard OS image.");
  SOFTWARE.forEach(([k, n]) => { if (!r.software?.[k]) add(`${n} missing`, `Install ${n}.`); });
  if (!r.liveServer) add("Live Server missing", "Install the Live Server extension in VS Code.");
  if (!r.keyboard) add("Keyboard faulty", "Try another USB port; replace the keyboard if it is still faulty.");
  if (!r.mouse) add("Mouse faulty", "Try another USB port; replace the mouse if it is still faulty.");
  (r.issues || []).forEach((i) => { const t = ISSUE_MAP[i.type]; if (t) add(t.label, t.fix, { severity: i.severity, note: i.note }); });
  return out;
};
export const problemsOf = (r) => suggestionsOf(r).map((s) => s.label);
export const isHealthy = (r) => problemsOf(r).length === 0;
