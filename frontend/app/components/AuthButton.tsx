"use client";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";

export default function AuthButton() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  if (status === "loading") return <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />;

  if (session?.user) {
    const full = session.user.name ?? session.user.email ?? "User";
    const initials = full.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

    return (
      <div style={{ position: "relative" }} ref={ref}>
        <button
          onClick={() => setOpen(o => !o)}
          aria-label="User menu"
          aria-expanded={open}
          style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 12px 6px 6px", borderRadius: 20, background: open ? "rgba(168,85,247,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${open ? "rgba(168,85,247,0.3)" : "rgba(255,255,255,0.07)"}`, cursor: "pointer", transition: "all 0.15s" }}
        >
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#a855f7,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
            {initials}
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{full}</span>
          <svg style={{ width: 12, height: 12, color: "#475569", transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div style={{ position: "absolute", top: "calc(100% + 10px)", right: 0, width: 240, borderRadius: 18, overflow: "hidden", zIndex: 9999, background: "#141428", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 24px 64px rgba(0,0,0,0.7)" }}>
            {/* Header */}
            <div style={{ padding: "16px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#a855f7,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                  {initials}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{full}</p>
                  <p style={{ fontSize: 12, color: "#475569", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session.user.email}</p>
                </div>
              </div>
            </div>

            {/* Menu items */}
            <div style={{ padding: "8px" }}>
              <Link href="/profile" onClick={() => setOpen(false)}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 12px", borderRadius: 12, textDecoration: "none", color: "#cbd5e1", fontSize: 14, fontWeight: 500, transition: "background 0.12s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <span style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(168,85,247,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>👤</span>
                Profile
              </Link>

              <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "6px 0" }} />

              <button
                onClick={() => { setOpen(false); signOut({ callbackUrl: "/login" }); }}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 12px", borderRadius: 12, width: "100%", background: "transparent", border: "none", color: "#f87171", fontSize: 14, fontWeight: 500, cursor: "pointer", textAlign: "left", transition: "background 0.12s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,0.08)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <span style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(239,68,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>→</span>
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <Link href="/login"
      style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 14, fontSize: 14, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg,#7c3aed,#5b21b6)", textDecoration: "none", boxShadow: "0 4px 16px rgba(124,58,237,0.4)" }}>
      Sign in
    </Link>
  );
}
