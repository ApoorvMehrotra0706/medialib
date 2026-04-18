"use client";
import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";

const G = "#0CAA41";
const G_DARK = "#0a8f36";

function LoginForm() {
  const { status } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [resetSuccess] = useState(params.get("reset") === "1");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (status === "authenticated") router.replace("/"); }, [status, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setLoading(true);
    try {
      const result = await signIn("credentials", { email, password, name, mode: tab, redirect: false });
      if (result?.error) setError(result.error === "CredentialsSignin" ? "Invalid email or password" : result.error);
      else router.replace(tab === "signup" ? "/setup-security" : "/");
    } catch { setError("Something went wrong."); } finally { setLoading(false); }
  }

  const inputBase: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", borderRadius: 8, padding: "11px 14px",
    fontSize: 14, color: "#111827", background: "#f9fafb",
    border: "1.5px solid #e5e7eb", outline: "none", fontFamily: "inherit", transition: "border-color 0.15s",
  };

  function onFocus(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.borderColor = G;
    e.currentTarget.style.boxShadow = `0 0 0 3px rgba(12,170,65,0.12)`;
    e.currentTarget.style.background = "#fff";
  }
  function onBlur(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.borderColor = "#e5e7eb";
    e.currentTarget.style.boxShadow = "none";
    e.currentTarget.style.background = "#f9fafb";
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#f3f4f6" }}>

      {/* Left green panel */}
      <div style={{ display: "none", flex: "0 0 420px", background: `linear-gradient(160deg, ${G} 0%, #059669 100%)`, padding: "60px 48px", flexDirection: "column", justifyContent: "space-between" }} className="lg-panel">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 64 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📚</div>
            <span style={{ fontWeight: 800, fontSize: 20, color: "#fff" }}>medialib</span>
          </div>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: "#fff", lineHeight: 1.25, marginBottom: 16 }}>
            Track everything<br />you consume
          </h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.8)", lineHeight: 1.7 }}>
            Movies, books, TV shows, games, anime — all in one beautiful library.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {["🎬 Movies & TV Shows", "📚 Books", "🎮 Games", "⛩️ Anime"].map(item => (
            <div key={item} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 18 }}>{item.split(" ")[0]}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>{item.slice(item.indexOf(" ") + 1)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
        <div style={{ width: "100%", maxWidth: 420 }}>

          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 52, height: 52, borderRadius: 12, background: G, fontSize: 24, marginBottom: 14, boxShadow: "0 4px 16px rgba(12,170,65,0.35)" }}>📚</div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: "0 0 4px" }}>
              media<span style={{ color: G }}>lib</span>
            </h1>
            <p style={{ fontSize: 14, color: "#6b7280" }}>Your personal media library</p>
          </div>

          {resetSuccess && (
            <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 8, background: "#f0fdf4", border: "1px solid #bbf7d0", color: G, fontSize: 14, fontWeight: 600, textAlign: "center" }}>
              ✓ Password reset — sign in with your new password
            </div>
          )}

          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", boxShadow: "0 4px 24px rgba(0,0,0,0.06)", overflow: "hidden" }}>
            {/* Tab switcher */}
            <div style={{ display: "flex", borderBottom: "1px solid #f3f4f6" }}>
              {(["login", "signup"] as const).map(t => (
                <button key={t} onClick={() => { setTab(t); setError(null); }}
                  style={{ flex: 1, padding: "14px 0", fontSize: 14, fontWeight: 600, background: "transparent", border: "none", cursor: "pointer", color: tab === t ? G : "#9ca3af", borderBottom: tab === t ? `2px solid ${G}` : "2px solid transparent", transition: "all 0.15s", marginBottom: -1 }}>
                  {t === "login" ? "Sign in" : "Create account"}
                </button>
              ))}
            </div>

            <div style={{ padding: "28px" }}>
              <form onSubmit={handleSubmit} noValidate>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {tab === "signup" && (
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Full Name</label>
                      <input style={inputBase} type="text" value={name} onChange={e => setName(e.target.value)}
                        placeholder="Your name" autoComplete="name" onFocus={onFocus} onBlur={onBlur} />
                    </div>
                  )}
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Email address</label>
                    <input style={inputBase} type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com" autoComplete="email" onFocus={onFocus} onBlur={onBlur} />
                  </div>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Password</label>
                      {tab === "login" && (
                        <Link href="/forgot-password" style={{ fontSize: 12, color: G, textDecoration: "none", fontWeight: 600 }}>Forgot password?</Link>
                      )}
                    </div>
                    <input style={inputBase} type="password" value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="8+ characters" minLength={8}
                      autoComplete={tab === "login" ? "current-password" : "new-password"}
                      onFocus={onFocus} onBlur={onBlur} />
                  </div>

                  {error && (
                    <div role="alert" style={{ display: "flex", gap: 8, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px" }}>
                      <span style={{ color: "#dc2626" }}>⚠</span>
                      <p style={{ fontSize: 13, color: "#dc2626", margin: 0 }}>{error}</p>
                    </div>
                  )}

                  <button type="submit" disabled={loading}
                    style={{ width: "100%", padding: "12px", borderRadius: 8, fontSize: 15, fontWeight: 700, color: "#fff", background: G, border: "none", cursor: loading ? "wait" : "pointer", opacity: loading ? 0.75 : 1, transition: "background 0.15s", marginTop: 4 }}
                    onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = G_DARK; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = G; }}>
                    {loading ? "Please wait…" : tab === "login" ? "Sign in" : "Create account"}
                  </button>
                </div>
              </form>

              {tab === "signup" && (
                <p style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", marginTop: 16, lineHeight: 1.6 }}>
                  By signing up you agree to our{" "}
                  <span style={{ color: G, fontWeight: 600, cursor: "pointer" }}>Terms of Service</span>{" "}and{" "}
                  <span style={{ color: G, fontWeight: 600, cursor: "pointer" }}>Privacy Policy</span>
                </p>
              )}
            </div>
          </div>

          <p style={{ textAlign: "center", fontSize: 13, color: "#9ca3af", marginTop: 20 }}>
            {tab === "login" ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => { setTab(tab === "login" ? "signup" : "login"); setError(null); }}
              style={{ background: "none", border: "none", color: G, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
              {tab === "login" ? "Sign up free" : "Sign in"}
            </button>
          </p>
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
