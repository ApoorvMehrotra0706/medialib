"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AuthButton from "./components/AuthButton";
import { MediaItem, MediaType, SearchResult, Status } from "./lib/types";
import { API_URL } from "./lib/api";

const G = "#0CAA41";
const G_DARK = "#0a8f36";

const TYPES: { key: MediaType | "all"; label: string; emoji: string }[] = [
  { key: "all",   label: "All Media",  emoji: "🗂️" },
  { key: "movie", label: "Movies",     emoji: "🎬" },
  { key: "tv",    label: "TV Shows",   emoji: "📺" },
  { key: "book",  label: "Books",      emoji: "📚" },
  { key: "game",  label: "Games",      emoji: "🎮" },
  { key: "anime", label: "Anime",      emoji: "⛩️" },
];

const STATUSES: { key: Status; label: string; color: string; bg: string; border: string }[] = [
  { key: "want",      label: "Want to",     color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
  { key: "ongoing",   label: "In Progress", color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  { key: "completed", label: "Completed",   color: G,         bg: "#f0fdf4", border: "#bbf7d0" },
  { key: "dropped",   label: "Dropped",     color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
];

const TYPE_COLORS: Record<string, string> = {
  movie: "#6366f1", tv: "#0ea5e9", book: "#f59e0b", game: "#ec4899", anime: "#8b5cf6", all: "#6b7280",
};

function MediaIcon({ type, size = 24 }: { type: string; size?: number }) {
  const icons: Record<string, string> = { book: "📚", movie: "🎬", tv: "📺", game: "🎮", anime: "⛩️" };
  return <span style={{ fontSize: size }}>{icons[type] ?? "🗂️"}</span>;
}

function StarDisplay({ rating, max = 10 }: { rating?: number | null; max?: number }) {
  if (!rating) return <span style={{ color: "#9ca3af", fontSize: 12 }}>Not rated</span>;
  const pct = rating / max;
  const stars = Math.round(pct * 5 * 2) / 2; // 0.5 precision out of 5
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
      <span style={{ color: "#FFB900", fontSize: 13, letterSpacing: -1 }}>
        {"★".repeat(Math.floor(stars))}{"☆".repeat(5 - Math.ceil(stars))}
      </span>
      <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>{rating}/10</span>
    </span>
  );
}

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();

  const [activeType, setActiveType]       = useState<MediaType | "all">("all");
  const [library, setLibrary]             = useState<MediaItem[]>([]);
  const [query, setQuery]                 = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching]         = useState(false);
  const [showSearch, setShowSearch]       = useState(false);
  const [selected, setSelected]           = useState<MediaItem | null>(null);
  const [loadingLib, setLoadingLib]       = useState(false);
  const [reviewText, setReviewText]       = useState("");
  const [editingReview, setEditingReview] = useState(false);
  const [savingReview, setSavingReview]   = useState(false);
  const [savedToast, setSavedToast]       = useState(false);
  const [addingId, setAddingId]           = useState<string | null>(null);

  const userId = session?.user?.id;

  const fetchLibrary = useCallback(async () => {
    if (!userId) return;
    setLoadingLib(true);
    try {
      const url = `${API_URL}/library/${userId}${activeType !== "all" ? `?type=${activeType}` : ""}`;
      const r = await fetch(url);
      setLibrary(await r.json());
    } catch {} finally { setLoadingLib(false); }
  }, [userId, activeType]);

  useEffect(() => { fetchLibrary(); }, [fetchLibrary]);

  useEffect(() => {
    if (!query.trim()) { setSearchResults([]); setShowSearch(false); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await fetch(
          `${API_URL}/search?q=${encodeURIComponent(query)}&type=${activeType === "all" ? "all" : activeType}`
        );
        setSearchResults(await r.json());
        setShowSearch(true);
      } catch {} finally { setSearching(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [query, activeType]);

  useEffect(() => {
    if (selected) { setReviewText(selected.review || ""); setEditingReview(false); }
  }, [selected?.id]);

  async function addToLibrary(item: SearchResult) {
    if (!userId) { router.push("/login"); return; }
    setAddingId(item.external_id);
    try {
      await fetch(`${API_URL}/library`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, ...item }),
      });
      setQuery(""); setShowSearch(false); setSearchResults([]);
      fetchLibrary();
    } finally { setAddingId(null); }
  }

  async function updateItem(id: string, patch: { status?: Status; rating?: number; review?: string }) {
    if (!userId) return;
    await fetch(`${API_URL}/library/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, ...patch }),
    });
    fetchLibrary();
    setSelected(prev => prev ? { ...prev, ...patch } : null);
  }

  async function saveReview() {
    if (!selected) return;
    setSavingReview(true);
    await updateItem(selected.id, { review: reviewText });
    setSavingReview(false);
    setEditingReview(false);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 5000);
  }

  async function deleteItem(id: string) {
    if (!userId) return;
    await fetch(`${API_URL}/library/${id}/${userId}`, { method: "DELETE" });
    setSelected(null);
    fetchLibrary();
  }

  const filtered = activeType === "all" ? library : library.filter(i => i.media_type === activeType);
  const typeInfo  = TYPES.find(t => t.key === activeType)!;

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100vh", overflow: "hidden", background: "#f3f4f6" }}>

      {/* ── Header ─────────────────────────────────── */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", height: 60, flexShrink: 0, background: "#fff", borderBottom: "1px solid #e5e7eb", zIndex: 40 }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: G, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>📚</div>
          <span style={{ fontWeight: 800, fontSize: 18, color: "#111827", letterSpacing: "-0.5px" }}>
            media<span style={{ color: G }}>lib</span>
          </span>
        </div>

        {/* Search bar */}
        <div style={{ position: "relative", flex: 1, maxWidth: 540, margin: "0 32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, borderRadius: 8, padding: "9px 16px", background: "#f9fafb", border: "1.5px solid #e5e7eb", transition: "border-color 0.15s" }}
            onFocus={() => {}} onBlur={() => {}}>
            <svg width="16" height="16" fill="none" stroke="#9ca3af" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="7"/><path strokeLinecap="round" d="M21 21l-4-4"/>
            </svg>
            <input
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 14, color: "#111827", fontFamily: "inherit" }}
              placeholder={`Search ${activeType === "all" ? "movies, books, games…" : typeInfo.label.toLowerCase() + "…"}`}
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            {searching && (
              <div style={{ width: 15, height: 15, border: `2px solid ${G}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />
            )}
          </div>

          {/* Search dropdown */}
          {showSearch && searchResults.length > 0 && (
            <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, borderRadius: 10, overflow: "hidden", zIndex: 50, background: "#fff", border: "1px solid #e5e7eb", boxShadow: "0 10px 40px rgba(0,0,0,0.12)", maxHeight: 440, overflowY: "auto" }}>
              <div style={{ padding: "8px 14px 6px", borderBottom: "1px solid #f3f4f6" }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", margin: 0 }}>Search results</p>
              </div>
              {searchResults.map((r, i) => (
                <button key={i} onClick={() => addToLibrary(r)}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "transparent", border: "none", cursor: addingId === r.external_id ? "wait" : "pointer", borderBottom: "1px solid #f9fafb", textAlign: "left" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  {r.cover
                    ? <img src={r.cover} alt="" style={{ width: 32, height: 46, objectFit: "cover", borderRadius: 6, flexShrink: 0, border: "1px solid #e5e7eb" }} />
                    : <div style={{ width: 32, height: 46, borderRadius: 6, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <MediaIcon type={r.media_type} size={16} />
                      </div>
                  }
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>{r.title}</p>
                    <p style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{[r.year, r.media_type, r.genres].filter(Boolean).join(" · ")}</p>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: G, flexShrink: 0, padding: "4px 10px", borderRadius: 20, background: "#f0fdf4", border: `1px solid #bbf7d0` }}>
                    {addingId === r.external_id ? "Adding…" : "+ Add"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <AuthButton />
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── Sidebar ─────────────────────────────── */}
        <aside style={{ width: 232, flexShrink: 0, borderRight: "1px solid #e5e7eb", display: "flex", flexDirection: "column", padding: "20px 12px", gap: 2, background: "#fff", overflowY: "auto" }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: "#9ca3af", padding: "0 12px", marginBottom: 8 }}>My Library</p>
          {TYPES.map(t => {
            const count    = t.key === "all" ? library.length : library.filter(i => i.media_type === t.key).length;
            const isActive = activeType === t.key;
            const accent   = TYPE_COLORS[t.key] ?? G;
            return (
              <button key={t.key} onClick={() => setActiveType(t.key)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, border: "none", background: isActive ? "#f0fdf4" : "transparent", color: isActive ? G : "#374151", cursor: "pointer", textAlign: "left", width: "100%", transition: "all 0.12s", borderLeft: isActive ? `3px solid ${G}` : "3px solid transparent" }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "#f9fafb"; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                <span style={{ fontSize: 17 }}>{t.emoji}</span>
                <span style={{ flex: 1, fontSize: 14, fontWeight: isActive ? 700 : 500 }}>{t.label}</span>
                {count > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: isActive ? "#dcfce7" : "#f3f4f6", color: isActive ? G : "#6b7280" }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}

          <div style={{ height: 1, background: "#f3f4f6", margin: "12px 0" }} />
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: "#9ca3af", padding: "0 12px", marginBottom: 8 }}>Status</p>
          {STATUSES.map(s => (
            <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 12px", borderRadius: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: "#4b5563", flex: 1 }}>{s.label}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af" }}>
                {library.filter(i => i.status === s.key).length}
              </span>
            </div>
          ))}

          {!session && (
            <div style={{ marginTop: "auto", padding: "16px 12px", borderTop: "1px solid #f3f4f6" }}>
              <p style={{ fontSize: 12, color: "#9ca3af", lineHeight: 1.6 }}>Sign in to save your library across devices</p>
            </div>
          )}
        </aside>

        {/* ── Main content ──────────────────────────── */}
        <main style={{ flex: 1, overflowY: "auto", padding: "28px 36px", background: "#f3f4f6" }}>
          {!session ? (
            /* Unauthenticated hero */
            <div>
              <div style={{ borderRadius: 16, background: `linear-gradient(135deg, ${G} 0%, #059669 100%)`, padding: "56px 48px", marginBottom: 32, textAlign: "center" }}>
                <div style={{ fontSize: 52, marginBottom: 16 }}>📚</div>
                <h2 style={{ fontSize: 30, fontWeight: 800, color: "#fff", marginBottom: 12, letterSpacing: "-0.5px" }}>Your personal media library</h2>
                <p style={{ fontSize: 16, color: "rgba(255,255,255,0.85)", marginBottom: 28, maxWidth: 480, margin: "0 auto 28px" }}>
                  Track every movie, book, TV show, game, and anime — all in one place
                </p>
                <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                  <a href="/login" style={{ padding: "13px 28px", borderRadius: 8, fontSize: 15, fontWeight: 700, color: G, background: "#fff", textDecoration: "none", display: "inline-block", boxShadow: "0 4px 14px rgba(0,0,0,0.15)" }}>
                    Get started — it&apos;s free
                  </a>
                  <a href="/login" style={{ padding: "13px 28px", borderRadius: 8, fontSize: 15, fontWeight: 600, color: "#fff", background: "rgba(255,255,255,0.15)", textDecoration: "none", display: "inline-block", border: "1px solid rgba(255,255,255,0.3)" }}>
                    Sign in
                  </a>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 16 }}>
                {TYPES.filter(t => t.key !== "all").map(t => (
                  <a key={t.key} href="/login" style={{ background: "#fff", borderRadius: 12, padding: "24px 16px", textAlign: "center", textDecoration: "none", border: "1px solid #e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", display: "block", transition: "box-shadow 0.15s" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 4px rgba(0,0,0,0.04)"}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>{t.emoji}</div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#374151", margin: 0 }}>{t.label}</p>
                  </a>
                ))}
              </div>
            </div>
          ) : loadingLib ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", gap: 12 }}>
              <div style={{ width: 28, height: 28, border: `3px solid ${G}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
              <span style={{ color: "#6b7280", fontSize: 14 }}>Loading your library…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center" }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, marginBottom: 16, border: "1px solid #e5e7eb" }}>
                {typeInfo.emoji}
              </div>
              <p style={{ fontSize: 17, fontWeight: 700, color: "#374151", margin: "0 0 6px" }}>
                No {activeType === "all" ? "items" : typeInfo.label.toLowerCase()} yet
              </p>
              <p style={{ fontSize: 14, color: "#9ca3af" }}>Search above to add something to your library</p>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                  <h1 style={{ fontSize: 20, fontWeight: 800, color: "#111827", margin: 0 }}>{typeInfo.label}</h1>
                  <span style={{ fontSize: 13, color: "#9ca3af", fontWeight: 500 }}>{filtered.length} {filtered.length === 1 ? "item" : "items"}</span>
                </div>
              </div>
              <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(175px, 1fr))" }}>
                {filtered.map(item => {
                  const status = STATUSES.find(s => s.key === item.status);
                  return (
                    <button key={item.id} onClick={() => setSelected(item)}
                      style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", textAlign: "left", cursor: "pointer", transition: "box-shadow 0.2s, transform 0.2s", padding: 0, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(-3px)"; el.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)"; el.style.borderColor = G; }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = ""; el.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)"; el.style.borderColor = "#e5e7eb"; }}>
                      <div style={{ position: "relative", paddingBottom: "148%", width: "100%" }}>
                        {item.cover
                          ? <img src={item.cover} alt={item.title} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                          : <div style={{ position: "absolute", inset: 0, background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8 }}>
                              <MediaIcon type={item.media_type} size={36} />
                            </div>
                        }
                        {status && (
                          <div style={{ position: "absolute", top: 8, left: 8, padding: "3px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: status.bg, color: status.color, border: `1px solid ${status.border}` }}>
                            {status.label}
                          </div>
                        )}
                        {item.rating && (
                          <div style={{ position: "absolute", bottom: 8, right: 8, padding: "3px 8px", borderRadius: 20, fontSize: 11, fontWeight: 800, background: "rgba(0,0,0,0.7)", color: "#FFB900", display: "flex", alignItems: "center", gap: 3 }}>
                            ★ {item.rating}
                          </div>
                        )}
                      </div>
                      <div style={{ padding: "10px 12px 12px" }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: "0 0 3px" }}>{item.title}</p>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>{item.year || "—"}</p>
                          <span style={{ fontSize: 10, fontWeight: 600, color: TYPE_COLORS[item.media_type] ?? G, background: "#f3f4f6", padding: "2px 6px", borderRadius: 4, textTransform: "capitalize" }}>
                            {item.media_type}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </main>
      </div>

      {/* ── Detail Modal ──────────────────────────── */}
      {selected && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}
          style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
          <div style={{ width: "100%", maxWidth: 660, borderRadius: 16, overflow: "hidden", background: "#fff", boxShadow: "0 24px 80px rgba(0,0,0,0.2)", maxHeight: "92vh", display: "flex", flexDirection: "column", border: "1px solid #e5e7eb" }}>

            {/* Backdrop banner */}
            <div style={{ height: 120, position: "relative", flexShrink: 0, overflow: "hidden", background: "#f3f4f6" }}>
              {selected.cover && (
                <img src={selected.cover} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(24px) brightness(0.6)", transform: "scale(1.15)" }} />
              )}
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 30%, rgba(255,255,255,0.9) 100%)" }} />
              <button onClick={() => setSelected(null)}
                style={{ position: "absolute", top: 14, right: 14, width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.9)", border: "1px solid #e5e7eb", color: "#6b7280", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, backdropFilter: "blur(8px)" }}>
                ✕
              </button>
            </div>

            {/* Poster + info row */}
            <div style={{ display: "flex", gap: 24, padding: "0 28px", marginTop: -64 }}>
              <div style={{ flexShrink: 0, width: 110 }}>
                {selected.cover
                  ? <img src={selected.cover} alt="" style={{ width: "100%", aspectRatio: "2/3", objectFit: "cover", borderRadius: 10, border: "3px solid #fff", boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }} />
                  : <div style={{ width: "100%", aspectRatio: "2/3", borderRadius: 10, background: "#f3f4f6", border: "3px solid #fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <MediaIcon type={selected.media_type} size={32} />
                    </div>
                }
              </div>
              <div style={{ flex: 1, minWidth: 0, paddingTop: 72 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: TYPE_COLORS[selected.media_type] ?? G, background: "#f3f4f6", padding: "3px 8px", borderRadius: 4, textTransform: "capitalize" }}>
                    {selected.media_type}
                  </span>
                  {selected.year && <span style={{ fontSize: 12, color: "#9ca3af" }}>{selected.year}</span>}
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: "#111827", margin: "0 0 4px", lineHeight: 1.3 }}>{selected.title}</h2>
                {selected.genres && (
                  <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 6px" }}>{selected.genres}</p>
                )}
                {selected.rating && <StarDisplay rating={selected.rating} />}
              </div>
            </div>

            {/* Description */}
            {selected.description && (
              <div style={{ padding: "16px 28px 0" }}>
                <p style={{ fontSize: 13, color: "#4b5563", lineHeight: 1.7, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {selected.description}
                </p>
              </div>
            )}

            <div style={{ height: 1, background: "#f3f4f6", margin: "20px 0 0" }} />

            {/* Controls */}
            <div style={{ padding: "20px 28px 28px", display: "flex", flexDirection: "column", gap: 20, overflowY: "auto" }}>

              {/* Status */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: "#9ca3af", marginBottom: 10 }}>Track Status</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {STATUSES.map(s => (
                    <button key={s.key} onClick={() => updateItem(selected.id, { status: s.key })}
                      style={{
                        padding: "8px 18px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.12s",
                        ...(selected.status === s.key
                          ? { background: s.color, color: "#fff", border: `1.5px solid ${s.color}`, boxShadow: `0 2px 8px ${s.color}40` }
                          : { background: s.bg, color: s.color, border: `1.5px solid ${s.border}` }),
                      }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rating */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: "#9ca3af", marginBottom: 10 }}>
                  Your Rating {selected.rating ? <span style={{ color: "#FFB900", fontWeight: 800, fontSize: 13, textTransform: "none" }}>★ {selected.rating}/10</span> : ""}
                </p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => {
                    const active = Number(selected.rating) === n;
                    return (
                      <button key={n} onClick={() => updateItem(selected.id, { rating: n })}
                        style={{
                          width: 38, height: 38, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.12s",
                          ...(active
                            ? { background: "#FFB900", color: "#fff", border: "1.5px solid #FFB900", boxShadow: "0 2px 8px rgba(255,185,0,0.4)" }
                            : { background: "#f9fafb", color: "#4b5563", border: "1.5px solid #e5e7eb" }),
                        }}
                        onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = "#fffbeb"; (e.currentTarget as HTMLElement).style.borderColor = "#FFB900"; (e.currentTarget as HTMLElement).style.color = "#d97706"; } }}
                        onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = "#f9fafb"; (e.currentTarget as HTMLElement).style.borderColor = "#e5e7eb"; (e.currentTarget as HTMLElement).style.color = "#4b5563"; } }}>
                        {n}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Review */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: "#9ca3af", margin: 0 }}>Your Notes</p>
                  {!editingReview && (
                    <button onClick={() => setEditingReview(true)}
                      style={{ fontSize: 12, fontWeight: 600, color: G, background: "transparent", border: "none", cursor: "pointer", padding: "2px 6px" }}>
                      ✏ Edit
                    </button>
                  )}
                </div>
                {editingReview ? (
                  <textarea
                    value={reviewText}
                    onChange={e => setReviewText(e.target.value)}
                    placeholder="Write your thoughts, notes, or a review…"
                    autoFocus
                    style={{ width: "100%", minHeight: 90, borderRadius: 8, padding: "12px 14px", background: "#f9fafb", border: `1.5px solid ${G}`, color: "#111827", fontSize: 14, fontFamily: "inherit", outline: "none", resize: "vertical", lineHeight: 1.6, boxSizing: "border-box" }}
                  />
                ) : (
                  <div style={{ minHeight: 56, borderRadius: 8, padding: "12px 14px", background: "#f9fafb", border: "1.5px solid #e5e7eb", color: reviewText ? "#374151" : "#9ca3af", fontSize: 14, lineHeight: 1.6 }}>
                    {reviewText || "No notes yet. Click Edit to add one."}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, paddingTop: 4 }}>
                <button onClick={() => deleteItem(selected.id)}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", background: "#fef2f2", color: "#dc2626", border: "1.5px solid #fecaca", transition: "all 0.12s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#fee2e2"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fef2f2"; }}>
                  🗑 Remove
                </button>
                {editingReview && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => { setReviewText(selected.review || ""); setEditingReview(false); }}
                      style={{ padding: "9px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#6b7280", background: "#f9fafb", border: "1.5px solid #e5e7eb" }}>
                      Cancel
                    </button>
                    <button onClick={saveReview} disabled={savingReview}
                      style={{ padding: "9px 24px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: savingReview ? "wait" : "pointer", color: "#fff", background: G, border: "none", opacity: savingReview ? 0.7 : 1, transition: "opacity 0.12s" }}
                      onMouseEnter={e => { if (!savingReview) (e.currentTarget as HTMLElement).style.background = G_DARK; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = G; }}>
                      {savingReview ? "Saving…" : "Save notes"}
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {savedToast && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", zIndex: 100, padding: "12px 22px", borderRadius: 8, background: G, color: "#fff", fontSize: 14, fontWeight: 700, boxShadow: "0 4px 20px rgba(12,170,65,0.4)", pointerEvents: "none" }}>
          ✓ Notes saved
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
