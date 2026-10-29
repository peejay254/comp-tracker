"use client";
import { useCallback, useEffect, useState } from "react";

async function call(method, url, body) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) location.href = "/login";
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}
const blank = { username: "", name: "", role: "inspector", password: "" };

export default function UsersAdmin({ me }) {
  const [users, setUsers] = useState([]);
  const [f, setF] = useState(blank);
  const [msg, setMsg] = useState(null);

  const load = useCallback(() => call("GET", "/api/users").then(setUsers).catch((e) => setMsg({ t: "error", m: e.message })), []);
  useEffect(() => { load(); }, [load]);

  const act = async (fn, ok) => {
    try { await fn(); setMsg({ t: "ok", m: ok }); await load(); } catch (e) { setMsg({ t: "error", m: e.message }); }
  };
  const create = (e) => { e.preventDefault(); act(async () => { await call("POST", "/api/users", f); setF(blank); }, "User created"); };
  const reset = (u) => {
    const p = window.prompt(`New temporary password for ${u.username} (min 10 characters):`);
    if (p) act(() => call("PATCH", `/api/users/${u.id}`, { password: p }), "Password reset — they have been signed out");
  };

  return (
    <div className="app">
      <header className="top">
        <div className="brand"><span className="logo" aria-hidden="true">👥</span><div><h1>Manage users</h1><p className="muted">Create accounts, set roles and reset passwords</p></div></div>
        <div className="actions"><a className="btn" href="/">← Back to tracker</a></div>
      </header>

      <form className="admin-form" onSubmit={create}>
        <label>Username<input value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} required autoCapitalize="none" /></label>
        <label>Full name<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></label>
        <label>Role
          <select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
            <option value="inspector">Inspector (records inspections)</option>
            <option value="viewer">Viewer (management, read-only)</option>
            <option value="admin">Admin (manages users)</option>
          </select>
        </label>
        <label>Temporary password<input value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} minLength={10} required /></label>
        <button className="btn primary">Add user</button>
      </form>
      {msg && <p className={msg.t === "error" ? "error" : "okc"} role="status">{msg.m}</p>}

      <div className="table-wrap"><table>
        <thead><tr><th>Username</th><th>Name</th><th>Role</th><th>Status</th><th></th></tr></thead>
        <tbody>{users.map((u) => (
          <tr key={u.id} className={u.active ? "" : "off"}>
            <td><b>{u.username}</b>{u.id === me && <span className="muted"> (you)</span>}</td>
            <td>{u.name}</td>
            <td>
              <select value={u.role} disabled={u.id === me} onChange={(e) => act(() => call("PATCH", `/api/users/${u.id}`, { role: e.target.value }), "Role updated")}>
                <option value="admin">admin</option><option value="inspector">inspector</option><option value="viewer">viewer</option>
              </select>
            </td>
            <td>{u.active ? <span className="badge ok">Active</span> : <span className="badge none">Disabled</span>}</td>
            <td className="right">
              <button className="btn sm" onClick={() => reset(u)}>Reset password</button>
              {u.id !== me && <button className="btn sm" onClick={() => act(() => call("PATCH", `/api/users/${u.id}`, { active: !u.active }), u.active ? "User disabled" : "User enabled")}>{u.active ? "Disable" : "Enable"}</button>}
            </td>
          </tr>))}</tbody>
      </table></div>
    </div>
  );
}
