"use client";
import { useCallback, useEffect, useMemo, useState } from "react";

/* ---------- Config ---------- */
import { LAB_IDS, LAYOUTS, COMPUTERS, posOf, layoutText, OS_OPTIONS, RAM_OPTIONS, SOFTWARE, today } from "@/lib/layouts";

/* ---------- API client (session cookie is httpOnly; the server is the single source of truth) ---------- */
async function request(method, path, body) {
  let res;
  try {
    res = await fetch(`/api${path}`, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  } catch { throw new Error("Cannot reach the server. Check your connection."); }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) { location.href = "/login"; throw new Error("Session expired."); }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}
const api = { get: (p) => request("GET", p), post: (p, b) => request("POST", p, b), put: (p, b) => request("PUT", p, b), del: (p) => request("DELETE", p) };

const blankForm = () => ({
  date: today(),
  formatted: null,
  os: "",
  ram: "",
  software: { vscode: null, chrome: null, xampp: null, insomnia: null },
  liveServer: null,
  otherExtensions: "",
  keyboard: null,
  mouse: null,
});

const isComplete = (r) =>
  r.formatted !== null && r.os.trim() && r.ram.trim() &&
  Object.values(r.software).every((v) => v !== null) &&
  r.liveServer !== null && r.keyboard !== null && r.mouse !== null;

const isHealthy = (r) =>
  r.formatted && Object.values(r.software).every(Boolean) &&
  r.liveServer && r.keyboard && r.mouse;

const problemsOf = (r) => [
  !r.formatted && "Not formatted",
  ...SOFTWARE.filter(([k]) => !r.software[k]).map(([, n]) => `${n} missing`),
  !r.liveServer && "Live Server missing",
  !r.keyboard && "Keyboard faulty",
  !r.mouse && "Mouse faulty",
].filter(Boolean);

const shortPos = (lab, pc) => {
  const c = COMPUTERS[lab]?.find((x) => x.pc === pc);
  return c ? `${c.name ? c.name + " " : ""}R${c.row}·C${c.col}` : `#${pc}`;
};

/* ---------- Small components ---------- */
function YesNo({ label, value, onChange, name }) {
  return (
    <fieldset className="q">
      <legend>{label}</legend>
      {[true, false].map((opt) => (
        <label key={String(opt)} className={"pill" + (value === opt ? (opt ? " on-yes" : " on-no") : "")}>
          <input type="radio" name={name} checked={value === opt} onChange={() => onChange(opt)} />
          {opt ? "Yes" : "No"}
        </label>
      ))}
    </fieldset>
  );
}

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="btn ghost" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const STEPS = ["Basics", "System", "Software", "Hardware", "Review"];
const HINTS = [
  "Choose the date you did the inspection. “Formatted” means the computer was wiped and reinstalled.",
  "Windows: right-click Start → System. Linux Mint: Menu → System Info. RAM is shown there too.",
  "Look for each program in the Start menu / application menu. Pick Yes only if it opens.",
  "Test them: type something and move the mouse. Choose No if either one is faulty or missing.",
  "Check every answer. You can go back to change anything before saving.",
];

