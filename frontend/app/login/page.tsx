"use client";
import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
  const { status } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const [tab, setTab] = useState<"login"|"signup">("login");
  const [resetSuccess] = useState(params.get("reset") === "1");
  const [name, setName] = useState(""); const [email, setEmail] = useState("");
  const [password, setPassword] = useState(""); const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);

  useEffect(() => { if (status === "authenticated") router.replace("/"); }, [status, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setLoading(true);
    try {
      const result = await signIn("credentials", { email, password, name, mode: tab, redirect: false });
      if (result?.error) setError(result.error === "CredentialsSignin" ? "Invalid email or password" : result.error);
      else router.replace("/");
    } catch { setError("Something went wrong."); } finally { setLoading(false); }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", borderRadius: 10, padding: "12px 14px",
    fontSize: 14, color: "#f1f5f9", background: "#0f0f1a",
    border: "1px solid rgba(255,255,255,0.15)", outline: "none", fontFamily: "inherit",
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "radial-gradient(ellipse 80% 60% at 50% -10%, #1e0a4a 0%, #0d0920 45%, #09090f 100%)" }}>
      <div className="w-full" style={{ maxWidth: 440 }}>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl text-2xl mb-4"
            style={{ background: "linear-gradient(145deg,#a855f7,#7c3aed)", boxShadow: "0 8px 32px rgba(168,85,247,0.4)" }}>
            📚
          </div>
          <h1 className="text-2xl font-bold text-white">Medialib</h1>
          <p className="text-slate-500 text-sm mt-1">Your personal media library</p>
        </div>

        {resetSuccess && (
          <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 12, background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)", color: "#10b981", fontSize: 14, fontWeight: 600, textAlign: "center" }}>
            ✓ Password reset successfully — sign in with your new password
          </div>
        )}
        <div className="rounded-2xl" style={{ background: "linear-gradient(180deg,#141428 0%,#0f0f22 100%)", border: "1px solid rgba(168,85,247,0.2)", boxShadow: "0 24px 60px rgba(0,0,0,0.6)" }}>
          <div className="flex m-4 mb-0 rounded-xl p-1 gap-1" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)" }}>
            {(["login","signup"] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); setError(null); }}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all focus-visible:outline-none"
                style={tab === t ? { background: "linear-gradient(135deg,#7c3aed,#5b21b6)", color: "#fff", boxShadow: "0 2px 10px rgba(124,58,237,0.4)" } : { color: "#64748b" }}>
                {t === "login" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <div style={{ padding: "24px 28px 28px" }}>
            <form onSubmit={handleSubmit} noValidate>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {tab === "signup" && (
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 6, letterSpacing: "0.06em" }}>FULL NAME</label>
                    <input style={inputStyle} type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" autoComplete="name"
                      onFocus={e => { e.currentTarget.style.borderColor = "#a855f7"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(168,85,247,0.2)"; }}
                      onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.boxShadow = "none"; }} />
                  </div>
                )}
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 6, letterSpacing: "0.06em" }}>EMAIL</label>
                  <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email"
                    onFocus={e => { e.currentTarget.style.borderColor = "#a855f7"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(168,85,247,0.2)"; }}
                    onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.boxShadow = "none"; }} />
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", letterSpacing: "0.06em" }}>PASSWORD</label>
                    {tab === "login" && (
                      <a href="/forgot-password" style={{ fontSize: 11, color: "#7c3aed", textDecoration: "none", fontWeight: 600 }}>Forgot password?</a>
                    )}
                  </div>
                  <input style={inputStyle} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="8+ characters" minLength={8}
                    autoComplete={tab === "login" ? "current-password" : "new-password"}
                    onFocus={e => { e.currentTarget.style.borderColor = "#a855f7"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(168,85,247,0.2)"; }}
                    onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.boxShadow = "none"; }} />
                </div>
                {error && (
                  <div role="alert" style={{ display:"flex", gap:8, background:"rgba(127,29,29,0.4)", border:"1px solid rgba(185,28,28,0.5)", borderRadius:10, padding:"10px 14px" }}>
                    <span style={{ color:"#f87171" }}>⚠</span>
                    <p style={{ fontSize:12, color:"#f87171" }}>{error}</p>
                  </div>
                )}
                <button type="submit" disabled={loading}
                  className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-all disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg,#7c3aed,#5b21b6)", boxShadow: "0 4px 20px rgba(124,58,237,0.4)" }}>
                  {loading ? "Please wait…" : tab === "login" ? "Sign in →" : "Create account →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
}
