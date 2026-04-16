from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import bcrypt, os, httpx
from database import init_db, create_user, get_user_by_email, add_media, list_media, update_media, delete_media

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

TMDB_KEY = os.getenv("TMDB_API_KEY", "")
RAWG_KEY = os.getenv("RAWG_API_KEY", "")

@app.on_event("startup")
async def startup(): await init_db()

@app.get("/health")
async def health(): return {"status": "ok"}

# ── Auth ──────────────────────────────────────────────────────────────────────
class AuthBody(BaseModel):
    email: str; password: str; name: Optional[str] = None

@app.post("/auth/signup")
async def signup(b: AuthBody):
    if await get_user_by_email(b.email):
        raise HTTPException(400, "Email already registered")
    h = bcrypt.hashpw(b.password.encode(), bcrypt.gensalt()).decode()
    user = await create_user(b.email, b.name or b.email.split("@")[0], h)
    return {"user": user}

@app.post("/auth/login")
async def login(b: AuthBody):
    user = await get_user_by_email(b.email)
    if not user or not bcrypt.checkpw(b.password.encode(), user["password_hash"].encode()):
        raise HTTPException(401, "Invalid credentials")
    return {"user": {"id": user["id"], "email": user["email"], "name": user["name"]}}

# ── Search ────────────────────────────────────────────────────────────────────
@app.get("/search")
async def search(q: str, type: str = "all"):
    results = []
    async with httpx.AsyncClient(timeout=10) as client:
        # Books — Open Library (no key)
        if type in ("all", "book"):
            try:
                r = await client.get(f"https://openlibrary.org/search.json?q={q}&limit=5&fields=key,title,author_name,first_publish_year,cover_i,subject")
                for d in r.json().get("docs", []):
                    results.append({
                        "external_id": d.get("key","").replace("/works/",""),
                        "media_type": "book",
                        "title": d.get("title",""),
                        "cover": f"https://covers.openlibrary.org/b/id/{d['cover_i']}-L.jpg" if d.get("cover_i") else None,
                        "year": str(d.get("first_publish_year","")) or None,
                        "description": ", ".join(d.get("author_name", [])),
                        "genres": ", ".join(d.get("subject", [])[:3]),
                    })
            except: pass

        # Anime — AniList (no key)
        if type in ("all", "anime"):
            try:
                query = """query($q:String){Page(perPage:5){media(search:$q,type:ANIME){id title{romaji} coverImage{large} startDate{year} description(asHtml:false) genres}}}"""
                r = await client.post("https://graphql.anilist.co", json={"query": query, "variables": {"q": q}})
                for d in r.json().get("data",{}).get("Page",{}).get("media",[]):
                    results.append({
                        "external_id": f"al_{d['id']}",
                        "media_type": "anime",
                        "title": d["title"]["romaji"],
                        "cover": d.get("coverImage",{}).get("large"),
                        "year": str(d.get("startDate",{}).get("year","")) or None,
                        "description": (d.get("description") or "")[:200],
                        "genres": ", ".join(d.get("genres",[])[:3]),
                    })
            except: pass

        # Movies + TV — TMDB
        if type in ("all", "movie", "tv") and TMDB_KEY:
            for mt in (["movie","tv"] if type == "all" else [type]):
                try:
                    r = await client.get(f"https://api.themoviedb.org/3/search/{mt}?query={q}&page=1&api_key={TMDB_KEY}")
                    for d in r.json().get("results",[])[:3]:
                        title = d.get("title") or d.get("name","")
                        year = (d.get("release_date") or d.get("first_air_date") or "")[:4]
                        results.append({
                            "external_id": f"tmdb_{d['id']}",
                            "media_type": mt,
                            "title": title,
                            "cover": f"https://image.tmdb.org/t/p/w300{d['poster_path']}" if d.get("poster_path") else None,
                            "year": year or None,
                            "description": d.get("overview","")[:200],
                            "genres": "",
                        })
                except: pass

        # Games — RAWG
        if type in ("all", "game") and RAWG_KEY:
            try:
                r = await client.get(f"https://api.rawg.io/api/games?key={RAWG_KEY}&search={q}&page_size=5")
                for d in r.json().get("results",[]):
                    results.append({
                        "external_id": f"rawg_{d['id']}",
                        "media_type": "game",
                        "title": d.get("name",""),
                        "cover": d.get("background_image"),
                        "year": (d.get("released") or "")[:4] or None,
                        "description": "",
                        "genres": ", ".join(g["name"] for g in d.get("genres",[])[:3]),
                    })
            except: pass

    return results

# ── Library CRUD ──────────────────────────────────────────────────────────────
class AddBody(BaseModel):
    user_id: str; external_id: str; media_type: str; title: str
    cover: Optional[str]=None; year: Optional[str]=None
    description: Optional[str]=None; genres: Optional[str]=None

@app.post("/library")
async def add(b: AddBody):
    mid = await add_media(b.user_id, b.external_id, b.media_type, b.title, b.cover, b.year, b.description, b.genres)
    return {"id": mid}

@app.get("/library/{user_id}")
async def get_library(user_id: str, type: Optional[str] = None):
    return await list_media(user_id, type)

class UpdateBody(BaseModel):
    user_id: str; status: Optional[str]=None; rating: Optional[float]=None; review: Optional[str]=None

@app.patch("/library/{mid}")
async def update(mid: str, b: UpdateBody):
    await update_media(mid, b.user_id, b.status, b.rating, b.review)
    return {"ok": True}

@app.delete("/library/{mid}/{user_id}")
async def delete(mid: str, user_id: str):
    await delete_media(mid, user_id)
    return {"ok": True}
