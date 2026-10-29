"use client";
import { useState } from "react";

export default function LoginForm() {
  const [f, setF] = useState({ username: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Sign-in failed.");
      location.href = "/";
    } catch (x) { setErr(x.message); setBusy(false); }
  };

  return (
    <div className="app login-wrap">
      <form className="login" onSubmit={submit}>
        <span className="logo big" aria-hidden="true">🖥️</span>
        <h1>Computer Inspection Tracker</h1>
        <p className="muted">Sign in with the account created for you by the administrator.</p>
        <label>Username<input value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} autoComplete="username" autoCapitalize="none" required /></label>
        <label>Password<input type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="current-password" required /></label>
        {err && <p className="error" role="alert">{err}</p>}
        <button className="btn primary" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </div>
  );
}