function InspectionForm({ lab, pc, initial, initialStep, banner, who, onSave, onCancel, onDraft }) {
  const [f, setF] = useState(initial);
  const [step, setStep] = useState(initialStep || 0);
  const [touched, setTouched] = useState(false);
  const set = (patch) => setF((p) => ({ ...p, ...patch }));
  const sw = Object.values(f.software);

  const valid = [
    !!f.date && f.formatted !== null,
    !!f.os && !!f.ram,
    sw.every((v) => v !== null) && f.liveServer !== null,
    f.keyboard !== null && f.mouse !== null,
    true,
  ];

  const go = (n) => { setTouched(false); setStep(n); };
  const submit = (e) => {
    e.preventDefault();
    if (!valid[step]) return setTouched(true);
    if (step < STEPS.length - 1) { onDraft(f, step + 1, false); return go(step + 1); } // progress is auto-saved
    if (isComplete(f)) onSave(f);
  };

  const review = [
    ["Date", f.date], ["Formatted", yn(f.formatted)], ["Operating system", f.os], ["RAM", f.ram],
    ...SOFTWARE.map(([k, n]) => [n, yn(f.software[k])]),
    ["Live Server", yn(f.liveServer)], ["Other extensions", f.otherExtensions || "None"],
    ["Keyboard", yn(f.keyboard)], ["Mouse", yn(f.mouse)],
  ];

  return (
    <form onSubmit={submit} className="form wiz" noValidate>
      <div className="steps" aria-hidden="true">{STEPS.map((_, i) => <i key={i} className={i <= step ? "done" : ""} />)}</div>
      <p className="step-label">Step {step + 1} of {STEPS.length} · <b>{STEPS[step]}</b></p>
      {banner && <p className="draft-note">✎ {banner}</p>}
      <p className="hint">{HINTS[step]}</p>

      <div className="step-body">
        {step === 0 && (<>
          <label className="q">Inspection date
            <input type="date" value={f.date} max={today()} onChange={(e) => set({ date: e.target.value })} required />
          </label>
          <YesNo name="fmt" label="Has the computer been formatted?" value={f.formatted} onChange={(v) => set({ formatted: v })} />
        </>)}

        {step === 1 && (<>
          <label className="q">Operating system installed
            <select value={f.os} onChange={(e) => set({ os: e.target.value })}>
              <option value="">Select operating system…</option>
              {OS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>
          <label className="q">RAM size
            <select value={f.ram} onChange={(e) => set({ ram: e.target.value })}>
              <option value="">Select RAM size…</option>
              {RAM_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>
        </>)}

        {step === 2 && (<>
          <div className="grid2">
            {SOFTWARE.map(([key, name]) => (
              <YesNo key={key} name={key} label={`${name} installed?`} value={f.software[key]}
                onChange={(v) => set({ software: { ...f.software, [key]: v } })} />
            ))}
            <YesNo name="ls" label="VS Code Live Server?" value={f.liveServer} onChange={(v) => set({ liveServer: v })} />
          </div>
          <label className="q">Other VS Code extensions <span className="muted">(optional)</span>
            <input value={f.otherExtensions} placeholder="e.g. Prettier, ESLint" onChange={(e) => set({ otherExtensions: e.target.value })} />
          </label>
        </>)}

        {step === 3 && (<>
          <YesNo name="kb" label="Is the keyboard working?" value={f.keyboard} onChange={(v) => set({ keyboard: v })} />
          <YesNo name="ms" label="Is the mouse working?" value={f.mouse} onChange={(v) => set({ mouse: v })} />
        </>)}

        {step === 4 && (<>
          <p className="accountable">🔒 This inspection will be recorded under <b>{who}</b>, with the date and time you press Save.</p>
          <dl className="review">
            {review.map(([k, v]) => (<div key={k}><dt>{k}</dt><dd className={v === "No" ? "neg" : ""}>{v}</dd></div>))}
          </dl></>
        )}
      </div>

      {touched && !valid[step] && <p className="error" role="alert">Please answer every question on this step to continue.</p>}

      <div className="actions between">
        <button type="button" className="btn" onClick={() => (step === 0 ? onCancel() : go(step - 1))}>{step === 0 ? "Cancel" : "← Back"}</button>
        {step < STEPS.length - 1 && <button type="button" className="btn" onClick={() => onDraft(f, step, true)}>Save &amp; finish later</button>}
        <button type="submit" className="btn primary">{step === STEPS.length - 1 ? "Save inspection" : "Next →"}</button>
      </div>
    </form>
  );
}

const Badge = ({ rec }) =>
  !rec ? <span className="badge none">Not inspected</span>
  : isHealthy(rec) ? <span className="badge ok">All good</span>
  : <span className="badge bad">Needs attention</span>;

const yn = (v) => (v ? "Yes" : "No");

function FloorPlan({ lab, latest, draftMap, filter, sel, onSelect }) {
  const layout = LAYOUTS[lab];
  const comps = COMPUTERS[lab];
  const statusOf = (pc) => { const r = latest[`${lab}-${pc}`]; return !r ? "none" : isHealthy(r) ? "ok" : "bad"; };
  const matches = (pc) => filter === "all" || (filter === "none" && statusOf(pc) === "none") || (filter.startsWith("by:") && latest[`${lab}-${pc}`]?.inspector === filter.slice(3)) || (filter === "issues" && statusOf(pc) === "bad") || (filter === "draft" && !!draftMap[`${lab}-${pc}`]);
  return (
    <div className="room">
      <div className="screen">FRONT · SCREEN</div>
      <div className="sections">
        {layout.map((sec, si) => (
          <div key={si} className="section-wrap" style={{ display: "contents" }}>
            {si > 0 && <div className="walkway"><span>WALKWAY</span></div>}
            <div className="section" style={{ flex: sec.cols }}>
              {sec.name && <div className="sec-name">{sec.name} section</div>}
              <div className="pcs" style={{ gridTemplateColumns: `repeat(${sec.cols}, minmax(0, 1fr))` }}>
                {comps.filter((c) => c.section === si).map((c) => (
                  <button key={c.pc} type="button" onClick={() => onSelect(c.pc)}
                    title={(() => { const r = latest[`${lab}-${c.pc}`]; return `${posOf(lab, c.pc)} — ${r ? `[${r.inspector}, ${r.date}] ` : ""}${!r ? "Not inspected" : isHealthy(r) ? "All good" : problemsOf(r).join(", ")}`; })()}
                    aria-label={`${posOf(lab, c.pc)}, ${{ none: "not inspected", ok: "all good", bad: "needs attention" }[statusOf(c.pc)]}`}
                    className={`pc ${statusOf(c.pc)}${sel === c.pc ? " sel" : ""}${matches(c.pc) ? "" : " dim"}${draftMap[`${lab}-${c.pc}`] ? " has-draft" : ""}`}>
                    <span className="pc-icon" aria-hidden="true">🖥️</span>
                    <span className="pc-pos">R{c.row}·C{c.col}</span>
                    {latest[`${lab}-${c.pc}`] && <span className="pc-by" aria-hidden="true">{initials(latest[`${lab}-${c.pc}`].inspector)}</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="back">BACK OF LAB</div>
      <div className="legend">
        <span><i className="d none" />Not inspected</span><span><i className="d ok" />All good</span><span><i className="d bad" />Needs attention</span><span><i className="d draft" />✎ Draft in progress</span>
      </div>
      <p className="muted orient">View from the back of the lab, facing the screen. Row 1 is nearest the screen; columns count from the left. R = row, C = column.</p>
    </div>
  );
}

const pick = (f) => ({ date: f.date, formatted: f.formatted, os: f.os, ram: f.ram, software: f.software,
  liveServer: f.liveServer, otherExtensions: f.otherExtensions, keyboard: f.keyboard, mouse: f.mouse });

function MiniPlan({ lab, latest }) {
  return (
    <div className="mini" aria-hidden="true">
      {LAYOUTS[lab].map((sec, si) => (
        <div key={si} className="mini-sec" style={{ gridTemplateColumns: `repeat(${sec.cols}, 1fr)`, flex: sec.cols }}>
          {COMPUTERS[lab].filter((c) => c.section === si).map((c) => {
            const r = latest[`${lab}-${c.pc}`];
            return <i key={c.pc} className={r ? (isHealthy(r) ? "ok" : "bad") : "none"} />;
          })}
        </div>
      ))}
    </div>
  );
}

const initials = (n = "") => n.split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
const ago = (iso) => {
  const m = Math.round((Date.now() - new Date(iso)) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} h ago` : new Date(iso).toLocaleDateString();
};

function Welcome({ user, records, drafts, latest, onInspect }) {
  const [hide, setHide] = useState(() => { try { return localStorage.getItem("guide:hidden") === "1"; } catch { return false; } });
  const canEdit = user.role !== "viewer";
  const mine = records.filter((r) => r.inspector === user.name);
  const day = new Date().toISOString().slice(0, 10);
  const mineToday = mine.filter((r) => r.createdAt?.slice(0, 10) === day).length;
  const myDraft = drafts.find((d) => d.inspector === user.name);
  let next = null;
  for (const lab of LAB_IDS) {
    const c = COMPUTERS[lab].find((x) => !latest[`${lab}-${x.pc}`]);
    if (c) { next = { lab, pc: c.pc }; break; }
  }
  const dismiss = () => { setHide(true); try { localStorage.setItem("guide:hidden", "1"); } catch {} };
  return (
    <section className="welcome">
      <div className="welcome-top">
        <div>
          <h2>Hello, {user.name.split(" ")[0]} 👋</h2>
          <p className="muted">{canEdit
            ? `You have recorded ${mine.length} inspection${mine.length === 1 ? "" : "s"} so far (${mineToday} today). Every inspection is saved under your name.`
            : "You have read-only access. Open the Management report to see progress, problems and who inspected what."}</p>
        </div>
        {canEdit && (
          <div className="actions">
            {myDraft && <button className="btn primary" onClick={() => onInspect(myDraft.lab, myDraft.pc)}>✎ Continue my draft · Lab {myDraft.lab}, {shortPos(myDraft.lab, myDraft.pc)}</button>}
            {next && <button className={"btn" + (myDraft ? "" : " primary")} onClick={() => onInspect(next.lab, next.pc)}>Start next inspection · Lab {next.lab}</button>}
          </div>
        )}
      </div>
      {canEdit && !hide && (
        <div className="guide">
          <ol>
            <li><b>Pick a lab</b> below.</li>
            <li><b>Tap a computer</b> on the floor plan — it matches where it sits in the room.</li>
            <li><b>Answer 5 short steps.</b> You can press “Save &amp; finish later” at any time.</li>
          </ol>
          <button className="btn ghost sm" onClick={dismiss}>Got it — hide this guide</button>
        </div>
      )}
    </section>
  );
}

function AccountabilitySection({ records }) {
  const by = {};
  records.forEach((r) => {
    const x = (by[r.inspector] ||= { name: r.inspector, count: 0, pcs: new Set(), labs: new Set(), issues: 0, last: "" });
    x.count++; x.pcs.add(`${r.lab}-${r.pc}`); x.labs.add(r.lab);
    if (!isHealthy(r)) x.issues++;
    if ((r.createdAt || "") > x.last) x.last = r.createdAt;
  });
  const rows = Object.values(by).sort((a, b) => b.count - a.count);
  return (
    <>
      <h3>Who inspected what</h3>
      {rows.length ? (
        <div className="table-wrap"><table>
          <thead><tr><th>Inspector</th><th>Inspections</th><th>Computers covered</th><th>Labs</th><th>Problems found</th><th>Last activity</th></tr></thead>
          <tbody>{rows.map((x) => (
            <tr key={x.name}>
              <td><span className="avatar">{initials(x.name)}</span> <b>{x.name}</b></td>
              <td>{x.count}</td><td>{x.pcs.size}</td><td>{[...x.labs].sort((a, b) => a - b).join(", ")}</td>
              <td className={x.issues ? "warn" : ""}>{x.issues}</td><td>{x.last ? ago(x.last) : "—"}</td>
            </tr>))}</tbody>
        </table></div>
      ) : <p className="muted">No inspections recorded yet.</p>}
    </>
  );
}

function ActivityLog() {
  const [ev, setEv] = useState(null);
  useEffect(() => { api.get("/activity").then(setEv).catch(() => setEv([])); }, []);
  return (
    <>
      <h3>Recent activity</h3>
      {ev === null ? <p className="muted">Loading…</p> : ev.length ? (
        <ul className="activity">{ev.map((e, i) => (
          <li key={i}>
            {e.type === "inspected"
              ? <><b>{e.who}</b> inspected Lab {e.lab} · {posOf(e.lab, e.pc)} <span className={"badge " + (e.ok ? "ok" : "bad")}>{e.ok ? "All good" : "Needs attention"}</span></>
              : <>🗑 <b>{e.who}</b> deleted {e.by === e.who ? "their own" : `${e.by}’s`} inspection of Lab {e.lab} · {posOf(e.lab, e.pc)}</>}
            <span className="muted"> · {ago(e.at)}</span>
          </li>))}</ul>
      ) : <p className="muted">No activity yet.</p>}
    </>
  );
}

function Report({ latest, onOpen, drafts, records }) {
  const rows = LAB_IDS.map((lab) => {
    const issues = [], pending = [];
    let ok = 0;
    COMPUTERS[lab].forEach((c) => {
      const r = latest[`${lab}-${c.pc}`];
      if (!r) pending.push(c);
      else if (isHealthy(r)) ok++;
      else issues.push({ lab, c, r });
    });
    const total = COMPUTERS[lab].length;
    return { lab, total, ok, issues, pending, inspected: total - pending.length };
  });
  const sum = (k) => rows.reduce((t, r) => t + (typeof r[k] === "number" ? r[k] : r[k].length), 0);
  const total = sum("total"), inspected = sum("inspected"), ok = sum("ok"), bad = sum("issues"), pend = sum("pending");
  const attention = rows.flatMap((r) => r.issues);
  const counts = {};
  attention.forEach(({ r }) => problemsOf(r).forEach((p) => (counts[p] = (counts[p] || 0) + 1)));
  const tally = (key) => {
    const m = {};
    rows.forEach((x) => COMPUTERS[x.lab].forEach((c) => { const r = latest[`${x.lab}-${c.pc}`]; if (r?.[key]) m[r[key]] = (m[r[key]] || 0) + 1; }));
    return Object.entries(m);
  };
  const pct = total ? Math.round((inspected / total) * 100) : 0;

  return (
    <div className="report">
      <div className="report-head">
        <div><h2>Management summary</h2><p className="muted">Generated {new Date().toLocaleString()} · based on the latest inspection of each computer</p></div>
        <button className="btn primary" onClick={() => window.print()}>Print / Save as PDF</button>
      </div>

      <section className="stats five">
        <div><b>{total}</b><span>Computers</span></div>
        <div><b>{inspected}</b><span>Inspected ({pct}%)</span></div>
        <div><b className="okc">{ok}</b><span>All good</span></div>
        <div><b className="warn">{bad}</b><span>Need attention</span></div>
        <div><b>{pend}</b><span>Not yet inspected</span></div>
      </section>

      <h3>Progress by lab</h3>
      <div className="table-wrap"><table>
        <thead><tr><th>Lab</th><th>Plan</th><th>Inspected</th><th>All good</th><th>Issues</th><th>Pending</th><th></th></tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.lab}>
            <td><b>Lab {r.lab}</b></td>
            <td className="plan-cell"><MiniPlan lab={r.lab} latest={latest} /></td>
            <td>{r.inspected}/{r.total}<div className="bar"><i style={{ width: `${(r.inspected / r.total) * 100}%` }} /></div></td>
            <td>{r.ok}</td><td className={r.issues.length ? "warn" : ""}>{r.issues.length}</td><td>{r.pending.length}</td>
            <td className="right"><button className="btn sm" onClick={() => onOpen(r.lab, null)}>Open plan</button></td>
          </tr>))}</tbody>
      </table></div>

      <AccountabilitySection records={records} />
      <ActivityLog />

      <h3>Computers needing attention ({attention.length})</h3>
      {attention.length ? (
        <div className="table-wrap"><table>
          <thead><tr><th>Lab</th><th>Computer</th><th>Problems found</th><th>Inspected</th><th></th></tr></thead>
          <tbody>{attention.map(({ lab, c, r }) => (
            <tr key={`${lab}-${c.pc}`}>
              <td>Lab {lab}</td><td>{posOf(lab, c.pc)}</td>
              <td>{problemsOf(r).map((p) => <span key={p} className="chip bad">{p}</span>)}</td>
              <td>{r.date}</td>
              <td className="right"><button className="btn sm" onClick={() => onOpen(lab, c.pc)}>Locate</button></td>
            </tr>))}</tbody>
        </table></div>
      ) : <p className="muted">No problems recorded. 🎉</p>}

      <div className="cols2">
        <div>
          <h3>Common problems</h3>
          {Object.keys(counts).length ? Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, n]) => (
            <div key={k} className="stat-row"><span>{k}</span><b>{n}</b></div>)) : <p className="muted">None.</p>}
        </div>
        <div>
          <h3>Operating systems &amp; RAM</h3>
          {[...tally("os"), ...tally("ram")].map(([k, n]) => <div key={k} className="stat-row"><span>{k}</span><b>{n}</b></div>)}
          {!inspected && <p className="muted">No data yet.</p>}
        </div>
      </div>

      <h3>Inspections in progress ({drafts.length})</h3>
      {drafts.length ? drafts.map((d) => (
        <div key={d.id} className="pending-row">
          <b>Lab {d.lab}</b> <button className="chip" onClick={() => onOpen(d.lab, d.pc)}>{shortPos(d.lab, d.pc)}</button>
          <span className="muted"> step {d.step + 1} of 5 · {d.inspector} · {new Date(d.updatedAt).toLocaleString()}</span>
        </div>)) : <p className="muted">No unfinished inspections.</p>}

      <h3>Not yet inspected</h3>
      {rows.filter((r) => r.pending.length).length ? rows.filter((r) => r.pending.length).map((r) => (
        <div key={r.lab} className="pending-row">
          <b>Lab {r.lab}</b> <span className="muted">({r.pending.length})</span>
          <div>{r.pending.map((c) => <button key={c.pc} className="chip" onClick={() => onOpen(r.lab, c.pc)}>{shortPos(r.lab, c.pc)}</button>)}</div>
        </div>)) : <p className="muted">Every computer has been inspected. 🎉</p>}
    </div>
  );
}

const download = (content, name, type) => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
};

function AccountModal({ onClose, notify }) {
  const [f, setF] = useState({ current: "", next: "", confirm: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    if (f.next !== f.confirm) return setErr("New passwords do not match.");
    setBusy(true); setErr("");
    try { await api.post("/auth/password", { current: f.current, next: f.next }); notify("Password changed"); onClose(); }
    catch (x) { setErr(x.message); }
    setBusy(false);
  };
  return (
    <Modal title="Change password" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label>Current password<input type="password" value={f.current} onChange={set("current")} autoComplete="current-password" required /></label>
        <label>New password (at least 10 characters)<input type="password" value={f.next} onChange={set("next")} autoComplete="new-password" minLength={10} required /></label>
        <label>Confirm new password<input type="password" value={f.confirm} onChange={set("confirm")} autoComplete="new-password" required /></label>
        {err && <p className="error" role="alert">{err}</p>}
        <div className="actions"><button type="button" className="btn" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy}>Save</button></div>
      </form>
    </Modal>
  );
}

/* ---------- App ---------- */
export default function Tracker({ user }) {
  const [account, setAccount] = useState(false);
  const [records, setRecords] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [syncErr, setSyncErr] = useState(false);
  const [syncedAt, setSyncedAt] = useState(null);
  const sync = useCallback(async () => {
    try { const [recs, drs] = await Promise.all([api.get("/inspections"), api.get("/drafts")]); setRecords(recs); setDrafts(drs); setSyncErr(false); setSyncedAt(new Date()); }
    catch { setSyncErr(true); }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!user) return;
    sync();
    const t = setInterval(sync, 15000); // everyone sees each other's work within ~15 seconds
    const onVisible = () => document.visibilityState === "visible" && sync();
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onVisible); };
  }, [user, sync]);
  const logout = async () => { await fetch("/api/auth/logout", { method: "POST" }); location.href = "/login"; };
  const [lab, setLab] = useState(null); // selected lab id or null (dashboard)
  const [form, setForm] = useState(null); // {lab, pc}
  const [history, setHistory] = useState(null); // {lab, pc}
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState("map"); // "map" | "list"
  const [page, setPage] = useState("labs"); // "labs" | "report"
  const readOnly = user.role === "viewer"; // enforced by the server too
  const openComputer = (l, pc) => { setPage("labs"); setLab(l); setView("map"); setFilter("all"); setSel(pc); };
  const [sel, setSel] = useState(null); // selected computer number
  const [toast, setToast] = useState(null);
  const [ask, setAsk] = useState(null); // {title, text, action, onYes}
  const notify = (msg, type = "ok") => setToast({ msg, type, id: Date.now() });
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);


  const sizeOf = (l) => COMPUTERS[l].length;

  // Latest inspection per computer, keyed "lab-pc"
  const latest = useMemo(() => {
    const map = {};
    [...records].sort((a, b) => (a.date + a.createdAt).localeCompare(b.date + b.createdAt))
      .forEach((r) => (map[`${r.lab}-${r.pc}`] = r));
    return map;
  }, [records]);

  const draftMap = useMemo(() => Object.fromEntries(drafts.map((d) => [d.id, d])), [drafts]);

  const labStats = (l) => {
    let inspected = 0, issues = 0;
    for (let pc = 1; pc <= sizeOf(l); pc++) {
      const r = latest[`${l}-${pc}`];
      if (r) { inspected++; if (!isHealthy(r)) issues++; }
    }
    return { total: sizeOf(l), inspected, issues };
  };

  const totals = LAB_IDS.reduce((t, l) => {
    const s = labStats(l);
    return { total: t.total + s.total, inspected: t.inspected + s.inspected, issues: t.issues + s.issues };
  }, { total: 0, inspected: 0, issues: 0 });

  const save = async (data) => {
    try {
      const rec = await api.post("/inspections", { ...data, lab: form.lab, pc: form.pc });
      setRecords((rs) => [...rs.filter((x) => x.id !== rec.id), rec]);
      setDrafts((ds) => ds.filter((x) => x.id !== `${form.lab}-${form.pc}`));
      setForm(null);
      const nxt = COMPUTERS[form.lab].find((c) => c.pc !== form.pc && !latest[`${form.lab}-${c.pc}`]);
      setSel(nxt ? nxt.pc : form.pc);
      notify(`Saved ✔ ${posOf(form.lab, form.pc)}` + (nxt ? ` — next up: ${posOf(form.lab, nxt.pc)}` : " — every computer in this lab is done 🎉"));
    } catch (e) { notify(e.message, "error"); }
  };

  const removeRecord = (id) => {
    setAsk({
      title: "Delete this record?", text: "This inspection record will be permanently removed.", action: "Delete",
      onYes: async () => {
        try { await api.del(`/inspections/${id}`); setRecords((rs) => rs.filter((r) => r.id !== id)); notify("Record deleted"); }
        catch (e) { notify(e.message, "error"); }
      },
    });
  };

  const saveDraft = async (data, step, close) => {
    const key = `${form.lab}-${form.pc}`;
    try {
      const d = await api.put(`/drafts/${key}`, { data: pick(data), step });
      setDrafts((ds) => [...ds.filter((x) => x.id !== d.id), d]);
      if (close) { setForm(null); notify("Draft saved — continue any time"); }
    } catch (e) { if (close) notify(e.message, "error"); }
  };

  const discardDraft = (d) => setAsk({
    title: "Discard this draft?", text: "The unfinished answers will be deleted.", action: "Discard",
    onYes: async () => {
      try { await api.del(`/drafts/${d.id}`); setDrafts((ds) => ds.filter((x) => x.id !== d.id)); notify("Draft discarded"); }
      catch (e) { notify(e.message, "error"); }
    },
  });

  const exportCsv = () => {
    const head = ["Lab", "Computer", "Date", "Formatted", "OS", "RAM", ...SOFTWARE.map(([, n]) => n), "Live Server", "Other extensions", "Keyboard", "Mouse", "Inspected by", "Recorded at"];
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = records.slice().sort((a, b) => a.lab - b.lab || a.pc - b.pc || a.date.localeCompare(b.date)).map((r) => [
      `Lab ${r.lab}`, posOf(r.lab, r.pc), r.date, yn(r.formatted), r.os, r.ram,
      ...SOFTWARE.map(([k]) => yn(r.software[k])), yn(r.liveServer), r.otherExtensions, yn(r.keyboard), yn(r.mouse), r.inspector, new Date(r.createdAt).toLocaleString(),
    ]);
    const csv = [head, ...rows].map((r) => r.map(esc).join(",")).join("\n");
    download(csv, `inspections-${today()}.csv`, "text/csv");
    notify("CSV exported");
  };

  const exportBackup = () => {
    download(JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), records }, null, 2),
      `inspection-backup-${today()}.json`, "application/json");
    notify("Backup downloaded");
  };


  const pcs = lab ? Array.from({ length: sizeOf(lab) }, (_, i) => i + 1) : [];
  const shown = pcs.filter((pc) => {
    const r = latest[`${lab}-${pc}`];
    return filter === "all" || (filter === "none" && !r) || (filter.startsWith("by:") && r?.inspector === filter.slice(3)) || (filter === "issues" && r && !isHealthy(r)) || (filter === "draft" && !!draftMap[`${lab}-${pc}`]);
  });

  if (!loaded) return <div className="app"><p className="muted center" style={{ marginTop: "30vh" }}>Loading latest data…</p></div>;

  return (
    <div className="app">
      
      <header className="top">
        <div className="brand">
          <span className="logo" aria-hidden="true">🖥️</span>
          <div>
            <h1>Computer Inspection Tracker</h1>
            <p className="muted">Lab readiness dashboard · 10 labs · {totals.total} computers</p>
          </div>
        </div>
        <div className="actions">
          {lab && page === "labs" && <button className="btn" onClick={() => { setLab(null); setFilter("all"); }}>← All labs</button>}
          {user.role === "admin" && <a className="btn" href="/admin">Users</a>}
          <button className="btn" onClick={() => setAccount(true)} title="Change password">{user.name} · {user.role}</button>
          <button className="btn" onClick={logout}>Sign out</button>
          <button className="btn" onClick={exportCsv} disabled={!records.length}>Export CSV</button>
          <button className="btn" onClick={exportBackup} disabled={!records.length}>Backup</button>
        </div>
      </header>
      <nav className="seg nav">
        <button className={page === "labs" ? "on" : ""} onClick={() => setPage("labs")}>Labs &amp; floor plans</button>
        <button className={page === "report" ? "on" : ""} onClick={() => setPage("report")}>Management report</button>
      </nav>

      {page === "report" ? <Report latest={latest} onOpen={openComputer} drafts={drafts} records={records} /> : !lab ? (
        <>
          <Welcome user={user} records={records} drafts={drafts} latest={latest} onInspect={(l, pc) => { openComputer(l, pc); setForm({ lab: l, pc }); }} />
          <section className="stats">
            <div><b>{totals.inspected}</b><span>Inspected</span></div>
            <div><b>{totals.total - totals.inspected}</b><span>Pending</span></div>
            <div><b className="warn">{totals.issues}</b><span>Need attention</span></div>
          </section>
          <section className="grid">
            {LAB_IDS.map((l) => {
              const s = labStats(l);
              const pct = Math.round((s.inspected / s.total) * 100);
              return (
                <button key={l} className="card" onClick={() => { setSel(null); setLab(l); }}>
                  <h3>Lab {l}</h3>
                  <p className="muted layout-note">{layoutText(l)}</p>
                  <MiniPlan lab={l} latest={latest} />
                  <div className="bar"><i style={{ width: pct + "%" }} /></div>
                  <p>{s.inspected}/{s.total} inspected</p>
                  <p className={s.issues ? "warn" : "muted"}>{s.issues} with issues</p>
                </button>
              );
            })}
          </section>
        </>
      ) : (
        <section>
          <div className="lab-head">
            <h2>Lab {lab}</h2>
            <div className="seg">
              <button className={view === "map" ? "on" : ""} onClick={() => setView("map")}>Floor plan</button>
              <button className={view === "list" ? "on" : ""} onClick={() => setView("list")}>List</button>
            </div>
            <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter computers">
              <option value="all">All computers</option>
              <option value="none">Not inspected</option>
              <option value="issues">Needs attention</option>
              <option value="draft">Draft in progress</option>
              <option value={`by:${user.name}`}>Inspected by me</option>
              <optgroup label="Inspected by…">
                {[...new Set(records.map((r) => r.inspector).filter(Boolean))].sort().map((n) => <option key={n} value={`by:${n}`}>{n}</option>)}
              </optgroup>
            </select>
          </div>
          {view === "map" ? (
            <>
              <FloorPlan lab={lab} latest={latest} draftMap={draftMap} filter={filter} sel={sel} onSelect={setSel} />
              {(() => {
                const c = sel ? COMPUTERS[lab].find((x) => x.pc === sel) : null;
                const r = c && latest[`${lab}-${c.pc}`];
                const dr = c && draftMap[`${lab}-${c.pc}`];
                const nextPc = pcs.find((pc) => !latest[`${lab}-${pc}`]);
                return (
                  <div className="detail">
                    {!c ? (
                      <p className="muted">Select a computer on the plan to inspect it.</p>
                    ) : (
                      <div>
                        <h3>{posOf(lab, c.pc)} <Badge rec={r} /></h3>
                        <p className="muted">{r ? <>Inspected by <b>{r.inspector || "unknown"}</b> on {r.date} · recorded {new Date(r.createdAt).toLocaleString()} · {r.os} · {r.ram}</> : "No inspection recorded yet."}</p>
                        {dr && <p className="draft-note">✎ Draft in progress · {dr.inspector} · step {dr.step + 1} of 5 · saved {new Date(dr.updatedAt).toLocaleString()}</p>}
                        {r && (
                          <ul className="checks">
                            {[["Formatted", r.formatted], ...SOFTWARE.map(([k, n]) => [n, r.software[k]]), ["Live Server", r.liveServer], ["Keyboard", r.keyboard], ["Mouse", r.mouse]].map(([n, v]) => (
                              <li key={n} className={v ? "y" : "n"}>{v ? "✔" : "✘"} {n}</li>))}
                          </ul>
                        )}
                      </div>
                    )}
                    <div className="actions">
                      {nextPc && <button className="btn" onClick={() => setSel(nextPc)}>Next uninspected →</button>}
                      {c && r && <button className="btn" onClick={() => setHistory({ lab, pc: c.pc })}>History</button>}
                      {dr && !readOnly && <button className="btn" onClick={() => discardDraft(dr)}>Discard draft</button>}
                      {c && !readOnly && <button className="btn primary" onClick={() => setForm({ lab, pc: c.pc })}>{dr ? "Continue draft" : r ? "Re-inspect" : "Inspect"}</button>}
                    </div>
                  </div>
                );
              })()}
            </>
          ) : (
            <div className="table-wrap">
            <table>
              <thead><tr><th>PC</th><th>Status</th><th>Last inspected</th><th>OS</th><th>RAM</th><th></th></tr></thead>
              <tbody>
                {shown.map((pc) => {
                  const r = latest[`${lab}-${pc}`];
                  return (
                    <tr key={pc}>
                      <td>{posOf(lab, pc)}</td>
                      <td><Badge rec={r} />{draftMap[`${lab}-${pc}`] && <span className="chip draft">✎ Draft</span>}</td>
                      <td>{r?.date ?? "—"}</td>
                      <td>{r?.os || "—"}</td>
                      <td>{r?.ram || "—"}</td>
                      <td className="right">
                        {!readOnly && <button className="btn primary sm" onClick={() => setForm({ lab, pc })}>{draftMap[`${lab}-${pc}`] ? "Continue" : r ? "Re-inspect" : "Inspect"}</button>}
                        {r && <button className="btn sm" onClick={() => setHistory({ lab, pc })}>History</button>}
                      </td>
                    </tr>
                  );
                })}
                {!shown.length && <tr><td colSpan="6" className="muted center">No computers match this filter.</td></tr>}
              </tbody>
            </table>
          </div>
          )}
        </section>
      )}

      {form && (
        <Modal title={`Inspect · Lab ${form.lab} · ${posOf(form.lab, form.pc)}`} onClose={() => setForm(null)}>
          <InspectionForm lab={form.lab} pc={form.pc} onSave={save} onCancel={() => setForm(null)} onDraft={saveDraft} who={user.name}
            {...(() => {
              const key = `${form.lab}-${form.pc}`, dr = draftMap[key], r = latest[key], b = blankForm();
              if (dr) return {
                initial: { ...b, ...dr.data, date: dr.data.date || b.date, software: { ...b.software, ...dr.data.software } },
                initialStep: dr.step,
                banner: `Resuming a draft saved by ${dr.inspector} on ${new Date(dr.updatedAt).toLocaleString()}`,
              };
              return { initial: r ? { ...r, date: today() } : b, initialStep: 0 };
            })()} />
        </Modal>
      )}

      {history && (
        <Modal title={`Lab ${history.lab} · ${posOf(history.lab, history.pc)}`} onClose={() => setHistory(null)}>
          {records.filter((r) => r.lab === history.lab && r.pc === history.pc)
            .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
            .map((r) => (
              <div key={r.id} className="hist">
                <div className="hist-top"><b>{r.date}</b><span>by <b>{r.inspector}</b> · recorded {new Date(r.createdAt).toLocaleString()}</span><Badge rec={r} />
                  {!readOnly && <button className="btn sm danger" onClick={() => removeRecord(r.id)}>Delete</button>}</div>
                <p>Formatted: {yn(r.formatted)} · {r.os} · {r.ram}</p>
                <p>{SOFTWARE.map(([k, n]) => `${n}: ${yn(r.software[k])}`).join(" · ")}</p>
                <p>Live Server: {yn(r.liveServer)} · Other: {r.otherExtensions || "none"}</p>
                <p>Keyboard: {yn(r.keyboard)} · Mouse: {yn(r.mouse)}</p>
              </div>
            ))}
          {!records.some((r) => r.lab === history.lab && r.pc === history.pc) && <p className="muted">No records yet.</p>}
        </Modal>
      )}

      {account && <AccountModal onClose={() => setAccount(false)} notify={notify} />}

      {ask && (
        <Modal title={ask.title} onClose={() => setAsk(null)}>
          <p>{ask.text}</p>
          <div className="actions">
            <button className="btn" onClick={() => setAsk(null)}>Cancel</button>
            <button className="btn primary" onClick={() => { ask.onYes(); setAsk(null); }}>{ask.action}</button>
          </div>
        </Modal>
      )}

      {toast && <div key={toast.id} className={"toast " + toast.type} role="status">{toast.msg}</div>}
      <footer className="foot muted">{syncErr ? "⚠ Offline — retrying. Showing last known data." : `Shared live data · last synced ${syncedAt ? syncedAt.toLocaleTimeString() : "…"} · auto-refreshes every 15 s`}</footer>
    </div>
  );
}

/* ---------- Styles ---------- */
