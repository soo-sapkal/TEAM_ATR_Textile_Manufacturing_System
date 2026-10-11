"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { DEMO_USERS } from "@/lib/auth/permissions";
import { useDemo } from "@/lib/demo/context";
import { BrandMark, Button, Field, LinkButton, TextInput } from "@/components/ui/primitives";

const personaLabels: Record<string, string> = {
  "u-owner": "Owner", "u-supervisor": "Supervisor", "u-operator-spinning": "Operator (Spinning)", "u-operator-weaving": "Operator (Weaving)", "u-operator-dyeing": "Operator (Dyeing)", "u-inspector": "Inspector", "u-dispatch": "Dispatch", "u-buyer": "Buyer"
};

export default function LoginPage() {
  const router = useRouter();
  const { loginAs } = useDemo();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [selectedSpin, setSelectedSpin] = useState("u-operator-spinning");
  const [selectedWeav, setSelectedWeav] = useState("u-operator-weaving");
  const [selectedDye, setSelectedDye] = useState("u-operator-dyeing");

  async function enterAs(id: string) {
    setBusy(true);
    setError("");
    const selected = DEMO_USERS.find((user) => user.id === id);
    if (!selected) return;

    try {
      loginAs(selected.id);
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: selected.email, password: "password123" })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed.");
        setBusy(false);
        return;
      }

      const roleMap: Record<string, string> = {
        "OWNER": "owner",
        "SUPERVISOR": "supervisor",
        "MACHINE_OPERATOR": "operator",
        "QUALITY_INSPECTOR": "quality",
        "DISPATCH_OFFICER": "dispatch",
        "BUYER": "buyer"
      };

      const primaryRole = data.user?.roles?.[0] || "SUPERVISOR";
      const folder = roleMap[primaryRole];
      const targetPath = folder ? `/${folder}/dashboard` : "/dashboard";
      const next = new URLSearchParams(window.location.search).get("next");
      
      setTimeout(() => {
        const finalPath = next && next.startsWith("/") && !next.startsWith("//") ? next : targetPath;
        router.push(finalPath);
        window.location.href = finalPath;
      }, 300);
      
    } catch (err) {
      setError("An unexpected error occurred.");
      setBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed.");
        setBusy(false);
        return;
      }

      const roleMap: Record<string, string> = {
        "OWNER": "owner",
        "SUPERVISOR": "supervisor",
        "MACHINE_OPERATOR": "operator",
        "QUALITY_INSPECTOR": "quality",
        "DISPATCH_OFFICER": "dispatch",
        "BUYER": "buyer"
      };

      const primaryRole = data.user?.roles?.[0] || "SUPERVISOR";
      const folder = roleMap[primaryRole];
      const targetPath = folder ? `/${folder}/dashboard` : "/dashboard";
      const next = new URLSearchParams(window.location.search).get("next");
      
      // Give the system a tiny bit of time to set the cookie before navigating
      setTimeout(() => {
        router.push(next && next.startsWith("/") && !next.startsWith("//") ? next : targetPath);
        // Refresh context
        window.location.href = targetPath;
      }, 300);
      
    } catch (err) {
      setError("An unexpected error occurred.");
      setBusy(false);
    }
  }

  return <main className="login-wrap">
    <section className="login-story">
      <Link href="/" aria-label="Loom Ledger home"><BrandMark /></Link>
      <div><span className="kicker" style={{ color: "var(--turmeric)" }}>Check in. Check out.</span><h1>Everything in between<br/>is recorded.</h1><p>Sign in to Loom Ledger for a role-specific view of yarn, production, quality, dispatch, and the books.</p></div>
      <div className="hero-proof"><span className="hero-proof__dot" style={{ background: "var(--neem)" }}/> Manufacturing Execution System · Active</div>
    </section>
    <section className="login-form-panel" aria-labelledby="signin-title">
      <div style={{ maxWidth: 620, margin: "0 auto" }}>
        <span className="kicker">Everest Textile Mills</span><h2 id="signin-title" style={{ font: "900 39px/.98 var(--font-display)", letterSpacing: "-.04em", margin: "12px 0 8px" }}>Sign in</h2><p style={{ marginTop: 0, color: "var(--ink-soft)", fontSize: 12 }}>Choose a staff persona or enter credentials. Each role sees only the permissions in its profile.</p>
        <div className="info-strip" style={{ background: "var(--neem-soft, #f0fdf4)", borderColor: "var(--neem, #16a34a)" }}><ShieldCheck size={17} style={{ color: "var(--neem, #16a34a)" }}/><div><strong>Secure Portal Access</strong><div>Role-based access control active for factory operations and customer commitments.</div></div></div>
        <form onSubmit={submit} className="stack" style={{ marginTop: 18 }}>
          <Field label="Email"><TextInput autoComplete="username" type="email" placeholder="name@everest.demo" value={email} onChange={(event) => setEmail(event.target.value)} required /></Field>
          <Field label="Password" hint="Use “password123” with any listed staff email."><div style={{ position: "relative" }}><TextInput autoComplete="current-password" type={showPassword ? "text" : "password"} placeholder="Enter password" value={password} onChange={(event) => setPassword(event.target.value)} required style={{ paddingRight: 48 }} /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} className="icon-button" style={{ position: "absolute", right: 4, top: 3, border: 0, boxShadow: "none" }} onClick={() => setShowPassword((current) => !current)}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></Field>
          {error && <p role="alert" style={{ color: "var(--madder)", fontWeight: 750, fontSize: 11, margin: 0 }}>{error}</p>}
          <Button type="submit" size="lg" disabled={busy}>Sign in <ArrowRight size={15}/></Button>
        </form>
        <div className="section-heading" style={{ marginTop: 28 }}><div><h2>Select Mill Role</h2><p>Sign in with one of the provisioned mill accounts.</p></div></div>
        <div className="persona-grid">
          {DEMO_USERS.filter(u => personaLabels[u.id] && !u.id.includes("operator")).map((user) => (
            <button className="persona-button" type="button" key={user.id} onClick={() => enterAs(user.id)}>
              <strong>{personaLabels[user.id]}</strong>
              <small>{user.name}</small>
            </button>
          ))}
          
          <div className="persona-button" style={{ display: "flex", flexDirection: "column", gap: 6, padding: "8px 10px", justifyContent: "space-between", background: "var(--paper)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong>Operator (Spinning)</strong>
              <small style={{ color: "var(--ink-soft)", fontSize: 9 }}>11 accounts</small>
            </div>
            <select
              className="input select"
              style={{ minHeight: 30, padding: "3px 6px", fontSize: 11, width: "100%", background: "#fff" }}
              value={selectedSpin}
              onChange={(e) => setSelectedSpin(e.target.value)}
            >
              <option value="u-operator-spinning">Ravi Kumar (Lead Spinning Operator)</option>
              {DEMO_USERS.filter(u => u.id.startsWith("u-op-spin-")).map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={() => enterAs(selectedSpin)}
              style={{ width: "100%", justifyContent: "center", minHeight: 28, fontSize: 11, padding: "4px 8px" }}
            >
              Sign In <ArrowRight size={13} style={{ marginLeft: 4 }} />
            </Button>
          </div>
          
          <div className="persona-button" style={{ display: "flex", flexDirection: "column", gap: 6, padding: "8px 10px", justifyContent: "space-between", background: "var(--paper)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong>Operator (Weaving)</strong>
              <small style={{ color: "var(--ink-soft)", fontSize: 9 }}>11 accounts</small>
            </div>
            <select
              className="input select"
              style={{ minHeight: 30, padding: "3px 6px", fontSize: 11, width: "100%", background: "#fff" }}
              value={selectedWeav}
              onChange={(e) => setSelectedWeav(e.target.value)}
            >
              <option value="u-operator-weaving">Suresh Patel (Lead Weaving Operator)</option>
              {DEMO_USERS.filter(u => u.id.startsWith("u-op-weav-")).map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={() => enterAs(selectedWeav)}
              style={{ width: "100%", justifyContent: "center", minHeight: 28, fontSize: 11, padding: "4px 8px" }}
            >
              Sign In <ArrowRight size={13} style={{ marginLeft: 4 }} />
            </Button>
          </div>
          
          <div className="persona-button" style={{ display: "flex", flexDirection: "column", gap: 6, padding: "8px 10px", justifyContent: "space-between", background: "var(--paper)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong>Operator (Dyeing)</strong>
              <small style={{ color: "var(--ink-soft)", fontSize: 9 }}>11 accounts</small>
            </div>
            <select
              className="input select"
              style={{ minHeight: 30, padding: "3px 6px", fontSize: 11, width: "100%", background: "#fff" }}
              value={selectedDye}
              onChange={(e) => setSelectedDye(e.target.value)}
            >
              <option value="u-operator-dyeing">Kavita Rao (Lead Dyeing Operator)</option>
              {DEMO_USERS.filter(u => u.id.startsWith("u-op-dye-")).map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={() => enterAs(selectedDye)}
              style={{ width: "100%", justifyContent: "center", minHeight: 28, fontSize: 11, padding: "4px 8px" }}
            >
              Sign In <ArrowRight size={13} style={{ marginLeft: 4 }} />
            </Button>
          </div>
        </div>
        <p style={{ marginTop: 24, fontSize: 10, color: "var(--ink-soft)" }}><LinkButton href="/" size="sm" variant="quiet">Back to the Gate</LinkButton></p>
      </div>
    </section>
  </main>;
}
