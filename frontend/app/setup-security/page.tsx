"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { API_URL } from "../lib/api";

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

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", borderRadius: 12, padding: "12px 14px",
  fontSize: 14, color: "#f1f5f9", background: "#0a0a14",
  border: "1px solid rgba(255,255,255,0.12)", outline: "none", fontFamily: "inherit",
};
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: "pointer", appearance: "none" as any };

function focusOn(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = "#a855f7";
  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(168,85,247,0.15)";
}
function focusOff(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
  e.currentTarget.style.boxShadow = "none";
}

export default function SetupSecurityPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [q1, setQ1] = useState(QUESTIONS[0]);
  const [a1, setA1] = useState("");
  const [q2, setQ2] = useState(QUESTIONS[1]);
  const [a2, setA2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  if (status === "loading") return null;
  if (!session) { router.replace("/login"); return null; }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (q1 === q2) { setError("Please choose two different questions"); return; }
    if (!a1.trim() || !a2.trim()) { setError("Please fill in both answers"); return; }
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/auth/security-questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: session.user.id, q1, a1, q2, a2 }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setError(d.detail || "Failed to save — please try again");
      } else {
        router.replace("/");
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "radial-gradient(ellipse 80% 60% at 50% -10%, #1e0a4a 0%, #0d0920 45%, #09090f 100%)" }}>
      <div style={{ width: "100%", maxWidth: 480 }}>

        {/* Logo + heading */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 52, height: 52, borderRadius: 16, background: "linear-gradient(145deg,#a855f7,#7c3aed)", fontSize: 22, marginBottom: 14, boxShadow: "0 8px 32px rgba(168,85,247,0.35)" }}>📚</div>
          <h1 style={{ fontSize: 21, fontWeight: 800, color: "#fff", margin: "0 0 8px" }}>One last step</h1>
          <p style={{ fontSize: 14, color: "#64748b", margin: 0, lineHeight: 1.6 }}>
            Set up security questions so you can recover your account<br />if you ever forget your password.
          </p>
        </div>

        <div style={{ borderRadius: 24, background: "linear-gradient(180deg,#141428 0%,#0f0f22 100%)", border: "1px solid rgba(168,85,247,0.2)", boxShadow: "0 24px 60px rgba(0,0,0,0.6)", overflow: "hidden" }}>
          <form onSubmit={handleSubmit} style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: 22 }}>

            {/* Question 1 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.08em" }}>QUESTION 1</label>
              <select value={q1} onChange={e => setQ1(e.target.value)} style={selectStyle} onFocus={focusOn} onBlur={focusOff}>
                {QUESTIONS.filter(q => q !== q2).map(q => (
                  <option key={q} value={q} style={{ background: "#0f0f1e" }}>{q}</option>
                ))}
              </select>
              <input style={inputStyle} type="text" value={a1} onChange={e => setA1(e.target.value)}
                placeholder="Your answer" autoFocus onFocus={focusOn} onBlur={focusOff} />
            </div>

            <div style={{ height: 1, background: "rgba(255,255,255,0.05)" }} />

            {/* Question 2 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.08em" }}>QUESTION 2</label>
              <select value={q2} onChange={e => setQ2(e.target.value)} style={selectStyle} onFocus={focusOn} onBlur={focusOff}>
                {QUESTIONS.filter(q => q !== q1).map(q => (
                  <option key={q} value={q} style={{ background: "#0f0f1e" }}>{q}</option>
                ))}
              </select>
              <input style={inputStyle} type="text" value={a2} onChange={e => setA2(e.target.value)}
                placeholder="Your answer" onFocus={focusOn} onBlur={focusOff} />
            </div>

            <p style={{ fontSize: 12, color: "#334155", margin: 0 }}>
              Answers are not case-sensitive. Pick something only you would know.
            </p>

            {error && (
              <div style={{ display: "flex", gap: 8, background: "rgba(127,29,29,0.4)", border: "1px solid rgba(185,28,28,0.5)", borderRadius: 10, padding: "10px 14px" }}>
                <span style={{ color: "#f87171" }}>⚠</span>
                <p style={{ fontSize: 12, color: "#f87171", margin: 0 }}>{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading || !a1.trim() || !a2.trim()}
              style={{ width: "100%", padding: "14px", borderRadius: 14, fontSize: 14, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg,#7c3aed,#5b21b6)", border: "none", cursor: loading ? "wait" : "pointer", opacity: (loading || !a1.trim() || !a2.trim()) ? 0.6 : 1, boxShadow: "0 4px 20px rgba(124,58,237,0.4)" }}>
              {loading ? "Saving…" : "Save & go to my library →"}
            </button>

            <button type="button" onClick={() => router.replace("/")}
              style={{ background: "none", border: "none", color: "#334155", fontSize: 13, cursor: "pointer", textAlign: "center", padding: 0 }}>
              Skip for now
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}
