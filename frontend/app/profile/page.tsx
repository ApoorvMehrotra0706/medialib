"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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

function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", zIndex: 100, padding: "12px 22px", borderRadius: 8, background: type === "success" ? G : "#dc2626", color: "#fff", fontSize: 14, fontWeight: 700, boxShadow: `0 4px 20px ${type === "success" ? "rgba(12,170,65,0.4)" : "rgba(220,38,38,0.4)"}`, pointerEvents: "none" }}>
      {type === "success" ? "✓ " : "⚠ "}{msg}
    </div>
  );
}

function SectionCard({ title, subtitle, badge, children }: { title: string; subtitle?: string; badge?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", overflow: "hidden" }}>
      <div style={{ padding: "18px 24px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }}>{title}</p>
          {subtitle && <p style={{ fontSize: 13, color: "#6b7280", margin: "3px 0 0" }}>{subtitle}</p>}
        </div>
        {badge}
      </div>
      <div style={{ padding: "20px 24px" }}>{children}</div>
    </div>
  );
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [name, setName]           = useState(session?.user?.name ?? "");
  const [savingName, setSavingName] = useState(false);

  const [currentPw, setCurrentPw]   = useState("");
  const [newPw, setNewPw]           = useState("");
  const [confirmPw, setConfirmPw]   = useState("");
  const [savingPw, setSavingPw]     = useState(false);

  const [sq1, setSq1]           = useState(QUESTIONS[0]);
  const [sa1, setSa1]           = useState("");
  const [sq2, setSq2]           = useState(QUESTIONS[1]);
  const [sa2, setSa2]           = useState("");
  const [savingSq, setSavingSq] = useState(false);
  const [sqSaved, setSqSaved]   = useState(false);

  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (!session?.user?.email) return;
    fetch(`${API_URL}/auth/security-questions/${encodeURIComponent(session.user.email)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setSq1(d.q1); setSq2(d.q2); setSqSaved(true); } })
      .catch(() => {});
  }, [session?.user?.email]);

  if (status === "loading") return null;
  if (!session) { router.replace("/login"); return null; }

  const userId = session.user.id;
  const email  = session.user.email ?? "";

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  }

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSavingName(true);
    try {
      const r = await fetch(`${API_URL}/auth/profile`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, name: name.trim() }),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); showToast(d.detail || "Failed to update name", "error"); }
      else showToast("Name updated successfully", "success");
    } catch { showToast("Network error", "error"); }
    finally { setSavingName(false); }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPw !== confirmPw) { showToast("New passwords do not match", "error"); return; }
    if (newPw.length < 8)    { showToast("Password must be at least 8 characters", "error"); return; }
    setSavingPw(true);
    try {
      const r = await fetch(`${API_URL}/auth/profile`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, current_password: currentPw, new_password: newPw }),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); showToast(d.detail || "Failed to update password", "error"); }
      else { showToast("Password updated", "success"); setCurrentPw(""); setNewPw(""); setConfirmPw(""); }
    } catch { showToast("Network error", "error"); }
    finally { setSavingPw(false); }
  }

  async function saveSecurityQuestions(e: React.FormEvent) {
    e.preventDefault();
    if (sq1 === sq2) { showToast("Please choose two different questions", "error"); return; }
    if (!sa1.trim() || !sa2.trim()) { showToast("Please fill in both answers", "error"); return; }
    setSavingSq(true);
    try {
      const r = await fetch(`${API_URL}/auth/security-questions`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, q1: sq1, a1: sa1, q2: sq2, a2: sa2 }),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); showToast(d.detail || "Failed to save", "error"); }
      else { showToast("Security questions saved", "success"); setSqSaved(true); setSa1(""); setSa2(""); }
    } catch { showToast("Network error", "error"); }
    finally { setSavingSq(false); }
  }

  const initials = (session.user.name ?? email).split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

  const submitBtn = (label: string, loading: boolean, disabled = false): React.CSSProperties => ({
    padding: "10px 22px", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "#fff",
    background: G, border: "none", cursor: (loading || disabled) ? "not-allowed" : "pointer",
    opacity: (loading || disabled) ? 0.65 : 1, transition: "background 0.12s",
  });

  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6", display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <header style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 28px", height: 60, borderBottom: "1px solid #e5e7eb", background: "#fff", flexShrink: 0 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <div style={{ width: 30, height: 30, borderRadius: 7, background: G, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>📚</div>
          <span style={{ fontWeight: 800, fontSize: 17, color: "#111827" }}>media<span style={{ color: G }}>lib</span></span>
        </Link>
        <svg width="6" height="12" viewBox="0 0 6 12" fill="none" style={{ color: "#d1d5db" }}>
          <path d="M1 1l4 5-4 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#6b7280" }}>Profile</span>
      </header>

      {/* Content */}
      <div style={{ flex: 1, display: "flex", justifyContent: "center", padding: "36px 24px" }}>
        <div style={{ width: "100%", maxWidth: 560, display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Avatar card */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: G, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: "#fff", flexShrink: 0, boxShadow: "0 4px 14px rgba(12,170,65,0.3)" }}>
                {initials}
              </div>
              <div>
                <p style={{ fontSize: 20, fontWeight: 800, color: "#111827", margin: 0 }}>{session.user.name ?? "User"}</p>
                <p style={{ fontSize: 14, color: "#6b7280", margin: "3px 0 0" }}>{email}</p>
              </div>
            </div>
          </div>

          {/* Display Name */}
          <SectionCard title="Display Name" subtitle="This is how you appear across the app">
            <form onSubmit={saveName} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Name</label>
                <input style={inputBase} type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Your name" onFocus={focusOn} onBlur={focusOff} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button type="submit" disabled={savingName || !name.trim()} style={submitBtn(savingName ? "Saving…" : "Save name", savingName, !name.trim())}
                  onMouseEnter={e => { if (!savingName && name.trim()) (e.currentTarget as HTMLElement).style.background = G_DARK; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = G; }}>
                  {savingName ? "Saving…" : "Save name"}
                </button>
              </div>
            </form>
          </SectionCard>

          {/* Change Password */}
          <SectionCard title="Change Password" subtitle="Must be at least 8 characters">
            <form onSubmit={savePassword} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {([
                { label: "Current password",     val: currentPw, set: setCurrentPw, auto: "current-password" },
                { label: "New password",          val: newPw,     set: setNewPw,     auto: "new-password" },
                { label: "Confirm new password",  val: confirmPw, set: setConfirmPw, auto: "new-password" },
              ] as const).map(({ label, val, set, auto }) => (
                <div key={label}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>{label}</label>
                  <input style={inputBase} type="password" value={val} onChange={e => set(e.target.value as any)}
                    autoComplete={auto} placeholder="••••••••" onFocus={focusOn} onBlur={focusOff} />
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button type="submit" disabled={savingPw || !currentPw || !newPw || !confirmPw} style={submitBtn("Update password", savingPw, !currentPw || !newPw || !confirmPw)}
                  onMouseEnter={e => { if (!savingPw && currentPw && newPw && confirmPw) (e.currentTarget as HTMLElement).style.background = G_DARK; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = G; }}>
                  {savingPw ? "Saving…" : "Update password"}
                </button>
              </div>
            </form>
          </SectionCard>

          {/* Security Questions */}
          <SectionCard
            title="Security Questions"
            subtitle="Used to verify your identity if you forget your password"
            badge={sqSaved ? (
              <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20, background: "#f0fdf4", color: G, border: "1px solid #bbf7d0" }}>✓ Set up</span>
            ) : undefined}>
            <form onSubmit={saveSecurityQuestions} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {([
                { label: "Question 1", q: sq1, setQ: setSq1, a: sa1, setA: setSa1, exclude: sq2 },
                { label: "Question 2", q: sq2, setQ: setSq2, a: sa2, setA: setSa2, exclude: sq1 },
              ] as const).map(({ label, q, setQ, a, setA, exclude }) => (
                <div key={label} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>{label}</label>
                  <div style={{ position: "relative" }}>
                    <select value={q} onChange={e => setQ(e.target.value)}
                      style={{ ...inputBase, cursor: "pointer", appearance: "none" as any }}
                      onFocus={focusOn} onBlur={focusOff}>
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
                    placeholder={sqSaved ? "Enter new answer to update" : "Your answer"}
                    onFocus={focusOn} onBlur={focusOff} />
                </div>
              ))}
              <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>
                Answers are not case-sensitive. Keep them memorable but not obvious.
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button type="submit" disabled={savingSq || !sa1.trim() || !sa2.trim()} style={submitBtn(savingSq ? "Saving…" : sqSaved ? "Update questions" : "Save questions", savingSq, !sa1.trim() || !sa2.trim())}
                  onMouseEnter={e => { if (!savingSq && sa1.trim() && sa2.trim()) (e.currentTarget as HTMLElement).style.background = G_DARK; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = G; }}>
                  {savingSq ? "Saving…" : sqSaved ? "Update questions" : "Save questions"}
                </button>
              </div>
            </form>
          </SectionCard>

        </div>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  );
}
