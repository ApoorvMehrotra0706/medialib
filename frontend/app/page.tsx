"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AuthButton from "./components/AuthButton";
import { MediaItem, MediaType, SearchResult, Status } from "./lib/types";
import { API_URL } from "./lib/api";

const TYPES: { key: MediaType | "all"; label: string; emoji: string }[] = [
  { key: "all", label: "All", emoji: "🗂️" },
  { key: "movie", label: "Movies", emoji: "🎬" },
  { key: "tv", label: "TV Shows", emoji: "📺" },
  { key: "book", label: "Books", emoji: "📚" },
  { key: "game", label: "Games", emoji: "🎮" },
  { key: "anime", label: "Anime", emoji: "⛩️" },
];

const STATUSES: { key: Status; label: string; color: string }[] = [
  { key: "want", label: "Want to", color: "#64748b" },
  { key: "ongoing", label: "In Progress", color: "#f59e0b" },
  { key: "completed", label: "Completed", color: "#10b981" },
  { key: "dropped", label: "Dropped", color: "#ef4444" },
];

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [activeType, setActiveType] = useState<MediaType | "all">("all");
  const [library, setLibrary] = useState<MediaItem[]>([]);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [loadingLib, setLoadingLib] = useState(false);

  const userId = session?.user?.id;

  const fetchLibrary = useCallback(async () => {
    if (!userId) return;
    setLoadingLib(true);
    try {
      const url = `${API_URL}/library/${userId}${activeType !== "all" ? `?type=${activeType}` : ""}`;
      const r = await fetch(url);
      setLibrary(await r.json());
    } catch { } finally { setLoadingLib(false); }
  }, [userId, activeType]);

  useEffect(() => { fetchLibrary(); }, [fetchLibrary]);

  useEffect(() => {
    if (!query.trim()) { setSearchResults([]); setShowSearch(false); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await fetch(`${API_URL}/search?q=${encodeURIComponent(query)}&type=${activeType === "all" ? "all" : activeType}`);
        setSearchResults(await r.json());
        setShowSearch(true);
      } catch { } finally { setSearching(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [query, activeType]);

  async function addToLibrary(item: SearchResult) {
    if (!userId) { router.push("/login"); return; }
    await fetch(`${API_URL}/library`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, ...item }),
    });
    setQuery(""); setShowSearch(false); setSearchResults([]);
    fetchLibrary();
  }

  async function updateItem(id: string, patch: { status?: Status; rating?: number; review?: string }) {
    if (!userId) return;
    await fetch(`${API_URL}/library/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, ...patch }),
    });
    fetchLibrary();
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, ...patch } : null);
  }

  async function deleteItem(id: string) {
    if (!userId) return;
    await fetch(`${API_URL}/library/${id}/${userId}`, { method: "DELETE" });
    setSelected(null); fetchLibrary();
  }

  const filtered = activeType === "all" ? library : library.filter(i => i.media_type === activeType);

  return (
    <div className="flex flex-col w-full h-screen overflow-hidden" style={{ background: "#09090f" }}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 shrink-0 border-b border-white/[0.06]" style={{ height: 60, background: "#0f0f1a" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: "linear-gradient(145deg,#a855f7,#7c3aed)" }}>📚</div>
          <span className="font-bold text-white text-[15px]">Medialib</span>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-md mx-6">
          <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)" }}>
            <svg className="w-4 h-4 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
            </svg>
            <input className="flex-1 bg-transparent outline-none text-sm text-slate-100 placeholder-slate-600"
              placeholder={`Search ${activeType === "all" ? "anything" : activeType + "s"}…`}
              value={query} onChange={e => setQuery(e.target.value)} />
            {searching && <div className="w-3.5 h-3.5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />}
          </div>
          {showSearch && searchResults.length > 0 && (
            <div className="absolute top-full mt-2 w-full rounded-xl overflow-hidden z-50" style={{ background: "#141428", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 20px 60px rgba(0,0,0,0.7)" }}>
              {searchResults.map((r, i) => (
                <button key={i} onClick={() => addToLibrary(r)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 text-left">
                  {r.cover
                    ? <img src={r.cover} alt="" className="w-10 h-14 object-cover rounded-lg shrink-0" />
                    : <div className="w-10 h-14 rounded-lg bg-white/5 flex items-center justify-center text-lg shrink-0">
                        {r.media_type === "book" ? "📚" : r.media_type === "movie" ? "🎬" : r.media_type === "tv" ? "📺" : r.media_type === "game" ? "🎮" : "⛩️"}
                      </div>
                  }
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-100 truncate">{r.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{r.year} · {r.media_type} {r.genres ? `· ${r.genres}` : ""}</p>
                    <p className="text-xs text-purple-400 mt-1">+ Add to library</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <AuthButton />
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — type filter */}
        <aside className="w-52 shrink-0 border-r border-white/[0.06] flex flex-col py-4 gap-1 px-3" style={{ background: "#0f0f1a" }}>
          {TYPES.map(t => (
            <button key={t.key} onClick={() => setActiveType(t.key)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left"
              style={activeType === t.key
                ? { background: "rgba(168,85,247,0.15)", color: "#c084fc", border: "1px solid rgba(168,85,247,0.25)" }
                : { color: "#64748b", border: "1px solid transparent" }}>
              <span>{t.emoji}</span>{t.label}
              <span className="ml-auto text-xs opacity-60">
                {t.key === "all" ? library.length : library.filter(i => i.media_type === t.key).length}
              </span>
            </button>
          ))}

          <div className="mt-auto pt-4 border-t border-white/5">
            {!session && (
              <p className="text-xs text-slate-600 px-3 leading-relaxed">Sign in to save your library across devices</p>
            )}
          </div>
        </aside>

        {/* Main — library grid */}
        <main className="flex-1 overflow-y-auto p-6">
          {!session ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="text-5xl mb-4">📚</div>
              <h2 className="text-xl font-bold text-white mb-2">Your media library awaits</h2>
              <p className="text-slate-500 text-sm mb-6">Sign in to track movies, books, TV shows, games and anime</p>
              <a href="/login" className="px-6 py-3 rounded-xl text-sm font-semibold text-white" style={{ background: "linear-gradient(135deg,#7c3aed,#5b21b6)" }}>Get started</a>
            </div>
          ) : loadingLib ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="text-4xl mb-3">{TYPES.find(t => t.key === activeType)?.emoji}</div>
              <p className="text-slate-400 font-medium">No {activeType === "all" ? "items" : activeType + "s"} yet</p>
              <p className="text-slate-600 text-sm mt-1">Search above to add something</p>
            </div>
          ) : (
            <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))" }}>
              {filtered.map(item => (
                <button key={item.id} onClick={() => setSelected(item)}
                  className="group relative rounded-xl overflow-hidden text-left transition-all hover:scale-[1.03]"
                  style={{ background: "#141428", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="relative w-full" style={{ paddingBottom: "140%" }}>
                    {item.cover
                      ? <img src={item.cover} alt={item.title} className="absolute inset-0 w-full h-full object-cover" />
                      : <div className="absolute inset-0 flex items-center justify-center text-3xl" style={{ background: "#1e1e3a" }}>
                          {item.media_type === "book" ? "📚" : item.media_type === "movie" ? "🎬" : item.media_type === "tv" ? "📺" : item.media_type === "game" ? "🎮" : "⛩️"}
                        </div>
                    }
                    {/* Status badge */}
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
                      style={{ background: STATUSES.find(s => s.key === item.status)?.color || "#64748b" }}>
                      {STATUSES.find(s => s.key === item.status)?.label}
                    </div>
                    {item.rating && (
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold text-white flex items-center gap-0.5"
                        style={{ background: "rgba(0,0,0,0.7)" }}>
                        ⭐ {item.rating}
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-semibold text-slate-100 truncate">{item.title}</p>
                    <p className="text-[10px] text-slate-600 mt-0.5">{item.year}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }}
          onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ background: "#141428", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 40px 80px rgba(0,0,0,0.8)" }}>
            <div className="flex gap-4 p-5">
              {selected.cover
                ? <img src={selected.cover} alt="" className="w-28 rounded-xl object-cover shrink-0" style={{ aspectRatio: "2/3" }} />
                : <div className="w-28 rounded-xl flex items-center justify-center text-4xl shrink-0" style={{ aspectRatio: "2/3", background: "#1e1e3a" }}>
                    {selected.media_type === "book" ? "📚" : selected.media_type === "movie" ? "🎬" : selected.media_type === "tv" ? "📺" : selected.media_type === "game" ? "🎮" : "⛩️"}
                  </div>
              }
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-base font-bold text-white leading-snug">{selected.title}</h2>
                  <button onClick={() => setSelected(null)} className="text-slate-600 hover:text-slate-300 shrink-0">✕</button>
                </div>
                <p className="text-xs text-slate-500 mt-1">{selected.year} · {selected.media_type} {selected.genres ? `· ${selected.genres}` : ""}</p>
                {selected.description && <p className="text-xs text-slate-400 mt-2 leading-relaxed line-clamp-3">{selected.description}</p>}

                {/* Status */}
                <div className="mt-3">
                  <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-1.5">Status</p>
                  <div className="flex flex-wrap gap-1.5">
                    {STATUSES.map(s => (
                      <button key={s.key} onClick={() => updateItem(selected.id, { status: s.key })}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                        style={selected.status === s.key
                          ? { background: s.color, color: "#fff" }
                          : { background: "rgba(255,255,255,0.05)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.08)" }}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rating */}
                <div className="mt-3">
                  <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-1.5">Rating</p>
                  <div className="flex gap-1">
                    {[1,2,3,4,5,6,7,8,9,10].map(n => (
                      <button key={n} onClick={() => updateItem(selected.id, { rating: n })}
                        className="w-7 h-7 rounded-lg text-xs font-semibold transition-all"
                        style={selected.rating === n
                          ? { background: "#a855f7", color: "#fff" }
                          : { background: "rgba(255,255,255,0.05)", color: "#64748b" }}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Review */}
            <div className="px-5 pb-5">
              <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-1.5">Review / Notes</p>
              <textarea className="w-full rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none resize-none transition-all"
                style={{ background: "#0f0f1a", border: "1px solid rgba(255,255,255,0.1)", minHeight: 72, fontFamily: "inherit" }}
                placeholder="Write your thoughts…"
                defaultValue={selected.review || ""}
                onBlur={e => updateItem(selected.id, { review: e.target.value })}
                onFocus={e => { e.currentTarget.style.borderColor = "#a855f7"; }}
              />
              <button onClick={() => deleteItem(selected.id)}
                className="mt-3 text-xs text-red-500 hover:text-red-400 transition-colors">Remove from library</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
