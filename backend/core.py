import os
import time
import uuid
from collections import defaultdict, deque
from datetime import datetime, timezone, timedelta

import bcrypt
import jwt
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient

client = AsyncIOMotorClient(os.environ["mongodb+srv://Rishi_Munda:Rahul124%40@cluster0.dod06ln.mongodb.net/?appName=Cluster0"])
db = client[os.environ["kirishna_cycle_shop"]]
JWT_SECRET = os.environ["replace-with-a-long-random-string"]
JWT_DAYS = 7


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return uuid.uuid4().hex


def hash_pw(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def check_pw(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except ValueError:
        return False


def make_token(sub: str, role: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(days=JWT_DAYS)
    return jwt.encode({"sub": sub, "role": role, "exp": exp}, JWT_SECRET, algorithm="HS256")


bearer = HTTPBearer(auto_error=False)


def _payload(creds: HTTPAuthorizationCredentials | None) -> dict | None:
    if not creds:
        return None
    try:
        return jwt.decode(creds.credentials, JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        return None


async def current_admin(creds=Depends(bearer)) -> dict:
    p = _payload(creds)
    if not p or p.get("role") != "admin":
        raise HTTPException(401, "Admin login required")
    admin = await db.admins.find_one({"id": p["sub"]}, {"_id": 0, "password_hash": 0})
    if not admin:
        raise HTTPException(401, "Admin login required")
    return admin


async def optional_customer(creds=Depends(bearer)) -> dict | None:
    p = _payload(creds)
    if not p or p.get("role") != "customer":
        return None
    return await db.customers.find_one({"id": p["sub"]}, {"_id": 0, "password_hash": 0})


async def current_customer(customer=Depends(optional_customer)) -> dict:
    if not customer:
        raise HTTPException(401, "Please log in")
    return customer


def client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for", "")
    return fwd.split(",")[0].strip() if fwd else (request.client.host if request.client else "?")


_hits: dict[str, deque] = defaultdict(deque)


def rate_limit(name: str, limit: int, window: int):
    async def dep(request: Request):
        key = f"{name}:{client_ip(request)}"
        q, t = _hits[key], time.time()
        while q and q[0] < t - window:
            q.popleft()
        if len(q) >= limit:
            raise HTTPException(429, "Too many requests, please try again shortly")
        q.append(t)
    return dep


MAX_FAILS = 5
LOCK_MINUTES = 15


async def check_lock(key: str):
    doc = await db.login_attempts.find_one({"key": key}, {"_id": 0})
    if doc and doc.get("locked_until", "") > now_iso():
        raise HTTPException(429, "Too many failed attempts. Try again in 15 minutes.")


async def record_fail(key: str):
    doc = await db.login_attempts.find_one_and_update(
        {"key": key}, {"$inc": {"count": 1}}, upsert=True, return_document=True)
    if doc.get("count", 0) >= MAX_FAILS:
        until = (datetime.now(timezone.utc) + timedelta(minutes=LOCK_MINUTES)).isoformat()
        await db.login_attempts.update_one({"key": key}, {"$set": {"locked_until": until, "count": 0}})


async def clear_fails(key: str):
    await db.login_attempts.delete_one({"key": key})
