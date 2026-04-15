"use client";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";

export default function AuthButton() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  function toggle() {
    if (ref.current) { const r = ref.current.getBoundingClientRect(); setPos({ top: r.bottom + 8, right: window.innerWidth - r.right }); }
    setOpen(o => !o);
  }

  if (status === "loading") return <div className="w-9 h-9 rounded-full bg-white/10 animate-pulse" />;

  if (session?.user) {
    const full = session.user.name ?? session.user.email ?? "User";
    const initials = full.split(" ").map((w: string) => w[0]).join("").slice(0,2).toUpperCase();
    return (
      <div className="relative" ref={ref}>
        <button onClick={toggle} className="flex items-center gap-2 hover:bg-white/5 rounded-xl px-2 py-1.5 transition-all" aria-label="User menu" aria-expanded={open}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white ring-2 ring-white/10"
            style={{ background: "linear-gradient(135deg,#a855f7,#7c3aed)" }}>{initials}</div>
          <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {open && (
          <div className="fixed w-52 rounded-2xl overflow-hidden z-[9999]" role="menu"
            style={{ top: pos.top, right: pos.right, background: "#141428", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}>
            <div className="px-4 py-3 border-b border-white/5">
              <p className="text-sm font-semibold text-slate-100 truncate">{full}</p>
              <p className="text-xs text-slate-500 truncate">{session.user.email}</p>
            </div>
            <div className="py-1.5">
              <button onClick={() => { setOpen(false); signOut({ callbackUrl: "/login" }); }}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 w-full text-left transition-colors" role="menuitem">
                <span className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-xs">→</span>
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <Link href="/login" className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
      style={{ background: "linear-gradient(135deg,#7c3aed,#5b21b6)", boxShadow: "0 4px 16px rgba(124,58,237,0.4)" }}>
      Sign in
    </Link>
  );
}
