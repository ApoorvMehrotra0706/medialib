from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import bcrypt, os, httpx, logging, asyncio, smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
logging.basicConfig(level=logging.INFO)
from database import init_db, create_user, get_user_by_email, get_user_by_id, update_user, create_reset_token, get_reset_token, delete_reset_token, add_media, list_media, update_media, delete_media

SMTP_USER     = os.getenv("SMTP_USER", "")
SMTP_PASS     = os.getenv("SMTP_PASS", "")
FRONTEND_URL  = os.getenv("FRONTEND_URL", "https://medialib-delta.vercel.app")

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

def _send_email(to: str, subject: str, html: str, text: str):
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = f"Medialib <{SMTP_USER}>"
    msg["To"]      = to
    msg.attach(MIMEText(text, "plain"))
    msg.attach(MIMEText(html, "html"))
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as s:
        s.login(SMTP_USER, SMTP_PASS)
        s.sendmail(SMTP_USER, to, msg.as_string())

class ForgotBody(BaseModel):
    email: str

class ResetBody(BaseModel):
    token: str
    new_password: str

@app.post("/auth/forgot-password")
async def forgot_password(b: ForgotBody):
    if not SMTP_USER or not SMTP_PASS:
        raise HTTPException(503, "Email service not configured — add SMTP_USER and SMTP_PASS to environment variables")
    user = await get_user_by_email(b.email)
    if not user:
        return {"ok": True}  # don't reveal whether email exists
    token = await create_reset_token(user["id"])
    link  = f"{FRONTEND_URL}/reset-password?token={token}"
    html  = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0f0f1e;border-radius:16px;color:#e2e8f0">
      <div style="text-align:center;margin-bottom:24px">
        <div style="font-size:40px">📚</div>
        <h2 style="color:#fff;margin:8px 0 4px">Reset your password</h2>
        <p style="color:#64748b;font-size:14px;margin:0">This link expires in 1 hour</p>
      </div>
      <a href="{link}" style="display:block;text-align:center;padding:14px 24px;background:linear-gradient(135deg,#7c3aed,#5b21b6);color:#fff;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;margin-bottom:20px">
        Reset password →
      </a>
      <p style="font-size:12px;color:#334155;text-align:center">If you didn't request this, you can safely ignore this email.</p>
    </div>
    """
    text = f"Reset your Medialib password by visiting:\n\n{link}\n\nThis link expires in 1 hour."
    await asyncio.to_thread(_send_email, b.email, "Reset your Medialib password", html, text)
    return {"ok": True}

@app.post("/auth/reset-password")
async def reset_password(b: ResetBody):
    if len(b.new_password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")
    record = await get_reset_token(b.token)
    if not record:
        raise HTTPException(400, "Invalid or expired reset link")
    if datetime.fromisoformat(record["expires_at"]) < datetime.utcnow():
        await delete_reset_token(b.token)
        raise HTTPException(400, "Reset link has expired — please request a new one")
    new_hash = bcrypt.hashpw(b.new_password.encode(), bcrypt.gensalt()).decode()
    await update_user(record["user_id"], password_hash=new_hash)
    await delete_reset_token(b.token)
    return {"ok": True}

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
    try:
        await update_media(mid, b.user_id, b.status, b.rating, b.review)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(500, str(e))

@app.delete("/library/{mid}/{user_id}")
async def delete(mid: str, user_id: str):
    await delete_media(mid, user_id)
    return {"ok": True}
