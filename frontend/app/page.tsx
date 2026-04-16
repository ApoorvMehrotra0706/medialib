"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AuthButton from "./components/AuthButton";
import { MediaItem, MediaType, SearchResult, Status } from "./lib/types";
import { API_URL } from "./lib/api";

const TYPES: { key: MediaType | "all"; label: string; emoji: string }[] = [
  { key: "all",   label: "All",      emoji: "🗂️" },
  { key: "movie", label: "Movies",   emoji: "🎬" },
  { key: "tv",    label: "TV Shows", emoji: "📺" },
  { key: "book",  label: "Books",    emoji: "📚" },
  { key: "game",  label: "Games",    emoji: "🎮" },
  { key: "anime", label: "Anime",    emoji: "⛩️" },
];

const STATUSES: { key: Status; label: string; color: string; bg: string }[] = [
  { key: "want",      label: "Want to",    color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
  { key: "ongoing",   label: "In Progress",color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  { key: "completed", label: "Completed",  color: "#10b981", bg: "rgba(16,185,129,0.12)" },
  { key: "dropped",   label: "Dropped",    color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
];

function MediaIcon({ type, size = 24 }: { type: string; size?: number }) {
  const icons: Record<string, string> = { book: "📚", movie: "🎬", tv: "📺", game: "🎮", anime: "⛩️" };
  return <span style={{ fontSize: size }}>{icons[type] ?? "🗂️"}</span>;
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

  // Debounced search
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

  // Sync review textarea when modal opens/switches item
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

  const filtered  = activeType === "all" ? library : library.filter(i => i.media_type === activeType);
  const typeInfo  = TYPES.find(t => t.key === activeType)!;

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100vh", overflow: "hidden", background: "#09090f" }}>

      {/* ── Header ─────────────────────────────────────── */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", height: 64, flexShrink: 0, background: "#0c0c18", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, background: "linear-gradient(145deg,#a855f7,#6d28d9)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📚</div>
          <span style={{ fontWeight: 800, color: "#fff", fontSize: 17, letterSpacing: "-0.3px" }}>Medialib</span>
        </div>

        {/* Search bar */}
        <div style={{ position: "relative", flex: 1, maxWidth: 560, margin: "0 40px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, borderRadius: 16, padding: "9px 16px", background: "#14142a", border: "1px solid rgba(255,255,255,0.08)" }}>
            <svg width="16" height="16" fill="none" stroke="#475569" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="7"/><path strokeLinecap="round" d="M21 21l-4-4"/>
            </svg>
            <input
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 14, color: "#e2e8f0", fontFamily: "inherit" }}
              placeholder={`Search ${activeType === "all" ? "anything" : activeType + "s"}…`}
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            {searching && (
              <div style={{ width: 16, height: 16, border: "2px solid #7c3aed", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />
            )}
          </div>

          {/* Search dropdown */}
          {showSearch && searchResults.length > 0 && (
            <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0, borderRadius: 18, overflow: "hidden", zIndex: 50, background: "#10101e", border: "1px solid rgba(255,255,255,0.07)", boxShadow: "0 32px 80px rgba(0,0,0,0.85)", maxHeight: 480, overflowY: "auto" }}>
              {searchResults.map((r, i) => (
                <button key={i} onClick={() => addToLibrary(r)}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "12px 18px", background: "transparent", border: "none", cursor: addingId === r.external_id ? "wait" : "pointer", borderBottom: "1px solid rgba(255,255,255,0.04)", textAlign: "left" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  {r.cover
                    ? <img src={r.cover} alt="" style={{ width: 36, height: 52, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} />
                    : <div style={{ width: 36, height: 52, borderRadius: 8, background: "#1e1e36", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <MediaIcon type={r.media_type} size={18} />
                      </div>
                  }
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>{r.title}</p>
                    <p style={{ fontSize: 12, color: "#475569", marginTop: 3 }}>{[r.year, r.media_type, r.genres].filter(Boolean).join(" · ")}</p>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#7c3aed", flexShrink: 0 }}>
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

        {/* ── Sidebar ──────────────────────────────────── */}
        <aside style={{ width: 220, flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", padding: "24px 12px", gap: 4, background: "#0c0c18" }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#2d2d4a", padding: "0 12px", marginBottom: 8 }}>My Library</p>
          {TYPES.map(t => {
            const count   = t.key === "all" ? library.length : library.filter(i => i.media_type === t.key).length;
            const isActive = activeType === t.key;
            return (
              <button key={t.key} onClick={() => setActiveType(t.key)}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 14, border: isActive ? "1px solid rgba(168,85,247,0.2)" : "1px solid transparent", background: isActive ? "rgba(168,85,247,0.1)" : "transparent", color: isActive ? "#c084fc" : "#475569", cursor: "pointer", textAlign: "left", width: "100%", transition: "all 0.15s" }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                <span style={{ fontSize: 18 }}>{t.emoji}</span>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{t.label}</span>
                {count > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: isActive ? "rgba(168,85,247,0.25)" : "rgba(255,255,255,0.06)", color: isActive ? "#c084fc" : "#334155" }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
          {!session && (
            <div style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
              <p style={{ fontSize: 12, color: "#2d2d4a", padding: "0 12px", lineHeight: 1.6 }}>Sign in to save your library across devices</p>
            </div>
          )}
        </aside>

        {/* ── Main content ─────────────────────────────── */}
        <main style={{ flex: 1, overflowY: "auto", padding: "36px 48px" }}>
          {!session ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center" }}>
              <div style={{ fontSize: 64, marginBottom: 24 }}>📚</div>
              <h2 style={{ fontSize: 26, fontWeight: 800, color: "#fff", marginBottom: 12 }}>Your media library awaits</h2>
              <p style={{ fontSize: 15, color: "#475569", marginBottom: 32 }}>Track movies, books, TV shows, games and anime all in one place</p>
              <a href="/login" style={{ padding: "14px 32px", borderRadius: 18, fontSize: 15, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg,#7c3aed,#5b21b6)", textDecoration: "none", display: "inline-block" }}>Get started</a>
            </div>
          ) : loadingLib ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
              <div style={{ width: 32, height: 32, border: "3px solid #7c3aed", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center" }}>
              <div style={{ fontSize: 56, marginBottom: 20 }}>{typeInfo.emoji}</div>
              <p style={{ fontSize: 18, fontWeight: 700, color: "#64748b" }}>No {activeType === "all" ? "items" : typeInfo.label.toLowerCase()} yet</p>
              <p style={{ fontSize: 14, color: "#2d2d4a", marginTop: 8 }}>Search above to add something to your library</p>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 28 }}>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: 0 }}>{typeInfo.label}</h1>
                <span style={{ fontSize: 14, color: "#334155" }}>{filtered.length} {filtered.length === 1 ? "item" : "items"}</span>
              </div>
              <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))" }}>
                {filtered.map(item => {
                  const status = STATUSES.find(s => s.key === item.status);
                  return (
                    <button key={item.id} onClick={() => setSelected(item)}
                      style={{ background: "#12121e", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 18, overflow: "hidden", textAlign: "left", cursor: "pointer", transition: "transform 0.2s, box-shadow 0.2s, border-color 0.2s", padding: 0 }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(-6px)"; el.style.boxShadow = "0 20px 48px rgba(0,0,0,0.7)"; el.style.borderColor = "rgba(168,85,247,0.35)"; }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = ""; el.style.boxShadow = ""; el.style.borderColor = "rgba(255,255,255,0.06)"; }}>
                      <div style={{ position: "relative", paddingBottom: "150%", width: "100%" }}>
                        {item.cover
                          ? <img src={item.cover} alt={item.title} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                          : <div style={{ position: "absolute", inset: 0, background: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <MediaIcon type={item.media_type} size={40} />
                            </div>
                        }
                        {status && (
                          <div style={{ position: "absolute", top: 10, left: 10, padding: "3px 9px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: status.bg, color: status.color, border: `1px solid ${status.color}30`, backdropFilter: "blur(8px)" }}>
                            {status.label}
                          </div>
                        )}
                        {item.rating && (
                          <div style={{ position: "absolute", top: 10, right: 10, padding: "3px 8px", borderRadius: 20, fontSize: 11, fontWeight: 800, background: "rgba(0,0,0,0.72)", color: "#fbbf24", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", gap: 3 }}>
                            ★ {item.rating}
                          </div>
                        )}
                      </div>
                      <div style={{ padding: "12px 14px 14px" }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: "0 0 4px" }}>{item.title}</p>
                        <p style={{ fontSize: 11, color: "#334155", margin: 0 }}>{item.year || "—"}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </main>
      </div>

      {/* ── Detail Modal ─────────────────────────────── */}
      {selected && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}
          style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "rgba(0,0,0,0.88)", backdropFilter: "blur(10px)" }}>
          <div style={{ width: "100%", maxWidth: 680, borderRadius: 28, overflow: "hidden", background: "#0f0f1e", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 56px 120px rgba(0,0,0,0.95)", maxHeight: "92vh", display: "flex", flexDirection: "column" }}>

            {/* Backdrop */}
            <div style={{ height: 140, position: "relative", flexShrink: 0, overflow: "hidden", background: "#1a1a2e" }}>
              {selected.cover && (
                <img src={selected.cover} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(28px) brightness(0.35)", transform: "scale(1.1)" }} />
              )}
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(15,15,30,0) 30%, #0f0f1e 100%)" }} />
              <button onClick={() => setSelected(null)}
                style={{ position: "absolute", top: 16, right: 16, width: 32, height: 32, borderRadius: "50%", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, backdropFilter: "blur(8px)" }}>
                ✕
              </button>
            </div>

            {/* Poster + info row */}
            <div style={{ display: "flex", gap: 28, padding: "0 32px", marginTop: -72 }}>
              <div style={{ flexShrink: 0, width: 130 }}>
                {selected.cover
                  ? <img src={selected.cover} alt="" style={{ width: "100%", aspectRatio: "2/3", objectFit: "cover", borderRadius: 16, border: "3px solid rgba(255,255,255,0.1)", boxShadow: "0 16px 48px rgba(0,0,0,0.8)" }} />
                  : <div style={{ width: "100%", aspectRatio: "2/3", borderRadius: 16, background: "#1e1e3a", border: "3px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <MediaIcon type={selected.media_type} size={40} />
                    </div>
                }
              </div>
              <div style={{ flex: 1, minWidth: 0, paddingTop: 80 }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: "0 0 6px", lineHeight: 1.25 }}>{selected.title}</h2>
                <p style={{ fontSize: 13, color: "#475569", margin: "0 0 12px" }}>
                  {[selected.year, selected.media_type[0].toUpperCase() + selected.media_type.slice(1), selected.genres].filter(Boolean).join(" · ")}
                </p>
                {selected.description && (
                  <p style={{ fontSize: 13, color: "#64748b", margin: 0, lineHeight: 1.65, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {selected.description}
                  </p>
                )}
              </div>
            </div>

            {/* Controls — scrollable */}
            <div style={{ padding: "24px 32px 32px", display: "flex", flexDirection: "column", gap: 24, overflowY: "auto" }}>

              {/* Status */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#2d2d4a", marginBottom: 12 }}>Status</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {STATUSES.map(s => (
                    <button key={s.key} onClick={() => updateItem(selected.id, { status: s.key })}
                      style={{
                        padding: "9px 18px", borderRadius: 14, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
                        ...(selected.status === s.key
                          ? { background: s.color, color: "#fff", border: `1px solid ${s.color}`, boxShadow: `0 4px 20px ${s.color}40` }
                          : { background: s.bg, color: s.color, border: `1px solid ${s.color}30` }),
                      }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rating */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#2d2d4a", marginBottom: 12 }}>
                  Rating {selected.rating ? <span style={{ color: "#a855f7", fontWeight: 800, fontSize: 13 }}>★ {selected.rating}/10</span> : ""}
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => {
                    const active = Number(selected.rating) === n;
                    return (
                      <button key={n} onClick={() => updateItem(selected.id, { rating: n })}
                        style={{
                          width: 40, height: 40, borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
                          ...(active
                            ? { background: "#a855f7", color: "#fff", border: "1px solid #a855f7", boxShadow: "0 4px 16px rgba(168,85,247,0.5)" }
                            : { background: "rgba(255,255,255,0.05)", color: "#475569", border: "1px solid rgba(255,255,255,0.08)" }),
                        }}>
                        {n}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Review */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#2d2d4a", margin: 0 }}>Review / Notes</p>
                  {!editingReview && (
                    <button onClick={() => setEditingReview(true)}
                      style={{ fontSize: 12, fontWeight: 600, color: "#7c3aed", background: "transparent", border: "none", cursor: "pointer", padding: "2px 6px" }}>
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
                    style={{ width: "100%", minHeight: 100, borderRadius: 16, padding: "14px 16px", background: "#0a0a14", border: "1px solid rgba(168,85,247,0.5)", color: "#e2e8f0", fontSize: 14, fontFamily: "inherit", outline: "none", resize: "vertical", lineHeight: 1.6, boxSizing: "border-box" }}
                    onFocus={e => (e.currentTarget.style.borderColor = "rgba(168,85,247,0.5)")}
                    onBlur={e => (e.currentTarget.style.borderColor = "rgba(168,85,247,0.5)")}
                  />
                ) : (
                  <div style={{ minHeight: 60, borderRadius: 16, padding: "14px 16px", background: "#0a0a14", border: "1px solid rgba(255,255,255,0.06)", color: reviewText ? "#94a3b8" : "#2d2d4a", fontSize: 14, lineHeight: 1.6 }}>
                    {reviewText || "No notes yet. Click Edit to add one."}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <button onClick={() => deleteItem(selected.id)}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 14, fontSize: 13, fontWeight: 600, cursor: "pointer", background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)", transition: "all 0.15s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.2)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.1)"; }}>
                  🗑 Remove from library
                </button>
                {editingReview && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => { setReviewText(selected.review || ""); setEditingReview(false); }}
                      style={{ padding: "10px 18px", borderRadius: 14, fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#64748b", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      Cancel
                    </button>
                    <button onClick={saveReview} disabled={savingReview}
                      style={{ padding: "10px 28px", borderRadius: 14, fontSize: 13, fontWeight: 700, cursor: savingReview ? "wait" : "pointer", color: "#fff", background: "linear-gradient(135deg,#7c3aed,#5b21b6)", border: "none", opacity: savingReview ? 0.7 : 1, transition: "opacity 0.15s" }}>
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
        <div style={{ position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)", zIndex: 100, padding: "12px 24px", borderRadius: 16, background: "#10b981", color: "#fff", fontSize: 14, fontWeight: 700, boxShadow: "0 8px 32px rgba(16,185,129,0.4)", pointerEvents: "none", animation: "fadeInUp 0.2s ease" }}>
          ✓ Notes saved
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateX(-50%) translateY(10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
      `}</style>
    </div>
  );
}
