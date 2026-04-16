"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { API_URL } from "../lib/api";

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", borderRadius: 12, padding: "12px 14px",
  fontSize: 14, color: "#f1f5f9", background: "#0a0a14",
  border: "1px solid rgba(255,255,255,0.1)", outline: "none", fontFamily: "inherit",
};

function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div style={{ position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)", zIndex: 100, padding: "12px 24px", borderRadius: 16, background: type === "success" ? "#10b981" : "#ef4444", color: "#fff", fontSize: 14, fontWeight: 700, boxShadow: `0 8px 32px ${type === "success" ? "rgba(16,185,129,0.4)" : "rgba(239,68,68,0.4)"}`, pointerEvents: "none" }}>
      {type === "success" ? "✓ " : "⚠ "}{msg}
    </div>
  );
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [name, setName] = useState(session?.user?.name ?? "");
  const [savingName, setSavingName] = useState(false);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  if (status === "loading") return null;
  if (!session) { router.replace("/login"); return null; }

  const userId = session.user.id;
  const email = session.user.email ?? "";

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
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, name: name.trim() }),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); showToast(d.detail || "Failed to update name", "error"); }
      else showToast("Name updated", "success");
    } catch { showToast("Network error", "error"); }
    finally { setSavingName(false); }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPw !== confirmPw) { showToast("New passwords do not match", "error"); return; }
    if (newPw.length < 8) { showToast("Password must be at least 8 characters", "error"); return; }
    setSavingPw(true);
    try {
      const r = await fetch(`${API_URL}/auth/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, current_password: currentPw, new_password: newPw }),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); showToast(d.detail || "Failed to update password", "error"); }
      else { showToast("Password updated", "success"); setCurrentPw(""); setNewPw(""); setConfirmPw(""); }
    } catch { showToast("Network error", "error"); }
    finally { setSavingPw(false); }
  }

  const initials = (session.user.name ?? email).split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div style={{ minHeight: "100vh", background: "#09090f", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header style={{ display: "flex", alignItems: "center", gap: 16, padding: "0 32px", height: 64, borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#0c0c18", flexShrink: 0 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(145deg,#a855f7,#6d28d9)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>📚</div>
          <span style={{ fontWeight: 800, color: "#fff", fontSize: 16 }}>Medialib</span>
        </Link>
        <span style={{ color: "#2d2d4a", fontSize: 18 }}>/</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#64748b" }}>Profile</span>
      </header>

      {/* Content */}
      <div style={{ flex: 1, display: "flex", justifyContent: "center", padding: "48px 24px" }}>
        <div style={{ width: "100%", maxWidth: 520, display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Avatar card */}
          <div style={{ borderRadius: 24, padding: "28px 32px", background: "#0f0f1e", border: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg,#a855f7,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
              {initials}
            </div>
            <div>
              <p style={{ fontSize: 20, fontWeight: 800, color: "#f1f5f9", margin: 0 }}>{session.user.name ?? "User"}</p>
              <p style={{ fontSize: 14, color: "#475569", margin: "4px 0 0" }}>{email}</p>
            </div>
          </div>

          {/* Name section */}
          <div style={{ borderRadius: 24, background: "#0f0f1e", border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
            <div style={{ padding: "20px 28px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>Display Name</p>
              <p style={{ fontSize: 13, color: "#475569", margin: "4px 0 0" }}>This is how you appear across the app</p>
            </div>
            <form onSubmit={saveName} style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", letterSpacing: "0.08em", marginBottom: 8 }}>NAME</label>
                <input
                  style={inputStyle} type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  onFocus={e => { e.currentTarget.style.borderColor = "#a855f7"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(168,85,247,0.15)"; }}
                  onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.boxShadow = "none"; }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button type="submit" disabled={savingName || !name.trim()}
                  style={{ padding: "10px 24px", borderRadius: 12, fontSize: 13, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg,#7c3aed,#5b21b6)", border: "none", cursor: savingName ? "wait" : "pointer", opacity: (!name.trim() || savingName) ? 0.6 : 1, transition: "opacity 0.15s" }}>
                  {savingName ? "Saving…" : "Save name"}
                </button>
              </div>
            </form>
          </div>

          {/* Password section */}
          <div style={{ borderRadius: 24, background: "#0f0f1e", border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
            <div style={{ padding: "20px 28px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>Change Password</p>
              <p style={{ fontSize: 13, color: "#475569", margin: "4px 0 0" }}>Must be at least 8 characters</p>
            </div>
            <form onSubmit={savePassword} style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
              {([
                { label: "CURRENT PASSWORD", val: currentPw, set: setCurrentPw, auto: "current-password" },
                { label: "NEW PASSWORD",     val: newPw,     set: setNewPw,     auto: "new-password" },
                { label: "CONFIRM NEW PASSWORD", val: confirmPw, set: setConfirmPw, auto: "new-password" },
              ] as const).map(({ label, val, set, auto }) => (
                <div key={label}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", letterSpacing: "0.08em", marginBottom: 8 }}>{label}</label>
                  <input
                    style={inputStyle} type="password" value={val} onChange={e => set(e.target.value as any)}
                    autoComplete={auto} placeholder="••••••••"
                    onFocus={e => { e.currentTarget.style.borderColor = "#a855f7"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(168,85,247,0.15)"; }}
                    onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.boxShadow = "none"; }}
                  />
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button type="submit" disabled={savingPw || !currentPw || !newPw || !confirmPw}
                  style={{ padding: "10px 24px", borderRadius: 12, fontSize: 13, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg,#7c3aed,#5b21b6)", border: "none", cursor: savingPw ? "wait" : "pointer", opacity: (!currentPw || !newPw || !confirmPw || savingPw) ? 0.6 : 1, transition: "opacity 0.15s" }}>
                  {savingPw ? "Saving…" : "Update password"}
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  );
}
