import asyncio
import logging
import os
import re
import secrets
from contextlib import suppress
from datetime import datetime, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from typing import Literal, Optional

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

from bson import Binary  # noqa: E402
from fastapi import APIRouter, BackgroundTasks, Depends, FastAPI, File, HTTPException, Query, Request, UploadFile  # noqa: E402
from fastapi.responses import Response  # noqa: E402
from pydantic import BaseModel, EmailStr, Field, field_validator  # noqa: E402
from pymongo import ASCENDING, DESCENDING, IndexModel, ReturnDocument  # noqa: E402
from starlette.middleware.cors import CORSMiddleware  # noqa: E402

from core import (check_lock, check_pw, clear_fails, client, client_ip, current_admin, current_customer, db, hash_pw,  # noqa: E402
                  make_token, new_id, now_iso, optional_customer, rate_limit, record_fail)
from seed import seed, slugify  # noqa: E402
from whatsapp import build_message, configured as wa_configured, notify_order  # noqa: E402

log = logging.getLogger("server")
INDEXES: dict[str, list[IndexModel]] = {
    "admins": [IndexModel([("email", ASCENDING)], name="email", unique=True)],
    "customers": [IndexModel([("email", ASCENDING)], name="email", unique=True),
                  IndexModel([("mobile", ASCENDING)], name="mobile", unique=True),
                  IndexModel([("id", ASCENDING)], name="id", unique=True)],
    "products": [IndexModel([("id", ASCENDING)], name="id", unique=True),
                 IndexModel([("slug", ASCENDING)], name="slug", unique=True),
                 IndexModel([("category", ASCENDING), ("active", ASCENDING)], name="cat_active"),
                 IndexModel([("created_at", DESCENDING)], name="created_desc"),
                 IndexModel([("name", "text"), ("brand", "text"), ("description", "text")], name="text_search")],
    "orders": [IndexModel([("order_id", ASCENDING)], name="order_id", unique=True),
               IndexModel([("created_at", DESCENDING)], name="created_desc"),
               IndexModel([("customer_id", ASCENDING)], name="customer_id"),
               IndexModel([("customer.mobile", ASCENDING)], name="mobile")],
    "payments": [IndexModel([("order_id", ASCENDING)], name="order_id"),
                 IndexModel([("utr", ASCENDING)], name="utr_unique", unique=True,
                            partialFilterExpression={"utr": {"$type": "string"}})],
    "notifications": [IndexModel([("order_id", ASCENDING)], name="order_id", unique=True)],
    "categories": [IndexModel([("slug", ASCENDING)], name="slug", unique=True)],
    "coupons": [IndexModel([("code", ASCENDING)], name="code", unique=True)],
    "reviews": [IndexModel([("product_id", ASCENDING), ("customer_id", ASCENDING)], name="prod_cust", unique=True)],
    "login_attempts": [IndexModel([("key", ASCENDING)], name="key", unique=True)],
}

app = FastAPI(title="Kirishna Cycle Shop API")
api = APIRouter(prefix="/api")

MOBILE_RE = r"^[6-9]\d{9}$"
STATUSES = ["new", "confirmed", "packed", "dispatched", "delivered"]
P = {"_id": 0}


def money(x) -> int:
    return int(Decimal(str(x)).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def norm_mobile(m: str) -> str:
    d = re.sub(r"\D", "", m or "")
    return d[-10:] if len(d) >= 10 else d


# ---------- Models ----------
class Address(BaseModel):
    label: Optional[str] = Field(None, max_length=30)
    line1: str = Field(min_length=3, max_length=200)
    line2: Optional[str] = Field(None, max_length=200)
    landmark: Optional[str] = Field(None, max_length=100)
    city: str = Field(min_length=2, max_length=60)
    state: str = Field(min_length=2, max_length=60)
    pincode: str = Field(pattern=r"^\d{6}$")


class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    mobile: str
    password: str = Field(min_length=6, max_length=100)

    @field_validator("mobile")
    @classmethod
    def _m(cls, v):
        v = norm_mobile(v)
        if not re.match(MOBILE_RE, v):
            raise ValueError("Enter a valid 10-digit Indian mobile number")
        return v


class LoginIn(BaseModel):
    identifier: str = Field(min_length=3, max_length=120)
    password: str = Field(min_length=1, max_length=100)


class AdminLoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=100)


class ProfileIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    addresses: list[Address] = Field(default_factory=list, max_length=5)


class CartItem(BaseModel):
    product_id: str = Field(min_length=1, max_length=64)
    qty: int = Field(ge=1, le=20)


class QuoteIn(BaseModel):
    items: list[CartItem] = Field(min_length=1, max_length=30)
    coupon_code: Optional[str] = Field(None, max_length=30)


