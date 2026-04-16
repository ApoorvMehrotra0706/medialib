"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { API_URL } from "../lib/api";

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", borderRadius: 10, padding: "12px 14px",
  fontSize: 14, color: "#f1f5f9", background: "#0f0f1a",
  border: "1px solid rgba(255,255,255,0.15)", outline: "none", fontFamily: "inherit",
};

function focusOn(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = "#a855f7";
  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(168,85,247,0.2)";
}
function focusOff(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
  e.currentTarget.style.boxShadow = "none";
}

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep]         = useState<1 | 2>(1);
  const [email, setEmail]       = useState("");
  const [q1, setQ1]             = useState("");
  const [q2, setQ2]             = useState("");
  const [a1, setA1]             = useState("");
  const [a2, setA2]             = useState("");
  const [newPw, setNewPw]       = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/auth/security-questions/${encodeURIComponent(email)}`);
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setError(d.detail || "Could not find that account");
        return;
      }
      const data = await r.json();
      setQ1(data.q1);
      setQ2(data.q2);
      setStep(2);
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPw !== confirmPw) { setError("Passwords do not match"); return; }
    if (newPw.length < 8)    { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, a1, a2, new_password: newPw }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setError(d.detail || "Failed to reset password");
      } else {
        router.push("/login?reset=1");
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "radial-gradient(ellipse 80% 60% at 50% -10%, #1e0a4a 0%, #0d0920 45%, #09090f 100%)" }}>
      <div style={{ width: "100%", maxWidth: 440 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 52, height: 52, borderRadius: 16, background: "linear-gradient(145deg,#a855f7,#7c3aed)", fontSize: 22, marginBottom: 14 }}>📚</div>
          <h1 style={{ fontSize: 21, fontWeight: 800, color: "#fff", margin: "0 0 6px" }}>Forgot your password?</h1>
          <p style={{ fontSize: 13, color: "#475569", margin: 0 }}>
            {step === 1 ? "Enter your email to get started." : "Answer your security questions to reset your password."}
          </p>
        </div>

        {/* Step indicators */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, justifyContent: "center" }}>
          {[1, 2].map(s => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, background: step >= s ? "linear-gradient(135deg,#7c3aed,#5b21b6)" : "rgba(255,255,255,0.06)", color: step >= s ? "#fff" : "#334155", border: step >= s ? "none" : "1px solid rgba(255,255,255,0.08)" }}>
                {s}
              </div>
              <span style={{ fontSize: 12, color: step >= s ? "#c084fc" : "#334155", fontWeight: step >= s ? 600 : 400 }}>
                {s === 1 ? "Email" : "Security questions"}
              </span>
              {s < 2 && <div style={{ width: 24, height: 1, background: step > s ? "#7c3aed" : "rgba(255,255,255,0.08)" }} />}
            </div>
          ))}
        </div>

        <div style={{ borderRadius: 24, background: "linear-gradient(180deg,#141428 0%,#0f0f22 100%)", border: "1px solid rgba(168,85,247,0.2)", boxShadow: "0 24px 60px rgba(0,0,0,0.6)", overflow: "hidden" }}>
          <div style={{ padding: "28px" }}>

            {step === 1 && (
              <form onSubmit={handleEmailSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 6, letterSpacing: "0.06em" }}>EMAIL ADDRESS</label>
                  <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com" required autoFocus onFocus={focusOn} onBlur={focusOff} />
                </div>
                {error && <ErrorBox msg={error} />}
                <button type="submit" disabled={loading || !email}
                  style={{ width: "100%", padding: "13px", borderRadius: 12, fontSize: 14, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg,#7c3aed,#5b21b6)", border: "none", cursor: loading ? "wait" : "pointer", opacity: loading || !email ? 0.6 : 1 }}>
                  {loading ? "Looking up…" : "Continue →"}
                </button>
                <Link href="/login" style={{ textAlign: "center", fontSize: 13, color: "#475569", textDecoration: "none" }}>← Back to sign in</Link>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleReset} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 6, letterSpacing: "0.06em" }}>QUESTION 1</label>
                  <p style={{ fontSize: 14, color: "#c084fc", margin: "0 0 8px", fontWeight: 600 }}>{q1}</p>
                  <input style={inputStyle} type="text" value={a1} onChange={e => setA1(e.target.value)}
                    placeholder="Your answer" required autoFocus onFocus={focusOn} onBlur={focusOff} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 6, letterSpacing: "0.06em" }}>QUESTION 2</label>
                  <p style={{ fontSize: 14, color: "#c084fc", margin: "0 0 8px", fontWeight: 600 }}>{q2}</p>
                  <input style={inputStyle} type="text" value={a2} onChange={e => setA2(e.target.value)}
                    placeholder="Your answer" required onFocus={focusOn} onBlur={focusOff} />
                </div>
                <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 6, letterSpacing: "0.06em" }}>NEW PASSWORD</label>
                  <input style={inputStyle} type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
                    placeholder="8+ characters" autoComplete="new-password" onFocus={focusOn} onBlur={focusOff} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 6, letterSpacing: "0.06em" }}>CONFIRM PASSWORD</label>
                  <input style={inputStyle} type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                    placeholder="Same as above" autoComplete="new-password" onFocus={focusOn} onBlur={focusOff} />
                </div>
                {error && <ErrorBox msg={error} />}
                <button type="submit" disabled={loading || !a1 || !a2 || !newPw || !confirmPw}
                  style={{ width: "100%", padding: "13px", borderRadius: 12, fontSize: 14, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg,#7c3aed,#5b21b6)", border: "none", cursor: loading ? "wait" : "pointer", opacity: (loading || !a1 || !a2 || !newPw || !confirmPw) ? 0.6 : 1 }}>
                  {loading ? "Resetting…" : "Reset password →"}
                </button>
                <button type="button" onClick={() => { setStep(1); setError(null); setA1(""); setA2(""); setNewPw(""); setConfirmPw(""); }}
                  style={{ background: "none", border: "none", color: "#475569", fontSize: 13, cursor: "pointer", textAlign: "center" }}>
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

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div style={{ display: "flex", gap: 8, background: "rgba(127,29,29,0.4)", border: "1px solid rgba(185,28,28,0.5)", borderRadius: 10, padding: "10px 14px" }}>
      <span style={{ color: "#f87171" }}>⚠</span>
      <p style={{ fontSize: 12, color: "#f87171", margin: 0 }}>{msg}</p>
    </div>
  );
}
