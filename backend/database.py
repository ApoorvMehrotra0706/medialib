import httpx, json, uuid, os, re
from datetime import datetime

_raw = os.getenv("TURSO_URL", "").strip()
TURSO_URL = _raw.replace("libsql://", "https://") + "/v2/pipeline"
TURSO_TOKEN = os.getenv("TURSO_TOKEN", "").strip()

def _arg(v):
    if v is None: return {"type": "null"}
    if isinstance(v, int): return {"type": "integer", "value": str(v)}
    if isinstance(v, float): return {"type": "real", "value": str(v)}
    return {"type": "text", "value": str(v)}

async def _turso(sql: str, args: list = None):
    payload = {"requests": [
        {"type": "execute", "stmt": {"sql": sql, "args": [_arg(a) for a in (args or [])]}},
        {"type": "close"},
    ]}
    async with httpx.AsyncClient(timeout=30) as c:
        r = await c.post(TURSO_URL, json=payload, headers={"Authorization": f"Bearer {TURSO_TOKEN}"})
        r.raise_for_status()
    result = r.json()["results"][0]
    if result["type"] == "error":
        raise Exception(f"Turso: {result['error']['message']}")
    return result["response"]["result"]

def _rows(result):
    cols = [c["name"] for c in result["cols"]]
    return [dict(zip(cols, [cell.get("value") for cell in row])) for row in result["rows"]]

async def init_db():
    await _turso("""CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL,
        name TEXT, password_hash TEXT, created_at TEXT NOT NULL)""")
    await _turso("""CREATE TABLE IF NOT EXISTS media (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        external_id TEXT NOT NULL,
        media_type TEXT NOT NULL,
        title TEXT NOT NULL,
        cover TEXT,
        year TEXT,
        description TEXT,
        genres TEXT,
        status TEXT NOT NULL DEFAULT 'want',
        rating REAL,
        review TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL)""")
    for col in ["rating", "review", "cover", "year", "description", "genres"]:
        try: await _turso(f"ALTER TABLE media ADD COLUMN {col} {'REAL' if col == 'rating' else 'TEXT'}")
        except: pass

# ── Auth ──────────────────────────────────────────────────────────────────────
async def create_user(email, name, password_hash):
    uid = str(uuid.uuid4()); now = datetime.utcnow().isoformat()
    await _turso("INSERT INTO users (id,email,name,password_hash,created_at) VALUES (?,?,?,?,?)",
                 [uid, email, name, password_hash, now])
    return {"id": uid, "email": email, "name": name}

async def get_user_by_email(email):
    rows = _rows(await _turso("SELECT * FROM users WHERE email=?", [email]))
    return rows[0] if rows else None

# ── Media CRUD ────────────────────────────────────────────────────────────────
async def add_media(user_id, external_id, media_type, title, cover, year, description, genres):
    mid = str(uuid.uuid4()); now = datetime.utcnow().isoformat()
    await _turso(
        "INSERT OR IGNORE INTO media (id,user_id,external_id,media_type,title,cover,year,description,genres,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,'want',?,?)",
        [mid, user_id, external_id, media_type, title, cover, year, description, genres, now, now])
    return mid

async def list_media(user_id, media_type=None):
    if media_type:
        rows = _rows(await _turso("SELECT * FROM media WHERE user_id=? AND media_type=? ORDER BY updated_at DESC", [user_id, media_type]))
    else:
        rows = _rows(await _turso("SELECT * FROM media WHERE user_id=? ORDER BY updated_at DESC", [user_id]))
    return rows

async def update_media(mid, user_id, status=None, rating=None, review=None):
    now = datetime.utcnow().isoformat()
    if status is not None:
        await _turso("UPDATE media SET status=?,updated_at=? WHERE id=? AND user_id=?", [status, now, mid, user_id])
    if rating is not None:
        await _turso("UPDATE media SET rating=?,updated_at=? WHERE id=? AND user_id=?", [rating, now, mid, user_id])
    if review is not None:
        await _turso("UPDATE media SET review=?,updated_at=? WHERE id=? AND user_id=?", [review, now, mid, user_id])

async def delete_media(mid, user_id):
    await _turso("DELETE FROM media WHERE id=? AND user_id=?", [mid, user_id])