class CustomerInfo(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    mobile: str
    email: Optional[EmailStr] = None
    address: Address

    @field_validator("mobile")
    @classmethod
    def _m(cls, v):
        v = norm_mobile(v)
        if not re.match(MOBILE_RE, v):
            raise ValueError("Enter a valid 10-digit Indian mobile number")
        return v


UTR_RE = r"^[A-Za-z0-9]{10,22}$"


class OrderIn(QuoteIn):
    customer: CustomerInfo
    payment_method: Literal["cod", "upi_full", "upi_advance"]
    utr: Optional[str] = Field(None, pattern=UTR_RE)


class TrackIn(BaseModel):
    order_id: str = Field(min_length=4, max_length=30)
    mobile: str = Field(min_length=10, max_length=15)


class UtrIn(TrackIn):
    utr: str = Field(pattern=UTR_RE)


class Spec(BaseModel):
    key: str = Field(min_length=1, max_length=60)
    value: str = Field(min_length=1, max_length=200)


class ProductIn(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    category: str = Field(min_length=2, max_length=60)
    brand: str = Field(min_length=1, max_length=60)
    description: str = Field("", max_length=5000)
    price: int = Field(ge=1, le=10_000_000)
    sale_price: int = Field(ge=1, le=10_000_000)
    stock: int = Field(ge=0, le=100000)
    images: list[str] = Field(default_factory=list, max_length=10)
    specs: list[Spec] = Field(default_factory=list, max_length=30)
    warranty: str = Field("", max_length=300)
    featured: bool = False
    active: bool = True


class CategoryIn(BaseModel):
    name: str = Field(min_length=2, max_length=60)
    icon: str = Field("Package", max_length=30)


class CouponIn(BaseModel):
    code: str = Field(pattern=r"^[A-Za-z0-9]{3,20}$")
    type: Literal["percent", "flat"]
    value: int = Field(ge=1, le=100000)
    min_order: int = Field(0, ge=0)
    max_discount: int = Field(0, ge=0)
    description: str = Field("", max_length=200)
    active: bool = True


class SettingsIn(BaseModel):
    address: str = Field("", max_length=300)
    upi_id: str = Field(max_length=100, pattern=r"^[A-Za-z0-9._\-]+@[A-Za-z]+$")
    upi_payee_name: str = Field(min_length=2, max_length=80)
    upi_qr_image: str = Field("", max_length=300)
    require_login: bool = False


class StatusIn(BaseModel):
    status: Literal["new", "confirmed", "packed", "dispatched", "delivered", "cancelled"]
    note: str = Field("", max_length=300)


class VerifyIn(BaseModel):
    decision: Literal["verified", "rejected"]
    note: str = Field("", max_length=300)


class ReviewIn(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str = Field(min_length=3, max_length=1000)


# ---------- Public: shop ----------
async def get_settings() -> dict:
    return await db.settings.find_one({"id": "shop"}, P)


@api.get("/")
async def root():
    return {"ok": True}


@api.get("/settings")
async def public_settings():
    return await get_settings()


@api.get("/categories")
async def categories():
    cats = await db.categories.find({}, P).sort("order", 1).to_list(100)
    counts = {c["_id"]: c["n"] for c in await db.products.aggregate(
        [{"$match": {"active": True}}, {"$group": {"_id": "$category", "n": {"$sum": 1}}}]).to_list(100)}
    for c in cats:
        c["count"] = counts.get(c["slug"], 0)
    return cats


CARD = {"_id": 0, "description": 0, "specs": 0}


@api.get("/home")
async def home():
    q = {"active": True}
    featured = await db.products.find({**q, "featured": True}, CARD).sort("created_at", -1).limit(8).to_list(8)
    latest = await db.products.find(q, CARD).sort("created_at", -1).limit(8).to_list(8)
    best = await db.products.find(q, CARD).sort("sold_count", -1).limit(8).to_list(8)
    offers = await db.products.aggregate([
        {"$match": q}, {"$addFields": {"off": {"$divide": [{"$subtract": ["$price", "$sale_price"]}, "$price"]}}},
        {"$sort": {"off": -1}}, {"$limit": 4}, {"$project": {**CARD, "off": 0}}]).to_list(4)
    reviews = await db.reviews.find({"rating": {"$gte": 4}}, P).sort("created_at", -1).limit(6).to_list(6)
    coupons = await db.coupons.find({"active": True}, P).to_list(10)
    return {"featured": featured, "latest": latest, "best_sellers": best, "offers": offers,
            "reviews": reviews, "coupons": coupons}


@api.get("/products")
async def list_products(category: Optional[str] = None, q: Optional[str] = Query(None, max_length=80),
                        brand: Optional[str] = None, min_price: Optional[int] = None, max_price: Optional[int] = None,
                        sort: Literal["new", "price_asc", "price_desc", "popular", "discount"] = "new",
                        in_stock: bool = False, page: int = Query(1, ge=1), limit: int = Query(24, ge=1, le=60)):
    f: dict = {"active": True}
    if category:
        f["category"] = category
    if brand:
        f["brand"] = brand
    if q:
        f["$or"] = [{"name": {"$regex": re.escape(q), "$options": "i"}},
                    {"brand": {"$regex": re.escape(q), "$options": "i"}}]
    if min_price is not None or max_price is not None:
        f["sale_price"] = {k: v for k, v in (("$gte", min_price), ("$lte", max_price)) if v is not None}
    if in_stock:
        f["stock"] = {"$gt": 0}
    sorts = {"new": [("created_at", -1)], "price_asc": [("sale_price", 1)], "price_desc": [("sale_price", -1)],
             "popular": [("sold_count", -1)]}
    total = await db.products.count_documents(f)
    if sort == "discount":
        items = await db.products.aggregate([
            {"$match": f}, {"$addFields": {"off": {"$divide": [{"$subtract": ["$price", "$sale_price"]}, "$price"]}}},
            {"$sort": {"off": -1}}, {"$skip": (page - 1) * limit}, {"$limit": limit}, {"$project": {**CARD, "off": 0}}]).to_list(limit)
    else:
        items = await db.products.find(f, CARD).sort(sorts[sort]).skip((page - 1) * limit).limit(limit).to_list(limit)
    brands = await db.products.distinct("brand", {"active": True, **({"category": category} if category else {})})
    return {"items": items, "total": total, "page": page, "brands": sorted(brands)}


@api.get("/products/{key}")
async def product_detail(key: str):
    p = await db.products.find_one({"$or": [{"id": key}, {"slug": key}], "active": True}, P)
    if not p:
        raise HTTPException(404, "Product not found")
    reviews = await db.reviews.find({"product_id": p["id"]}, P).sort("created_at", -1).limit(20).to_list(20)
    related = await db.products.find({"category": p["category"], "active": True, "id": {"$ne": p["id"]}}, CARD).limit(4).to_list(4)
    return {"product": p, "reviews": reviews, "related": related}


@api.post("/products/{pid}/reviews")
async def add_review(pid: str, body: ReviewIn, me=Depends(current_customer)):
    p = await db.products.find_one({"id": pid}, {"_id": 0, "id": 1, "name": 1})
    if not p:
        raise HTTPException(404, "Product not found")
    await db.reviews.update_one(
        {"product_id": pid, "customer_id": me["id"]},
        {"$set": {"rating": body.rating, "comment": body.comment, "customer_name": me["name"].split()[0],
                  "product_name": p["name"], "created_at": now_iso()}, "$setOnInsert": {"id": new_id()}}, upsert=True)
    agg = await db.reviews.aggregate([{"$match": {"product_id": pid}},
                                      {"$group": {"_id": None, "a": {"$avg": "$rating"}, "n": {"$sum": 1}}}]).to_list(1)
    await db.products.update_one({"id": pid}, {"$set": {"rating_avg": round(agg[0]["a"], 1), "rating_count": agg[0]["n"]}})
    return {"ok": True}


@api.get("/images/{iid}")
async def get_image(iid: str):
    img = await db.images.find_one({"id": iid})
    if not img:
        raise HTTPException(404, "Image not found")
    return Response(content=bytes(img["data"]), media_type=img["content_type"],
                    headers={"Cache-Control": "public, max-age=31536000, immutable"})


# ---------- Pricing (server-side only) ----------
async def compute_quote(items: list[CartItem], coupon_code: Optional[str]) -> dict:
    merged: dict[str, int] = {}
    for it in items:
        merged[it.product_id] = merged.get(it.product_id, 0) + it.qty
    prods = {p["id"]: p for p in await db.products.find(
        {"id": {"$in": list(merged)}, "active": True}, CARD).to_list(len(merged))}
    lines, errors = [], []
    for pid, qty in merged.items():
        p = prods.get(pid)
        if not p:
            errors.append({"product_id": pid, "error": "Product no longer available"})
            continue
        if p["stock"] < qty:
            errors.append({"product_id": pid, "error": f"Only {p['stock']} left in stock for {p['name']}"})
        lines.append({"product_id": pid, "name": p["name"], "image": (p.get("images") or [""])[0], "brand": p["brand"],
                      "unit_price": p["sale_price"], "unit_mrp": p["price"], "qty": qty,
                      "line_total": p["sale_price"] * qty, "stock": p["stock"]})
    subtotal = sum(line["line_total"] for line in lines)
    mrp_total = sum(line["unit_mrp"] * line["qty"] for line in lines)
    discount, coupon_msg, applied = 0, None, None
    if coupon_code:
        c = await db.coupons.find_one({"code": coupon_code.strip().upper(), "active": True}, P)
        if not c:
            coupon_msg = "Invalid or expired coupon"
        elif subtotal < c["min_order"]:
            coupon_msg = f"Coupon needs a minimum order of ₹{c['min_order']:,}"
        else:
            discount = money(subtotal * c["value"] / 100) if c["type"] == "percent" else c["value"]
            if c.get("max_discount"):
                discount = min(discount, c["max_discount"])
            discount = min(discount, subtotal)
            applied = c["code"]
    total = subtotal - discount
    advance = money(Decimal(total) * Decimal("0.25"))
    return {"lines": lines, "errors": errors, "subtotal": subtotal, "mrp_total": mrp_total, "coupon_code": applied,
            "coupon_message": coupon_msg, "coupon_discount": discount, "total": total,
            "plans": {"cod": {"online": 0, "on_delivery": total},
                      "upi_full": {"online": total, "on_delivery": 0},
                      "upi_advance": {"online": advance, "on_delivery": total - advance}}}


@api.post("/cart/quote", dependencies=[Depends(rate_limit("quote", 60, 60))])
async def quote(body: QuoteIn):
    return await compute_quote(body.items, body.coupon_code)


async def gen_order_id() -> str:
    while True:
        oid = f"KCS-{datetime.now(timezone.utc):%y%m%d}-{secrets.randbelow(9000) + 1000}"
        if not await db.orders.find_one({"order_id": oid}, {"_id": 1}):
            return oid


async def restore_stock(lines: list[dict]):
    for line in lines:
        await db.products.update_one({"id": line["product_id"]}, {"$inc": {"stock": line["qty"], "sold_count": -line["qty"]}})


@api.post("/orders", dependencies=[Depends(rate_limit("order", 10, 60))])
async def place_order(body: OrderIn, background: BackgroundTasks, me=Depends(optional_customer)):
    settings = await get_settings()
    if settings.get("require_login") and not me:
        raise HTTPException(401, "Please log in to place an order")
    qt = await compute_quote(body.items, body.coupon_code)
    if qt["errors"]:
        raise HTTPException(409, qt["errors"][0]["error"])
    if body.coupon_code and not qt["coupon_code"]:
        raise HTTPException(400, qt["coupon_message"])
    method = body.payment_method
    online = qt["plans"][method]["online"]
    if method != "cod" and body.utr and await db.payments.find_one({"utr": body.utr.upper()}, {"_id": 1}):
        raise HTTPException(409, "This UPI transaction reference has already been used")
    reserved = []
    for line in qt["lines"]:
        ok = await db.products.update_one({"id": line["product_id"], "active": True, "stock": {"$gte": line["qty"]}},
                                          {"$inc": {"stock": -line["qty"], "sold_count": line["qty"]}})
        if ok.modified_count == 0:
            await restore_stock(reserved)
            raise HTTPException(409, f"{line['name']} just went out of stock")
        reserved.append(line)
    pay_status = "not_required" if method == "cod" else ("pending_verification" if body.utr else "awaiting_payment")
    order_id, ts = await gen_order_id(), now_iso()
    items = [{k: v for k, v in line.items() if k != "stock"} for line in qt["lines"]]
    utr = body.utr.upper() if (body.utr and method != "cod") else None
    order = {
        "id": new_id(), "order_id": order_id, "customer_id": me["id"] if me else None,
        "customer": body.customer.model_dump(), "items": items, "subtotal": qt["subtotal"],
        "mrp_total": qt["mrp_total"], "coupon_code": qt["coupon_code"], "coupon_discount": qt["coupon_discount"],
        "total": qt["total"],
        "payment": {"method": method, "online_due": online, "cod_due": qt["total"] - online, "utr": utr,
                    "status": pay_status, "verified_at": None, "note": ""},
        "amount_paid_online": 0, "cod_collected": 0, "status": "new",
        "status_history": [{"status": "new", "at": ts, "note": "Order placed"}],
        "notification_status": "pending", "created_at": ts, "updated_at": ts}
    try:
        await db.orders.insert_one(order)
    except Exception:
        await restore_stock(reserved)
        raise
    pays = []
    if method != "cod":
        pays.append({"id": new_id(), "order_id": order_id, "kind": "online_upi", "amount": online,
                     "utr": utr, "status": pay_status, "created_at": ts})
    if qt["total"] - online > 0:
        pays.append({"id": new_id(), "order_id": order_id, "kind": "cash_on_delivery", "amount": qt["total"] - online,
                     "utr": None, "status": "due_on_delivery", "created_at": ts})
    for pay in pays:
        try:
            await db.payments.insert_one(pay)
        except Exception:
            pay["utr"] = None
            await db.payments.insert_one(pay)
    background.add_task(notify_order, order_id)
    order.pop("_id", None)
    return order


# ---------- Tracking ----------
def public_order(o: dict) -> dict:
    name = o["customer"]["name"].split()[0]
    utr = o["payment"].get("utr")
    return {"order_id": o["order_id"], "status": o["status"], "status_history": o["status_history"],
            "items": [{k: i[k] for k in ("name", "qty", "unit_price", "line_total", "image")} for i in o["items"]],
            "subtotal": o["subtotal"], "coupon_discount": o["coupon_discount"], "total": o["total"],
            "payment": {**{k: o["payment"][k] for k in ("method", "online_due", "cod_due", "status")},
                        "utr": f"****{utr[-4:]}" if utr else None},
            "customer_name": name, "city": o["customer"]["address"]["city"], "created_at": o["created_at"]}


async def find_tracked(order_id: str, mobile: str) -> dict:
    o = await db.orders.find_one({"order_id": order_id.strip().upper(), "customer.mobile": norm_mobile(mobile)}, P)
    if not o:
        raise HTTPException(404, "No order found for this Order ID and mobile number")
    return o


@api.post("/track", dependencies=[Depends(rate_limit("track", 20, 60))])
async def track(body: TrackIn):
    return public_order(await find_tracked(body.order_id, body.mobile))


async def set_utr(o: dict, utr: str) -> dict:
    if o["payment"]["method"] == "cod":
        raise HTTPException(400, "No online payment needed for Cash on Delivery")
    if o["payment"]["status"] not in ("awaiting_payment", "rejected") or o["status"] == "cancelled":
        raise HTTPException(400, "Payment reference cannot be changed now")
    utr = utr.upper()
    if await db.payments.find_one({"utr": utr, "order_id": {"$ne": o["order_id"]}}, {"_id": 1}):
        raise HTTPException(409, "This UPI transaction reference has already been used")
    await db.payments.update_one({"order_id": o["order_id"], "kind": "online_upi"},
                                 {"$set": {"utr": utr, "status": "pending_verification", "updated_at": now_iso()}})
    return await db.orders.find_one_and_update(
        {"order_id": o["order_id"]}, {"$set": {"payment.utr": utr, "payment.status": "pending_verification", "updated_at": now_iso()}},
        projection=P, return_document=ReturnDocument.AFTER)


@api.post("/track/utr", dependencies=[Depends(rate_limit("utr", 10, 60))])
async def track_utr(body: UtrIn):
    return public_order(await set_utr(await find_tracked(body.order_id, body.mobile), body.utr))


# ---------- Customer auth & account ----------
def cust_out(c: dict) -> dict:
    return {k: v for k, v in c.items() if k not in ("_id", "password_hash")}


@api.post("/auth/register", dependencies=[Depends(rate_limit("register", 10, 300))])
async def register(body: RegisterIn):
    email = body.email.lower()
    if await db.customers.find_one({"$or": [{"email": email}, {"mobile": body.mobile}]}, {"_id": 1}):
        raise HTTPException(409, "An account with this email or mobile already exists")
    c = {"id": new_id(), "name": body.name.strip(), "email": email, "mobile": body.mobile,
         "password_hash": hash_pw(body.password), "addresses": [], "created_at": now_iso()}
    await db.customers.insert_one(c)
    return {"token": make_token(c["id"], "customer"), "customer": cust_out(c)}


@api.post("/auth/login", dependencies=[Depends(rate_limit("login", 20, 60))])
async def login(body: LoginIn, request: Request):
    ident = body.identifier.strip().lower()
    key = f"cust:{client_ip(request)}:{ident}"
    await check_lock(key)
    c = await db.customers.find_one({"$or": [{"email": ident}, {"mobile": norm_mobile(ident)}]})
    if not c or not check_pw(body.password, c["password_hash"]):
        await record_fail(key)
        raise HTTPException(401, "Invalid login details")
    await clear_fails(key)
    return {"token": make_token(c["id"], "customer"), "customer": cust_out(c)}


@api.get("/auth/me")
async def me(me=Depends(current_customer)):
    return me


@api.put("/auth/me")
async def update_me(body: ProfileIn, me=Depends(current_customer)):
    return await db.customers.find_one_and_update(
        {"id": me["id"]}, {"$set": {"name": body.name.strip(), "addresses": [a.model_dump() for a in body.addresses]}},
        projection={"_id": 0, "password_hash": 0}, return_document=ReturnDocument.AFTER)


@api.get("/account/orders")
async def my_orders(me=Depends(current_customer)):
    return await db.orders.find({"customer_id": me["id"]}, P).sort("created_at", -1).to_list(200)


@api.get("/account/payments")
async def my_payments(me=Depends(current_customer)):
    ids = await db.orders.distinct("order_id", {"customer_id": me["id"]})
    return await db.payments.find({"order_id": {"$in": ids}}, P).sort("created_at", -1).to_list(500)


@api.post("/account/orders/{order_id}/utr")
async def my_order_utr(order_id: str, body: dict, me=Depends(current_customer)):
    utr = str(body.get("utr", ""))
    if not re.match(UTR_RE, utr):
        raise HTTPException(422, "Enter a valid UPI transaction reference")
    o = await db.orders.find_one({"order_id": order_id, "customer_id": me["id"]}, P)
    if not o:
        raise HTTPException(404, "Order not found")
    return await set_utr(o, utr)


# ---------- Admin ----------
@api.post("/admin/login", dependencies=[Depends(rate_limit("admin_login", 10, 60))])
async def admin_login(body: AdminLoginIn, request: Request):
    email = body.email.lower()
    key = f"admin:{client_ip(request)}:{email}"
    await check_lock(key)
    a = await db.admins.find_one({"email": email})
    if not a or not check_pw(body.password, a["password_hash"]):
        await record_fail(key)
        raise HTTPException(401, "Invalid email or password")
    await clear_fails(key)
    return {"token": make_token(a["id"], "admin"), "admin": {"id": a["id"], "email": a["email"], "name": a["name"]}}


@api.get("/admin/me")
async def admin_me(admin=Depends(current_admin)):
    return admin


@api.get("/admin/stats")
async def admin_stats(_=Depends(current_admin)):
    g = await db.orders.aggregate([{"$facet": {
        "all": [{"$group": {"_id": None, "n": {"$sum": 1}}}],
        "live": [{"$match": {"status": {"$ne": "cancelled"}}}, {"$group": {
            "_id": None, "sales": {"$sum": "$total"}, "online": {"$sum": "$amount_paid_online"},
            "cod": {"$sum": "$cod_collected"},
            "outstanding": {"$sum": {"$subtract": ["$total", {"$add": ["$amount_paid_online", "$cod_collected"]}]}},
            "cod_orders": {"$sum": {"$cond": [{"$eq": ["$payment.method", "cod"]}, 1, 0]}},
            "online_orders": {"$sum": {"$cond": [{"$ne": ["$payment.method", "cod"]}, 1, 0]}}}}],
        "status": [{"$group": {"_id": "$status", "n": {"$sum": 1}}}],
        "to_verify": [{"$match": {"payment.status": "pending_verification", "status": {"$ne": "cancelled"}}}, {"$count": "n"}],
    }}]).to_list(1)
    f = g[0]
    live = (f["live"] or [{}])[0]
    by_status = {s["_id"]: s["n"] for s in f["status"]}
    mobiles = set(await db.customers.distinct("mobile")) | set(await db.orders.distinct("customer.mobile"))
    recent = await db.orders.find({}, {"_id": 0, "order_id": 1, "customer.name": 1, "total": 1, "status": 1,
                                       "payment": 1, "created_at": 1}).sort("created_at", -1).limit(6).to_list(6)
    low = await db.products.find({"stock": {"$lte": 5}}, {"_id": 0, "id": 1, "name": 1, "stock": 1}).sort("stock", 1).limit(6).to_list(6)
    return {"total_products": await db.products.count_documents({}), "total_orders": (f["all"] or [{"n": 0}])[0]["n"],
            "total_customers": len(mobiles), "total_sales": live.get("sales", 0),
            "pending_orders": sum(by_status.get(s, 0) for s in ("new", "confirmed", "packed", "dispatched")),
            "delivered_orders": by_status.get("delivered", 0), "online_payments": live.get("online", 0),
            "online_orders": live.get("online_orders", 0), "cod_payments": live.get("cod", 0),
            "cod_orders": live.get("cod_orders", 0), "outstanding_payments": live.get("outstanding", 0),
            "payments_to_verify": (f["to_verify"] or [{"n": 0}])[0]["n"], "by_status": by_status,
            "recent_orders": recent, "low_stock": low, "whatsapp_configured": wa_configured()}


ALLOWED_IMG = {"image/jpeg": b"\xff\xd8", "image/png": b"\x89PNG", "image/webp": b"RIFF"}
MAX_IMG = 3 * 1024 * 1024


@api.post("/admin/images")
async def upload_images(files: list[UploadFile] = File(...), _=Depends(current_admin)):
    if len(files) > 10:
        raise HTTPException(400, "Upload at most 10 images at once")
    urls = []
    for f in files:
        data = await f.read(MAX_IMG + 1)
        magic = ALLOWED_IMG.get(f.content_type or "")
        if not magic or not data.startswith(magic):
            raise HTTPException(400, f"{f.filename}: only JPG, PNG or WEBP images are allowed")
        if len(data) > MAX_IMG:
            raise HTTPException(400, f"{f.filename}: image must be under 3 MB")
        iid = new_id()
        await db.images.insert_one({"id": iid, "content_type": f.content_type, "data": Binary(data),
                                    "size": len(data), "created_at": now_iso()})
        urls.append(f"/api/images/{iid}")
    return {"urls": urls}


@api.get("/admin/products")
async def admin_products(q: Optional[str] = Query(None, max_length=80), category: Optional[str] = None,
                         _=Depends(current_admin)):
    f: dict = {}
    if q:
        f["$or"] = [{"name": {"$regex": re.escape(q), "$options": "i"}}, {"brand": {"$regex": re.escape(q), "$options": "i"}}]
    if category:
        f["category"] = category
    return await db.products.find(f, P).sort("created_at", -1).to_list(1000)


async def _validate_product(body: ProductIn):
    if body.sale_price > body.price:
        raise HTTPException(400, "Discounted price cannot be more than the original price")
    if not await db.categories.find_one({"slug": body.category}, {"_id": 1}):
        raise HTTPException(400, "Unknown category")


async def unique_slug(name: str, exclude_id: Optional[str] = None) -> str:
    base, n = slugify(name) or "product", 1
    slug = base
    while await db.products.find_one({"slug": slug, **({"id": {"$ne": exclude_id}} if exclude_id else {})}, {"_id": 1}):
        n += 1
        slug = f"{base}-{n}"
    return slug


@api.post("/admin/products")
async def create_product(body: ProductIn, _=Depends(current_admin)):
    await _validate_product(body)
    doc = {"id": new_id(), "slug": await unique_slug(body.name), **body.model_dump(), "sold_count": 0,
           "rating_avg": 0, "rating_count": 0, "created_at": now_iso()}
    await db.products.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.put("/admin/products/{pid}")
async def update_product(pid: str, body: ProductIn, _=Depends(current_admin)):
    await _validate_product(body)
    doc = await db.products.find_one_and_update(
        {"id": pid}, {"$set": {**body.model_dump(), "slug": await unique_slug(body.name, pid), "updated_at": now_iso()}},
        projection=P, return_document=ReturnDocument.AFTER)
    if not doc:
        raise HTTPException(404, "Product not found")
    return doc


@api.patch("/admin/products/{pid}")
async def patch_product(pid: str, body: dict, _=Depends(current_admin)):
    allowed = {k: v for k, v in body.items() if k in ("stock", "featured", "active")}
    if "stock" in allowed and (not isinstance(allowed["stock"], int) or allowed["stock"] < 0):
        raise HTTPException(422, "Stock must be a positive whole number")
    if not allowed:
        raise HTTPException(422, "Nothing to update")
    doc = await db.products.find_one_and_update({"id": pid}, {"$set": allowed}, projection=P,
                                                return_document=ReturnDocument.AFTER)
    if not doc:
        raise HTTPException(404, "Product not found")
    return doc


@api.delete("/admin/products/{pid}")
async def delete_product(pid: str, _=Depends(current_admin)):
    p = await db.products.find_one_and_delete({"id": pid}, projection={"images": 1})
    if not p:
        raise HTTPException(404, "Product not found")
    ids = [u.rsplit("/", 1)[-1] for u in p.get("images", []) if u.startswith("/api/images/")]
    if ids:
        await db.images.delete_many({"id": {"$in": ids}})
    return {"ok": True}


@api.post("/admin/categories")
async def create_category(body: CategoryIn, _=Depends(current_admin)):
    slug = slugify(body.name)
    if await db.categories.find_one({"slug": slug}, {"_id": 1}):
        raise HTTPException(409, "Category already exists")
    doc = {"id": new_id(), "slug": slug, "name": body.name.strip(), "icon": body.icon,
           "order": await db.categories.count_documents({})}
    await db.categories.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.put("/admin/categories/{cid}")
async def rename_category(cid: str, body: CategoryIn, _=Depends(current_admin)):
    doc = await db.categories.find_one_and_update({"id": cid}, {"$set": {"name": body.name.strip(), "icon": body.icon}},
                                                  projection=P, return_document=ReturnDocument.AFTER)
    if not doc:
        raise HTTPException(404, "Category not found")
    return doc


@api.delete("/admin/categories/{cid}")
async def delete_category(cid: str, _=Depends(current_admin)):
    c = await db.categories.find_one({"id": cid}, P)
    if not c:
        raise HTTPException(404, "Category not found")
    if await db.products.count_documents({"category": c["slug"]}):
        raise HTTPException(409, "Move or delete this category's products first")
    await db.categories.delete_one({"id": cid})
    return {"ok": True}


@api.get("/admin/coupons")
async def list_coupons(_=Depends(current_admin)):
    return await db.coupons.find({}, P).to_list(100)


@api.post("/admin/coupons")
async def create_coupon(body: CouponIn, _=Depends(current_admin)):
    if body.type == "percent" and body.value > 90:
        raise HTTPException(400, "Percent discount cannot exceed 90%")
    doc = {"id": new_id(), **body.model_dump(), "code": body.code.upper()}
    if await db.coupons.find_one({"code": doc["code"]}, {"_id": 1}):
        raise HTTPException(409, "Coupon code already exists")
    await db.coupons.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.patch("/admin/coupons/{cid}")
async def toggle_coupon(cid: str, body: dict, _=Depends(current_admin)):
    doc = await db.coupons.find_one_and_update({"id": cid}, {"$set": {"active": bool(body.get("active"))}},
                                               projection=P, return_document=ReturnDocument.AFTER)
    if not doc:
        raise HTTPException(404, "Coupon not found")
    return doc


@api.delete("/admin/coupons/{cid}")
async def delete_coupon(cid: str, _=Depends(current_admin)):
    await db.coupons.delete_one({"id": cid})
    return {"ok": True}


@api.put("/admin/settings")
async def update_settings(body: SettingsIn, _=Depends(current_admin)):
    return await db.settings.find_one_and_update({"id": "shop"}, {"$set": body.model_dump()}, projection=P,
                                                 return_document=ReturnDocument.AFTER)


IST = timezone(timedelta(hours=5, minutes=30))


def ist_day_start(d: str) -> datetime:
    return datetime.strptime(d, "%Y-%m-%d").replace(tzinfo=IST).astimezone(timezone.utc)


@api.get("/admin/orders")
async def admin_orders(q: Optional[str] = Query(None, max_length=80), status: Optional[str] = None,
                       payment_status: Optional[str] = None, date_from: Optional[str] = None,
                       date_to: Optional[str] = None, _=Depends(current_admin)):
    f: dict = {}
    if q:
        rx = {"$regex": re.escape(q.strip()), "$options": "i"}
        f["$or"] = [{"order_id": rx}, {"customer.name": rx}, {"customer.mobile": rx}, {"customer.email": rx}]
    if status:
        f["status"] = status
    if payment_status:
        f["payment.status"] = payment_status
    if date_from or date_to:
        f["created_at"] = {}
        try:
            if date_from:
                f["created_at"]["$gte"] = ist_day_start(date_from).isoformat()
            if date_to:
                f["created_at"]["$lt"] = (ist_day_start(date_to) + timedelta(days=1)).isoformat()
        except ValueError:
            raise HTTPException(422, "Dates must be YYYY-MM-DD")
    return await db.orders.find(f, P).sort("created_at", -1).to_list(500)


@api.get("/admin/orders/{order_id}")
async def admin_order(order_id: str, _=Depends(current_admin)):
    o = await db.orders.find_one({"order_id": order_id}, P)
    if not o:
        raise HTTPException(404, "Order not found")
    o["payments"] = await db.payments.find({"order_id": order_id}, P).to_list(10)
    o["notification"] = await db.notifications.find_one({"order_id": order_id}, P) or {"message": build_message(o), "status": "pending"}
    return o


@api.post("/admin/orders/{order_id}/verify-payment")
async def verify_payment(order_id: str, body: VerifyIn, admin=Depends(current_admin)):
    o = await db.orders.find_one({"order_id": order_id}, P)
    if not o:
        raise HTTPException(404, "Order not found")
    if o["payment"]["method"] == "cod":
        raise HTTPException(400, "Cash on Delivery orders have no online payment")
    if o["status"] == "cancelled":
        raise HTTPException(400, "Order is cancelled")
    if body.decision == "verified" and not o["payment"].get("utr"):
        raise HTTPException(400, "Customer has not submitted a UPI reference yet")
    ts = now_iso()
    upd = {"payment.status": body.decision, "payment.note": body.note, "payment.verified_at": ts,
           "payment.verified_by": admin["email"], "updated_at": ts,
           "amount_paid_online": o["payment"]["online_due"] if body.decision == "verified" else 0}
    push = {"status": "payment_" + body.decision, "at": ts, "note": body.note or f"Payment {body.decision} by admin"}
    hist = [push]
    if body.decision == "verified" and o["status"] == "new":
        upd["status"] = "confirmed"
        hist.append({"status": "confirmed", "at": ts, "note": "Confirmed after payment verification"})
    await db.payments.update_one({"order_id": order_id, "kind": "online_upi"},
                                 {"$set": {"status": body.decision, "verified_at": ts, "verified_by": admin["email"]}})
    return await db.orders.find_one_and_update({"order_id": order_id}, {"$set": upd, "$push": {"status_history": {"$each": hist}}},
                                               projection=P, return_document=ReturnDocument.AFTER)


@api.post("/admin/orders/{order_id}/status")
async def update_status(order_id: str, body: StatusIn, _=Depends(current_admin)):
    o = await db.orders.find_one({"order_id": order_id}, P)
    if not o:
        raise HTTPException(404, "Order not found")
    cur, new = o["status"], body.status
    if cur in ("cancelled", "delivered"):
        raise HTTPException(400, f"Order is already {cur}")
    online_ok = o["payment"]["method"] == "cod" or o["payment"]["status"] == "verified"
    if new != "cancelled":
        if STATUSES.index(new) <= STATUSES.index(cur):
            raise HTTPException(400, "Status can only move forward")
        if not online_ok:
            raise HTTPException(400, "Verify the online payment before confirming or dispatching this order")
    ts = now_iso()
    upd: dict = {"status": new, "updated_at": ts}
    if new == "delivered":
        upd["cod_collected"] = o["payment"]["cod_due"]
        await db.payments.update_one({"order_id": order_id, "kind": "cash_on_delivery"},
                                     {"$set": {"status": "collected", "collected_at": ts}})
    if new == "cancelled":
        await restore_stock(o["items"])
        await db.payments.update_many({"order_id": order_id, "status": {"$in": ["due_on_delivery", "awaiting_payment", "pending_verification", "rejected"]}},
                                      {"$set": {"status": "cancelled"}})
        await db.payments.update_many({"order_id": order_id, "status": "verified"}, {"$set": {"status": "refund_due"}})
    return await db.orders.find_one_and_update(
        {"order_id": order_id}, {"$set": upd, "$push": {"status_history": {"status": new, "at": ts, "note": body.note}}},
        projection=P, return_document=ReturnDocument.AFTER)


@api.post("/admin/orders/{order_id}/notify")
async def resend_notification(order_id: str, _=Depends(current_admin)):
    if not await db.orders.find_one({"order_id": order_id}, {"_id": 1}):
        raise HTTPException(404, "Order not found")
    return await notify_order(order_id)


@api.get("/admin/customers")
async def admin_customers(q: Optional[str] = Query(None, max_length=80), _=Depends(current_admin)):
    f = {}
    if q:
        rx = {"$regex": re.escape(q), "$options": "i"}
        f = {"$or": [{"name": rx}, {"email": rx}, {"mobile": rx}]}
    custs = await db.customers.find(f, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(1000)
    stats = {s["_id"]: s for s in await db.orders.aggregate([
        {"$match": {"status": {"$ne": "cancelled"}}},
        {"$group": {"_id": "$customer.mobile", "orders": {"$sum": 1}, "spent": {"$sum": "$total"}}}]).to_list(5000)}
    for c in custs:
        s = stats.get(c["mobile"], {})
        c["orders"], c["spent"] = s.get("orders", 0), s.get("spent", 0)
    return custs


@api.get("/admin/payments")
async def admin_payments(status: Optional[str] = None, _=Depends(current_admin)):
    f = {"status": status} if status else {}
    return await db.payments.find(f, P).sort("created_at", -1).to_list(1000)


@api.get("/admin/notifications")
async def admin_notifications(_=Depends(current_admin)):
    return {"configured": wa_configured(),
            "items": await db.notifications.find({}, P).sort("created_at", -1).limit(100).to_list(100)}


app.include_router(api)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=os.environ["CORS_ORIGINS"].split(","),
                   allow_methods=["*"], allow_headers=["*"])
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")


async def ensure_indexes():
    for coll, models in INDEXES.items():
        for m in models:
            try:
                await db[coll].create_indexes([m])
            except Exception as exc:
                log.error("index %s.%s: %s", coll, m.document["name"], exc)


@app.on_event("startup")
async def startup():
    await ensure_indexes()
    await seed()


@app.on_event("shutdown")
async def shutdown():
    with suppress(Exception):
        client.close()
