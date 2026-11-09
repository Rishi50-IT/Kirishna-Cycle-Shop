import logging
import os
import re
from datetime import datetime

import httpx

from core import db, new_id, now_iso

log = logging.getLogger("whatsapp")
ENV_KEYS = ("WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_TO",
            "WHATSAPP_TEMPLATE_NAME", "WHATSAPP_TEMPLATE_LANGUAGE")
PAY_LABEL = {"cod": "Cash on Delivery", "upi_full": "Full Payment (UPI)",
             "upi_advance": "25% Advance (UPI) + 75% on Delivery"}
PAY_STATUS = {"not_required": "Not Required", "awaiting_payment": "Awaiting Payment",
              "pending_verification": "Pending Verification", "verified": "Verified", "rejected": "Rejected"}


def env(name: str) -> str:
    return (os.environ.get(name) or "").strip()


def configured() -> bool:
    return all(env(k) for k in ENV_KEYS)


def inr(n) -> str:
    n = int(round(n))
    s = str(abs(n))
    if len(s) > 3:
        head, tail = s[:-3], s[-3:]
        head = re.sub(r"(\d)(?=(\d{2})+$)", r"\1,", head)
        s = f"{head},{tail}"
    return f"₹{'-' if n < 0 else ''}{s}"


def address_line(a: dict) -> str:
    parts = [a.get("line1"), a.get("line2"), a.get("landmark"), a.get("city"), a.get("state"), a.get("pincode")]
    return ", ".join(p for p in parts if p)


def order_date(order: dict) -> str:
    return datetime.fromisoformat(order["created_at"]).strftime("%d %b %Y, %I:%M %p UTC")


def build_message(order: dict) -> str:
    c, p = order["customer"], order["payment"]
    products = "\n\n".join(
        f"Product: {i['name']}\nQuantity: {i['qty']}\nPrice: {inr(i['unit_price'])}" for i in order["items"])
    return (
        "🛒 NEW ORDER RECEIVED!\n\nKIRISHNA CYCLE SHOP\n\n"
        f"Order ID: {order['order_id']}\n\nCUSTOMER DETAILS:\n\nName: {c['name']}\nMobile: {c['mobile']}\n"
        f"Email: {c.get('email') or '-'}\nDelivery Address: {address_line(c['address'])}\n\n"
        f"PRODUCT DETAILS:\n\n{products}\n\nTotal Order Amount: {inr(order['total'])}\n\n"
        f"PAYMENT DETAILS:\n\nPayment Method: {PAY_LABEL[p['method']]}\nOnline Payment: {inr(p['online_due'])}\n"
        f"Remaining COD: {inr(p['cod_due'])}\nPayment Status: {PAY_STATUS[p['status']]}\n\n"
        f"Order Date: {order_date(order)}\n\nPlease log in to the admin dashboard to manage this order."
    )


def _clean(text: str) -> str:
    # Meta rejects template params containing newlines, tabs or 4+ spaces
    return re.sub(r"\s{2,}", " ", re.sub(r"[\n\t]", " ", str(text))).strip()[:1000] or "-"


def template_params(order: dict) -> list[str]:
    c, p = order["customer"], order["payment"]
    products = " | ".join(f"{i['name']} x{i['qty']} @ {inr(i['unit_price'])}" for i in order["items"])
    values = [order["order_id"], c["name"], c["mobile"], c.get("email") or "-", address_line(c["address"]),
              products, inr(order["total"]), PAY_LABEL[p["method"]], inr(p["online_due"]), inr(p["cod_due"]),
              PAY_STATUS[p["status"]], order_date(order)]
    return [_clean(v) for v in values]


async def _post(order: dict) -> dict:
    url = f"https://graph.facebook.com/{env('WHATSAPP_API_VERSION') or 'v24.0'}/{env('WHATSAPP_PHONE_NUMBER_ID')}/messages"
    payload = {
        "messaging_product": "whatsapp", "recipient_type": "individual", "to": env("WHATSAPP_TO"),
        "type": "template",
        "template": {
            "name": env("WHATSAPP_TEMPLATE_NAME"), "language": {"code": env("WHATSAPP_TEMPLATE_LANGUAGE")},
            "components": [{"type": "body", "parameters": [{"type": "text", "text": v} for v in template_params(order)]}],
        },
    }
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(10.0, connect=5.0)) as http:
            r = await http.post(url, json=payload, headers={"Authorization": f"Bearer {env('WHATSAPP_ACCESS_TOKEN')}"})
        data = r.json()
        if r.is_error:
            err = data.get("error", {})
            return {"status": "failed", "error": f"{err.get('code')}: {err.get('message')} {err.get('error_data', {}).get('details', '')}".strip()}
        return {"status": "sent", "message_id": (data.get("messages") or [{}])[0].get("id"), "error": None}
    except (httpx.HTTPError, ValueError) as exc:
        return {"status": "failed", "error": f"WhatsApp API unreachable: {exc.__class__.__name__}"}


async def notify_order(order_id: str) -> dict:
    """Never raises: an order must survive any notification failure."""
    try:
        order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
        if configured():
            result = await _post(order)
        else:
            result = {"status": "not_configured", "error": "WhatsApp API keys not set"}
        doc = {"channel": "whatsapp", "to": env("WHATSAPP_TO") or None, "message": build_message(order),
               "updated_at": now_iso(), **result}
        await db.notifications.update_one(
            {"order_id": order_id},
            {"$set": doc, "$inc": {"attempts": 1}, "$setOnInsert": {"id": new_id(), "order_id": order_id, "created_at": now_iso()}},
            upsert=True)
        await db.orders.update_one({"order_id": order_id}, {"$set": {"notification_status": result["status"]}})
        if result["status"] == "failed":
            log.warning("WhatsApp notify failed for %s: %s", order_id, result.get("error"))
        return result
    except Exception as exc:
        log.exception("notify_order crashed for %s", order_id)
        return {"status": "failed", "error": str(exc)}
