"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { API_URL } from "../lib/api";

function ResetForm() {
  const params   = useSearchParams();
  const router   = useRouter();
  const token    = params.get("token") ?? "";

  const [newPw, setNewPw]       = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    if (!token) setError("Invalid reset link — please request a new one.");
  }, [token]);

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", borderRadius: 10, padding: "12px 14px",
    fontSize: 14, color: "#f1f5f9", background: "#0f0f1a",
    border: "1px solid rgba(255,255,255,0.15)", outline: "none", fontFamily: "inherit",
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPw !== confirmPw) { setError("Passwords do not match"); return; }
    if (newPw.length < 8)    { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: newPw }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setError(d.detail || "Failed to reset password");
      } else {
        setDone(true);
        setTimeout(() => router.push("/login"), 3000);
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
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: "0 0 8px" }}>Set a new password</h1>
          <p style={{ fontSize: 14, color: "#475569", margin: 0 }}>
            {done ? "Password updated! Redirecting to sign in…" : "Choose a strong password for your account."}
          </p>
        </div>

        <div style={{ borderRadius: 24, background: "linear-gradient(180deg,#141428 0%,#0f0f22 100%)", border: "1px solid rgba(168,85,247,0.2)", boxShadow: "0 24px 60px rgba(0,0,0,0.6)", overflow: "hidden" }}>
          {done ? (
            <div style={{ padding: "36px 32px", textAlign: "center", display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ fontSize: 48 }}>✅</div>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#10b981", margin: 0 }}>Password updated successfully!</p>
              <Link href="/login" style={{ padding: "12px 24px", borderRadius: 12, fontSize: 14, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg,#7c3aed,#5b21b6)", textDecoration: "none", display: "inline-block" }}>
                Sign in now →
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ padding: "28px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 6, letterSpacing: "0.06em" }}>NEW PASSWORD</label>
                  <input
                    style={inputStyle} type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
                    placeholder="8+ characters" autoFocus autoComplete="new-password"
                    onFocus={e => { e.currentTarget.style.borderColor = "#a855f7"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(168,85,247,0.2)"; }}
                    onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.boxShadow = "none"; }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 6, letterSpacing: "0.06em" }}>CONFIRM PASSWORD</label>
                  <input
                    style={inputStyle} type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                    placeholder="Same as above" autoComplete="new-password"
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
                <button type="submit" disabled={loading || !newPw || !confirmPw || !token}
                  style={{ width: "100%", padding: "13px", borderRadius: 12, fontSize: 14, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg,#7c3aed,#5b21b6)", border: "none", cursor: loading ? "wait" : "pointer", opacity: loading || !newPw || !confirmPw ? 0.6 : 1, boxShadow: "0 4px 20px rgba(124,58,237,0.4)" }}>
                  {loading ? "Updating…" : "Update password →"}
                </button>
                <Link href="/forgot-password" style={{ textAlign: "center", fontSize: 13, color: "#475569", textDecoration: "none" }}>
                  Request a new link
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
