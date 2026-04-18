"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { API_URL } from "../lib/api";

const G = "#0CAA41";
const G_DARK = "#0a8f36";

const QUESTIONS = [
  "What was the name of your first pet?",
  "What city were you born in?",
  "What is your mother's maiden name?",
  "What was the name of your elementary school?",
  "What was your childhood nickname?",
  "What is the name of the street you grew up on?",
  "What was the make of your first car?",
  "What is your oldest sibling's middle name?",
  "What was the name of your first best friend?",
  "What is the name of the town where your parents met?",
];

const inputBase: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", borderRadius: 8, padding: "11px 14px",
  fontSize: 14, color: "#111827", background: "#f9fafb",
  border: "1.5px solid #e5e7eb", outline: "none", fontFamily: "inherit",
};
const selectBase: React.CSSProperties = { ...inputBase, cursor: "pointer", appearance: "none" as any };

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

export default function SetupSecurityPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [q1, setQ1]   = useState(QUESTIONS[0]);
  const [a1, setA1]   = useState("");
  const [q2, setQ2]   = useState(QUESTIONS[1]);
  const [a2, setA2]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  if (status === "loading") return null;
  if (!session) { router.replace("/login"); return null; }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    if (q1 === q2) { setError("Please choose two different questions"); return; }
    if (!a1.trim() || !a2.trim()) { setError("Please fill in both answers"); return; }
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/auth/security-questions`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: session!.user.id, q1, a1, q2, a2 }),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); setError(d.detail || "Failed to save — please try again"); }
      else router.replace("/");
    } catch { setError("Network error — please try again"); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "#f3f4f6" }}>
      <div style={{ width: "100%", maxWidth: 460 }}>

        {/* Logo + heading */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 48, height: 48, borderRadius: 10, background: G, fontSize: 22, marginBottom: 12, boxShadow: "0 4px 14px rgba(12,170,65,0.3)" }}>📚</div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "#111827", margin: "0 0 8px" }}>One last step</h1>
          <p style={{ fontSize: 14, color: "#6b7280", margin: 0, lineHeight: 1.6 }}>
            Set up security questions so you can recover<br />your account if you forget your password.
          </p>
        </div>

        {/* Progress indicator */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 24 }}>
          {["Account created", "Security setup"].map((label, i) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {i > 0 && <div style={{ width: 24, height: 1.5, background: i === 1 ? G : "#e5e7eb" }} />}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: i === 0 ? "#e5e7eb" : G, color: i === 0 ? "#9ca3af" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>
                  {i === 0 ? "✓" : "2"}
                </div>
                <span style={{ fontSize: 12, fontWeight: i === 1 ? 700 : 400, color: i === 1 ? G : "#9ca3af" }}>{label}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", boxShadow: "0 4px 24px rgba(0,0,0,0.06)", overflow: "hidden" }}>
          <form onSubmit={handleSubmit} style={{ padding: "28px 28px", display: "flex", flexDirection: "column", gap: 20 }}>

            {[
              { label: "Security Question 1", q: q1, setQ: setQ1, a: a1, setA: setA1, exclude: q2, autoFocus: true },
              { label: "Security Question 2", q: q2, setQ: setQ2, a: a2, setA: setA2, exclude: q1, autoFocus: false },
            ].map(({ label, q, setQ, a, setA, exclude, autoFocus }) => (
              <div key={label} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>{label}</label>
                <div style={{ position: "relative" }}>
                  <select value={q} onChange={e => setQ(e.target.value)} style={selectBase} onFocus={focusOn} onBlur={focusOff}>
                    {QUESTIONS.filter(opt => opt !== exclude).map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                    <svg width="12" height="12" fill="none" stroke="#9ca3af" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                <input style={inputBase} type="text" value={a} onChange={e => setA(e.target.value)}
                  placeholder="Your answer" autoFocus={autoFocus} onFocus={focusOn} onBlur={focusOff} />
              </div>
            ))}

            <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>
              Answers are not case-sensitive. Choose something only you would know.
            </p>

            {error && (
              <div style={{ display: "flex", gap: 8, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px" }}>
                <span style={{ color: "#dc2626" }}>⚠</span>
                <p style={{ fontSize: 13, color: "#dc2626", margin: 0 }}>{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading || !a1.trim() || !a2.trim()}
              style={{ width: "100%", padding: "13px", borderRadius: 8, fontSize: 14, fontWeight: 700, color: "#fff", background: G, border: "none", cursor: (loading || !a1.trim() || !a2.trim()) ? "not-allowed" : "pointer", opacity: (loading || !a1.trim() || !a2.trim()) ? 0.65 : 1, boxShadow: "0 2px 8px rgba(12,170,65,0.3)" }}
              onMouseEnter={e => { const ok = !loading && a1.trim() && a2.trim(); if (ok) (e.currentTarget as HTMLElement).style.background = G_DARK; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = G; }}>
              {loading ? "Saving…" : "Save & go to my library"}
            </button>

            <button type="button" onClick={() => router.replace("/")}
              style={{ background: "none", border: "none", color: "#9ca3af", fontSize: 13, cursor: "pointer", textAlign: "center", padding: 0 }}>
              Skip for now
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}
