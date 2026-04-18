"use client";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";

const G = "#0CAA41";

export default function AuthButton() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  if (status === "loading") return <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#f3f4f6" }} />;

  if (session?.user) {
    const full = session.user.name ?? session.user.email ?? "User";
    const initials = full.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

    return (
      <div style={{ position: "relative" }} ref={ref}>
        <button
          onClick={() => setOpen(o => !o)}
          aria-label="User menu"
          aria-expanded={open}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 12px 5px 5px", borderRadius: 24, background: open ? "#f0fdf4" : "#f9fafb", border: `1.5px solid ${open ? G : "#e5e7eb"}`, cursor: "pointer", transition: "all 0.12s" }}
        >
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: G, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
            {initials}
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#374151", maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{full}</span>
          <svg style={{ width: 12, height: 12, color: "#6b7280", transition: "transform 0.15s", transform: open ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 228, borderRadius: 12, overflow: "hidden", zIndex: 9999, background: "#fff", border: "1px solid #e5e7eb", boxShadow: "0 10px 40px rgba(0,0,0,0.12)" }}>
            {/* Header */}
            <div style={{ padding: "14px 16px", borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: G, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                  {initials}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{full}</p>
                  <p style={{ fontSize: 12, color: "#6b7280", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session.user.email}</p>
                </div>
              </div>
            </div>

            <div style={{ padding: "6px" }}>
              <Link href="/profile" onClick={() => setOpen(false)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 8, textDecoration: "none", color: "#374151", fontSize: 14, fontWeight: 500, transition: "background 0.1s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <span style={{ width: 30, height: 30, borderRadius: 8, background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>👤</span>
                Profile & Settings
              </Link>

              <div style={{ height: 1, background: "#f3f4f6", margin: "4px 0" }} />

              <button
                onClick={() => { setOpen(false); signOut({ callbackUrl: "/login" }); }}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 8, width: "100%", background: "transparent", border: "none", color: "#dc2626", fontSize: 14, fontWeight: 500, cursor: "pointer", textAlign: "left", transition: "background 0.1s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#fef2f2")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <span style={{ width: 30, height: 30, borderRadius: 8, background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>↪</span>
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <Link href="/login"
        style={{ padding: "9px 18px", borderRadius: 8, fontSize: 14, fontWeight: 600, color: "#374151", background: "transparent", textDecoration: "none", border: "1.5px solid #e5e7eb", transition: "all 0.12s" }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = G; (e.currentTarget as HTMLElement).style.color = G; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#e5e7eb"; (e.currentTarget as HTMLElement).style.color = "#374151"; }}>
        Sign in
      </Link>
      <Link href="/login"
        style={{ padding: "9px 18px", borderRadius: 8, fontSize: 14, fontWeight: 700, color: "#fff", background: G, textDecoration: "none", boxShadow: "0 2px 8px rgba(12,170,65,0.3)" }}>
        Get started
      </Link>
    </div>
  );
}
