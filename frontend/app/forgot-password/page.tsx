"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { API_URL } from "../lib/api";

const G = "#0CAA41";
const G_DARK = "#0a8f36";

const inputBase: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", borderRadius: 8, padding: "11px 14px",
  fontSize: 14, color: "#111827", background: "#f9fafb",
  border: "1.5px solid #e5e7eb", outline: "none", fontFamily: "inherit",
};

function focusOn(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = G;
  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(12,170,65,0.12)";
  e.currentTarget.style.background = "#fff";
}
function focusOff(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = "#e5e7eb";
  e.currentTarget.style.boxShadow = "none";
  e.currentTarget.style.background = "#f9fafb";
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div style={{ display: "flex", gap: 8, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px" }}>
      <span style={{ color: "#dc2626" }}>⚠</span>
      <p style={{ fontSize: 13, color: "#dc2626", margin: 0 }}>{msg}</p>
    </div>
  );
}

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep]           = useState<1 | 2>(1);
  const [email, setEmail]         = useState("");
  const [q1, setQ1]               = useState("");
  const [q2, setQ2]               = useState("");
  const [a1, setA1]               = useState("");
  const [a2, setA2]               = useState("");
  const [newPw, setNewPw]         = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setLoading(true);
    try {
      const r = await fetch(`${API_URL}/auth/security-questions/${encodeURIComponent(email)}`);
      if (!r.ok) { const d = await r.json().catch(() => ({})); setError(d.detail || "Could not find that account"); return; }
      const data = await r.json();
      setQ1(data.q1); setQ2(data.q2); setStep(2);
    } catch { setError("Network error — please try again"); }
    finally { setLoading(false); }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    if (newPw !== confirmPw) { setError("Passwords do not match"); return; }
    if (newPw.length < 8)    { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, a1, a2, new_password: newPw }),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); setError(d.detail || "Failed to reset password"); }
      else router.push("/login?reset=1");
    } catch { setError("Network error — please try again"); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "#f3f4f6" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 48, height: 48, borderRadius: 10, background: G, fontSize: 22, marginBottom: 12, boxShadow: "0 4px 14px rgba(12,170,65,0.3)" }}>📚</div>
          </Link>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "#111827", margin: "0 0 6px" }}>Forgot your password?</h1>
          <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
            {step === 1 ? "Enter your email address to get started." : "Answer your security questions to reset your password."}
          </p>
        </div>

        {/* Step indicators */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: 24 }}>
          {[1, 2].map((s, i) => (
            <div key={s} style={{ display: "flex", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, background: step >= s ? G : "#e5e7eb", color: step >= s ? "#fff" : "#9ca3af" }}>
                  {step > s ? "✓" : s}
                </div>
                <span style={{ fontSize: 12, fontWeight: step >= s ? 600 : 400, color: step >= s ? G : "#9ca3af" }}>
                  {s === 1 ? "Email" : "Security questions"}
                </span>
              </div>
              {i < 1 && <div style={{ width: 32, height: 1.5, background: step > s ? G : "#e5e7eb", margin: "0 8px" }} />}
            </div>
          ))}
        </div>

        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", boxShadow: "0 4px 24px rgba(0,0,0,0.06)", overflow: "hidden" }}>
          <div style={{ padding: "28px" }}>

            {step === 1 && (
              <form onSubmit={handleEmailSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Email address</label>
                  <input style={inputBase} type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com" required autoFocus onFocus={focusOn} onBlur={focusOff} />
                </div>
                {error && <ErrorBox msg={error} />}
                <button type="submit" disabled={loading || !email}
                  style={{ width: "100%", padding: "12px", borderRadius: 8, fontSize: 14, fontWeight: 700, color: "#fff", background: G, border: "none", cursor: (loading || !email) ? "not-allowed" : "pointer", opacity: (loading || !email) ? 0.65 : 1 }}
                  onMouseEnter={e => { if (!loading && email) (e.currentTarget as HTMLElement).style.background = G_DARK; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = G; }}>
                  {loading ? "Looking up…" : "Continue"}
                </button>
                <Link href="/login" style={{ textAlign: "center", fontSize: 13, color: "#6b7280", textDecoration: "none", display: "block" }}>← Back to sign in</Link>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleReset} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ background: "#f9fafb", borderRadius: 8, padding: "14px 16px", border: "1px solid #e5e7eb" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 4px" }}>Question 1</p>
                  <p style={{ fontSize: 14, color: "#374151", fontWeight: 600, margin: "0 0 10px" }}>{q1}</p>
                  <input style={inputBase} type="text" value={a1} onChange={e => setA1(e.target.value)}
                    placeholder="Your answer" required autoFocus onFocus={focusOn} onBlur={focusOff} />
                </div>
                <div style={{ background: "#f9fafb", borderRadius: 8, padding: "14px 16px", border: "1px solid #e5e7eb" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 4px" }}>Question 2</p>
                  <p style={{ fontSize: 14, color: "#374151", fontWeight: 600, margin: "0 0 10px" }}>{q2}</p>
                  <input style={inputBase} type="text" value={a2} onChange={e => setA2(e.target.value)}
                    placeholder="Your answer" required onFocus={focusOn} onBlur={focusOff} />
                </div>
                <div style={{ height: 1, background: "#f3f4f6" }} />
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>New password</label>
                  <input style={inputBase} type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
                    placeholder="8+ characters" autoComplete="new-password" onFocus={focusOn} onBlur={focusOff} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Confirm new password</label>
                  <input style={inputBase} type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                    placeholder="Same as above" autoComplete="new-password" onFocus={focusOn} onBlur={focusOff} />
                </div>
                {error && <ErrorBox msg={error} />}
                <button type="submit" disabled={loading || !a1 || !a2 || !newPw || !confirmPw}
                  style={{ width: "100%", padding: "12px", borderRadius: 8, fontSize: 14, fontWeight: 700, color: "#fff", background: G, border: "none", cursor: (loading || !a1 || !a2 || !newPw || !confirmPw) ? "not-allowed" : "pointer", opacity: (loading || !a1 || !a2 || !newPw || !confirmPw) ? 0.65 : 1 }}
                  onMouseEnter={e => { const ok = !loading && a1 && a2 && newPw && confirmPw; if (ok) (e.currentTarget as HTMLElement).style.background = G_DARK; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = G; }}>
                  {loading ? "Resetting…" : "Reset password"}
                </button>
                <button type="button" onClick={() => { setStep(1); setError(null); setA1(""); setA2(""); setNewPw(""); setConfirmPw(""); }}
                  style={{ background: "none", border: "none", color: "#6b7280", fontSize: 13, cursor: "pointer", textAlign: "center" }}>
                  ← Use a different email
                </button>
              </form>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
