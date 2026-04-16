from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import bcrypt, os, httpx, logging
logging.basicConfig(level=logging.INFO)
from database import (init_db, create_user, get_user_by_email, get_user_by_id, update_user,
                      save_security_questions, get_security_questions,
                      add_media, list_media, update_media, delete_media)

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"], allow_credentials=False)

@app.options("/{full_path:path}")
async def options_handler(full_path: str):
    return Response(headers={
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "*",
    })

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

# ── Security questions ────────────────────────────────────────────────────────
class SecurityQBody(BaseModel):
    user_id: str; q1: str; a1: str; q2: str; a2: str

@app.post("/auth/security-questions")
async def set_security_questions(b: SecurityQBody):
    a1_hash = bcrypt.hashpw(b.a1.strip().lower().encode(), bcrypt.gensalt()).decode()
    a2_hash = bcrypt.hashpw(b.a2.strip().lower().encode(), bcrypt.gensalt()).decode()
    await save_security_questions(b.user_id, b.q1, a1_hash, b.q2, a2_hash)
    return {"ok": True}

@app.get("/auth/security-questions/{email}")
async def get_questions_for_email(email: str):
    user = await get_user_by_email(email)
    if not user:
        raise HTTPException(404, "No account found with that email")
    sq = await get_security_questions(user["id"])
    if not sq:
        raise HTTPException(404, "No security questions set up for this account")
    return {"q1": sq["q1"], "q2": sq["q2"]}

class VerifySecurityBody(BaseModel):
    email: str; a1: str; a2: str; new_password: str

@app.post("/auth/forgot-password")
async def forgot_password(b: VerifySecurityBody):
    if len(b.new_password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")
    user = await get_user_by_email(b.email)
    if not user:
        raise HTTPException(404, "No account found with that email")
    sq = await get_security_questions(user["id"])
    if not sq:
        raise HTTPException(400, "No security questions set up for this account")
    a1_ok = bcrypt.checkpw(b.a1.strip().lower().encode(), sq["a1_hash"].encode())
    a2_ok = bcrypt.checkpw(b.a2.strip().lower().encode(), sq["a2_hash"].encode())
    if not a1_ok or not a2_ok:
        raise HTTPException(401, "One or more answers are incorrect")
    new_hash = bcrypt.hashpw(b.new_password.encode(), bcrypt.gensalt()).decode()
    await update_user(user["id"], password_hash=new_hash)
    return {"ok": True}

# ── Profile ───────────────────────────────────────────────────────────────────
class ProfileBody(BaseModel):
    user_id: str
    name: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None

@app.patch("/auth/profile")
async def update_profile(b: ProfileBody):
    user = await get_user_by_id(b.user_id)
    if not user:
        raise HTTPException(404, "User not found")
    if b.new_password:
        if not b.current_password:
            raise HTTPException(400, "Current password is required")
        if not bcrypt.checkpw(b.current_password.encode(), user["password_hash"].encode()):
            raise HTTPException(401, "Current password is incorrect")
        new_hash = bcrypt.hashpw(b.new_password.encode(), bcrypt.gensalt()).decode()
        await update_user(b.user_id, password_hash=new_hash)
    if b.name is not None and b.name.strip():
        await update_user(b.user_id, name=b.name.strip())
    updated = await get_user_by_id(b.user_id)
    return {"user": {"id": updated["id"], "email": updated["email"], "name": updated["name"]}}

# ── Search ────────────────────────────────────────────────────────────────────
@app.get("/search")
async def search(q: str, type: str = "all"):
    results = []
    async with httpx.AsyncClient(timeout=10) as client:
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
    try:
        await update_media(mid, b.user_id, b.status, b.rating, b.review)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(500, str(e))

@app.delete("/library/{mid}/{user_id}")
async def delete(mid: str, user_id: str):
    await delete_media(mid, user_id)
    return {"ok": True}
