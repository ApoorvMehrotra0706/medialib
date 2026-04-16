"use client";
import { useState } from "react";
import Link from "next/link";
import { API_URL } from "../lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", borderRadius: 10, padding: "12px 14px",
    fontSize: 14, color: "#f1f5f9", background: "#0f0f1a",
    border: "1px solid rgba(255,255,255,0.15)", outline: "none", fontFamily: "inherit",
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setError(d.detail || "Something went wrong");
      } else {
        setSent(true);
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "radial-gradient(ellipse 80% 60% at 50% -10%, #1e0a4a 0%, #0d0920 45%, #09090f 100%)" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 56, height: 56, borderRadius: 18, background: "linear-gradient(145deg,#a855f7,#7c3aed)", boxShadow: "0 8px 32px rgba(168,85,247,0.4)", fontSize: 24, marginBottom: 16 }}>📚</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: "0 0 8px" }}>Forgot your password?</h1>
          <p style={{ fontSize: 14, color: "#475569", margin: 0 }}>
            {sent ? "Check your inbox for the reset link." : "Enter your email and we'll send you a reset link."}
          </p>
        </div>

        <div style={{ borderRadius: 24, background: "linear-gradient(180deg,#141428 0%,#0f0f22 100%)", border: "1px solid rgba(168,85,247,0.2)", boxShadow: "0 24px 60px rgba(0,0,0,0.6)", overflow: "hidden" }}>
          {sent ? (
            <div style={{ padding: "36px 32px", textAlign: "center", display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ fontSize: 48 }}>📬</div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", margin: "0 0 8px" }}>Email sent!</p>
                <p style={{ fontSize: 13, color: "#475569", margin: 0 }}>We sent a reset link to <strong style={{ color: "#c084fc" }}>{email}</strong>. It expires in 1 hour.</p>
              </div>
              <Link href="/login" style={{ padding: "12px 24px", borderRadius: 12, fontSize: 14, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg,#7c3aed,#5b21b6)", textDecoration: "none", display: "inline-block" }}>
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ padding: "28px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 6, letterSpacing: "0.06em" }}>EMAIL ADDRESS</label>
                  <input
                    style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com" required autoFocus
                    onFocus={e => { e.currentTarget.style.borderColor = "#a855f7"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(168,85,247,0.2)"; }}
                    onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.boxShadow = "none"; }}
                  />
                </div>
                {error && (
                  <div style={{ display: "flex", gap: 8, background: "rgba(127,29,29,0.4)", border: "1px solid rgba(185,28,28,0.5)", borderRadius: 10, padding: "10px 14px" }}>
                    <span style={{ color: "#f87171" }}>⚠</span>
                    <p style={{ fontSize: 12, color: "#f87171", margin: 0 }}>{error}</p>
                  </div>
                )}
                <button type="submit" disabled={loading || !email}
                  style={{ width: "100%", padding: "13px", borderRadius: 12, fontSize: 14, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg,#7c3aed,#5b21b6)", border: "none", cursor: loading ? "wait" : "pointer", opacity: loading || !email ? 0.6 : 1, boxShadow: "0 4px 20px rgba(124,58,237,0.4)" }}>
                  {loading ? "Sending…" : "Send reset link →"}
                </button>
                <Link href="/login" style={{ textAlign: "center", fontSize: 13, color: "#475569", textDecoration: "none" }}>
                  ← Back to sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
