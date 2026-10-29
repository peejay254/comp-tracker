// Shared by the browser and the server: lab floor plans and form options.
export const LAB_IDS = Array.from({ length: 10 }, (_, i) => i + 1); // Lab 1..Lab 10
/* Floor plans, seen from the BACK of the lab looking toward the screen.
   Row 1 is nearest the screen; columns count left to right. */
export const LAYOUTS = {
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
// Fixed numbering (used for storage): section by section, row by row, left to right.
export const COMPUTERS = Object.fromEntries(Object.entries(LAYOUTS).map(([lab, secs]) => {
  let n = 0;
  const list = [];
  secs.forEach((sec, si) => {
    for (let row = 1; row <= sec.rows; row++)
      for (let col = 1; col <= sec.cols; col++) list.push({ pc: ++n, section: si, name: sec.name, row, col });
  });
  return [lab, list];
}));
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

