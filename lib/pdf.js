// [NEW FILE] PDF reports: one per lab, and one for all labs. Used by components/Tracker.jsx.
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { COMPUTERS, LAB_IDS, SEVERITIES, isHealthy, posOf, suggestionsOf } from "./layouts";

const BLUE = [37, 99, 235], GREEN = [21, 128, 61], RED = [185, 28, 28], GREY = [107, 114, 128];
const SEV = Object.fromEntries(SEVERITIES.map((s) => [s.key, s.label]));
const RANK = { minor: 1, major: 2, critical: 3 };
const WORST = ["Checklist", "Minor", "Major", "Critical"];
const worst = (r) => Math.max(0, ...(r.issues || []).map((i) => RANK[i.severity] || 0));

// PDF's built-in fonts only cover Latin-1: drop emoji / fancy quotes that would print as garbage
const t = (s) => String(s ?? "").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/[^\n\x20-\x7E\u00A0-\u00FF]/g, "");
const p2 = (n) => String(n).padStart(2, "0");
const dateStr = () => { const d = new Date(); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`; };
const stamp = (by) => { const d = new Date(); return `Generated ${dateStr()} ${p2(d.getHours())}:${p2(d.getMinutes())}${by ? ` by ${t(by)}` : ""}`; };

function analyse(lab, latest) {
  const rows = COMPUTERS[lab].map((c) => ({ c, r: latest[`${lab}-${c.pc}`] }));
  const done = rows.filter((x) => x.r);
  const bad = done.filter((x) => !isHealthy(x.r)).sort((a, b) => worst(b.r) - worst(a.r) || a.c.pc - b.c.pc);
  return { lab, rows, total: rows.length, inspected: done.length, ok: done.length - bad.length, bad, pending: rows.filter((x) => !x.r) };
}

function band(doc, title, sub) {
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(...BLUE); doc.rect(0, 0, w, 22, "F");
  doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.text(title, 14, 14);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.text(sub, w - 14, 14, { align: "right" });
  doc.setTextColor(30);
  return 32;
}
const ensure = (doc, y, need) => (y + need > doc.internal.pageSize.getHeight() - 15 ? (doc.addPage(), 20) : y);
function heading(doc, text, y) {
  y = ensure(doc, y, 30);
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(30); doc.text(text, 14, y);
  doc.setFont("helvetica", "normal");
  return y + 3;
}
function table(doc, y, opts) {
  autoTable(doc, {
    startY: y, theme: "grid", margin: { left: 14, right: 14 },
    styles: { fontSize: 8, cellPadding: 2, valign: "top", lineColor: [227, 230, 234] },
    headStyles: { fillColor: BLUE, textColor: 255 }, ...opts,
  });
  return doc.lastAutoTable.finalY + 8;
}
function stats(doc, y, s) {
  doc.setFontSize(10); doc.setTextColor(30);
  doc.text(`Computers: ${s.total}   |   Inspected: ${s.inspected}   |   All good: ${s.ok}   |   Need attention: ${s.bad}   |   Not inspected: ${s.pending}`, 14, y);
  return y + 8;
}

/** Problem -> how many computers -> recommended action */
function actionsTable(doc, y, datas, showLabs) {
  const m = new Map();
  for (const d of datas) for (const { r } of d.bad) for (const s of suggestionsOf(r)) {
    const e = m.get(s.label) || { label: s.label, fix: s.fix, n: 0, labs: new Set() };
    e.n++; e.labs.add(d.lab); m.set(s.label, e);
  }
  const list = [...m.values()].sort((a, b) => b.n - a.n);
  if (!list.length) return y;
  y = heading(doc, "Suggested actions summary", y);
  return table(doc, y, {
    head: [["Problem", "Computers", "Recommended action", ...(showLabs ? ["Labs"] : [])]],
    body: list.map((e) => [e.label, String(e.n), e.fix, ...(showLabs ? [[...e.labs].sort((a, b) => a - b).join(", ")] : [])]),
    columnStyles: showLabs
      ? { 0: { cellWidth: 38 }, 1: { cellWidth: 20 }, 2: { cellWidth: 94 }, 3: { cellWidth: 30 } }
      : { 0: { cellWidth: 40 }, 1: { cellWidth: 22 }, 2: { cellWidth: 120 } },
  });
}

function labBody(doc, d, y) {
  y = stats(doc, y, { total: d.total, inspected: d.inspected, ok: d.ok, bad: d.bad.length, pending: d.pending.length });

  if (d.bad.length) {
    y = heading(doc, `Computers needing attention (${d.bad.length})`, y);
    y = table(doc, y, {
      head: [["Computer", "Severity", "Problems and technician notes", "Suggested action", "Inspected"]],
      body: d.bad.map(({ c, r }) => {
        const s = suggestionsOf(r);
        return [
          posOf(d.lab, c.pc), WORST[worst(r)],
          s.map((x) => `- ${x.label}${x.severity ? ` [${SEV[x.severity]}]` : ""}${x.note ? `: ${t(x.note)}` : ""}`).join("\n"),
          s.map((x) => `- ${x.fix}`).join("\n"),
          `${r.date}\n${t(r.inspector)}`,
        ];
      }),
      columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: 18 }, 2: { cellWidth: 56 }, 3: { cellWidth: 56 }, 4: { cellWidth: 24 } },
    });
    y = actionsTable(doc, y, [d], false);
  } else {
    y = ensure(doc, y, 20);
    doc.setFontSize(10); doc.setTextColor(...GREEN); doc.text("No problems recorded in this lab.", 14, y); doc.setTextColor(30);
    y += 10;
  }

  y = heading(doc, "All computers", y);
  y = table(doc, y, {
    head: [["Computer", "Status", "Inspected on", "OS", "RAM", "Inspected by"]],
    body: d.rows.map(({ c, r }) => [
      posOf(d.lab, c.pc), !r ? "Not inspected" : isHealthy(r) ? "All good" : "Needs attention",
      r?.date || "-", r?.os || "-", r?.ram || "-", r ? t(r.inspector) : "-",
    ]),
    didParseCell: (h) => {
      if (h.section === "body" && h.column.index === 1) {
        h.cell.styles.fontStyle = "bold";
        h.cell.styles.textColor = h.cell.raw === "All good" ? GREEN : h.cell.raw === "Needs attention" ? RED : GREY;
      }
    },
  });

  if (d.pending.length) {
    y = heading(doc, `Not yet inspected (${d.pending.length})`, y);
    const lines = doc.splitTextToSize(d.pending.map(({ c }) => posOf(d.lab, c.pc)).join("; "), 182);
    doc.setFontSize(9); doc.text(lines, 14, y + 3);
    y += lines.length * 4 + 6;
  }
  return y;
}

function footer(doc) {
  const n = doc.getNumberOfPages(), w = doc.internal.pageSize.getWidth(), h = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i); doc.setFontSize(8); doc.setTextColor(...GREY);
    doc.text(`Computer Inspection Tracker  -  Page ${i} of ${n}`, w / 2, h - 8, { align: "center" });
  }
}

export function labPdf(lab, latest, meta = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const y = band(doc, `Lab ${lab} - Inspection report`, stamp(meta.by));
  labBody(doc, analyse(lab, latest), y);
  footer(doc);
  doc.save(`lab-${lab}-report-${dateStr()}.pdf`);
}

export function allLabsPdf(latest, meta = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const all = LAB_IDS.map((l) => analyse(l, latest));
  const sum = (f) => all.reduce((n, d) => n + f(d), 0);
  const tot = { total: sum((d) => d.total), inspected: sum((d) => d.inspected), ok: sum((d) => d.ok), bad: sum((d) => d.bad.length), pending: sum((d) => d.pending.length) };

  let y = band(doc, "All labs - Inspection report", stamp(meta.by));
  y = stats(doc, y, tot);
  y = heading(doc, "Progress by lab", y);
  y = table(doc, y, {
    head: [["Lab", "Computers", "Inspected", "All good", "Need attention", "Not inspected"]],
    body: all.map((d) => [`Lab ${d.lab}`, d.total, d.inspected, d.ok, d.bad.length, d.pending.length].map(String)),
    foot: [["Total", tot.total, tot.inspected, tot.ok, tot.bad, tot.pending].map(String)],
    footStyles: { fillColor: [243, 244, 246], textColor: 30 },
  });
  actionsTable(doc, y, all, true);

  for (const d of all) {
    doc.addPage();
    labBody(doc, d, band(doc, `Lab ${d.lab}`, stamp(meta.by)));
  }
  footer(doc);
  doc.save(`all-labs-report-${dateStr()}.pdf`);
}
