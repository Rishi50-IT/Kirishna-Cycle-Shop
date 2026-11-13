import os
import re

from core import db, hash_pw, new_id, now_iso

CATEGORIES = [
    ("mountain-cycles", "Mountain Cycles", "Mountain"), ("gear-cycles", "Gear Cycles", "Cog"),
    ("kids-cycles", "Kids Cycles", "Baby"), ("ladies-cycles", "Ladies Cycles", "Flower2"),
    ("road-bicycles", "Road Bicycles", "Route"), ("electric-cycles", "Electric Cycles", "Zap"),
    ("bicycle-accessories", "Bicycle Accessories", "Package"), ("bicycle-spare-parts", "Bicycle Spare Parts", "Settings"),
    ("helmets", "Helmets", "HardHat"), ("tyres-and-tubes", "Tyres and Tubes", "CircleDot"),
    ("bicycle-lights", "Bicycle Lights", "Lightbulb"), ("bicycle-tools", "Bicycle Tools", "Wrench"),
]

# Sample catalogue: names, prices and specs are editable placeholders for the shop owner.
P = [
    ("Trail Rider 27.5 MTB 21-Speed", "mountain-cycles", "Hercules", 18999, 14999, 12, ["mtb1", "mtb2"], True,
     {"Frame": "Alloy 17 inch", "Gears": "21-speed Shimano", "Brakes": "Dual disc", "Wheel size": "27.5 inch"}, "2 years on frame, 6 months on parts"),
    ("Summit X 29er Hardtail", "mountain-cycles", "Firefox", 32999, 27999, 6, ["mtb3", "mtb4"], True,
     {"Frame": "Alloy 18 inch", "Gears": "24-speed", "Suspension": "100mm front fork", "Wheel size": "29 inch"}, "3 years on frame"),
    ("City Shift 7-Speed Gear Cycle", "gear-cycles", "Hero", 11499, 9499, 20, ["mtb4", "road1"], False,
     {"Frame": "Steel 18 inch", "Gears": "7-speed", "Brakes": "V-brake", "Wheel size": "26 inch"}, "1 year on frame"),
    ("Little Champ 16T Kids Cycle", "kids-cycles", "Hero", 6499, 4999, 25, ["kids1", "kids2"], True,
     {"Age": "4-7 years", "Frame": "Steel", "Training wheels": "Included", "Wheel size": "16 inch"}, "1 year on frame"),
    ("Grace 26T Ladies Cycle with Basket", "ladies-cycles", "Hercules", 8999, 7499, 15, ["kids1", "road1"], False,
     {"Frame": "Step-through steel", "Basket": "Front basket", "Brakes": "Caliper", "Wheel size": "26 inch"}, "1 year on frame"),
    ("AeroLite 700C Road Bike", "road-bicycles", "Btwin", 39999, 34999, 4, ["road2", "road3"], True,
     {"Frame": "Aluminium 6061", "Gears": "16-speed Shimano Claris", "Weight": "10.2 kg", "Tyres": "700x25C"}, "Lifetime frame warranty"),
    ("Sprint Pro 700C Hybrid", "road-bicycles", "Hero", 21999, 18499, 9, ["road1", "road2"], False,
     {"Frame": "Alloy", "Gears": "21-speed", "Brakes": "Mechanical disc", "Tyres": "700x35C"}, "2 years on frame"),
    ("VoltRide E-Cycle 36V", "electric-cycles", "EMotorad", 44999, 38999, 5, ["ebike1", "ebike2"], True,
     {"Battery": "36V 7.8Ah removable", "Range": "Up to 40 km", "Motor": "250W hub", "Top speed": "25 km/h"}, "2 years on battery and motor"),
    ("Bottle Cage + Bell + Stand Combo", "bicycle-accessories", "Kirishna", 899, 649, 60, ["parts1", "repair1"], False,
     {"Includes": "Bottle cage, bell, side stand", "Material": "Alloy", "Fits": "Most cycles"}, "No warranty"),
    ("Shimano Chain 8-Speed", "bicycle-spare-parts", "Shimano", 1299, 1049, 30, ["parts1", "tools1"], False,
     {"Speeds": "6/7/8-speed", "Links": "116", "Finish": "Rust-resistant"}, "6 months"),
    ("AirFlow Ventilated Helmet", "helmets", "Btwin", 2499, 1799, 22, ["helmet1", "helmet2"], True,
     {"Vents": "18", "Size": "M (55-59 cm)", "Certification": "CE EN1078", "Weight": "260 g"}, "1 year manufacturing defects"),
    ("Kids Safety Helmet", "helmets", "Hero", 1199, 899, 18, ["helmet2", "helmet1"], False,
     {"Size": "S (50-54 cm)", "Adjustable": "Dial fit", "Weight": "220 g"}, "1 year manufacturing defects"),
    ("26 x 1.95 MTB Tyre + Tube Set", "tyres-and-tubes", "Ralson", 1199, 949, 40, ["mtb2", "parts1"], False,
     {"Size": "26 x 1.95", "Tube valve": "Schrader", "Tread": "All-terrain"}, "3 months"),
    ("USB Rechargeable Front + Rear Light", "bicycle-lights", "Kirishna", 1499, 999, 35, ["road3", "road2"], True,
     {"Brightness": "400 lumen front", "Battery": "USB-C, 4 hrs", "Modes": "5", "Waterproof": "IPX4"}, "6 months"),
    ("16-in-1 Multi Tool Kit", "bicycle-tools", "Kirishna", 1299, 899, 28, ["tools1", "tools2"], False,
     {"Tools": "Hex keys, chain breaker, screwdrivers", "Material": "Chrome vanadium"}, "1 year"),
    ("Floor Pump with Gauge", "bicycle-tools", "Btwin", 1899, 1499, 14, ["tools2", "repair1"], False,
     {"Max pressure": "160 psi", "Valves": "Presta & Schrader", "Gauge": "Analog"}, "1 year"),
]


def slugify(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


async def seed():
    email = os.environ["rishimunda50@gmail.com"].lower()
    if not await db.admins.find_one({"email": email}):
        await db.admins.insert_one({"id": new_id(), "email": email, "name": "Shop Owner",
                                    "password_hash": hash_pw(os.environ["Rishimunda50@2026"]), "created_at": now_iso()})
    if not await db.settings.find_one({"id": "shop"}):
        await db.settings.insert_one({
            "id": "shop", "shop_name": "Kirishna Cycle Shop", "phone": "9508668053", "whatsapp": "9508668053",
            "email": "kumarkirishna5777@gmail.com", "address": "", "upi_id": "kumarkirishna5777@oksbi",
            "upi_payee_name": "Kirishna Cycle Shop", "upi_qr_image": "", "require_login": False})
    if await db.categories.count_documents({}) == 0:
        await db.categories.insert_many([{"id": new_id(), "slug": s, "name": n, "icon": i, "order": k}
                                         for k, (s, n, i) in enumerate(CATEGORIES)])
    if await db.coupons.count_documents({}) == 0:
        await db.coupons.insert_many([
            {"id": new_id(), "code": "RIDE10", "type": "percent", "value": 10, "min_order": 5000, "max_discount": 2000, "active": True, "description": "10% off on orders above ₹5,000 (max ₹2,000)"},
            {"id": new_id(), "code": "WELCOME200", "type": "flat", "value": 200, "min_order": 1500, "max_discount": 200, "active": True, "description": "Flat ₹200 off on orders above ₹1,500"},
        ])
    if await db.products.count_documents({}) == 0:
        docs = []
        for k, (name, cat, brand, mrp, sale, stock, imgs, feat, specs, warranty) in enumerate(P):
            docs.append({
                "id": new_id(), "slug": slugify(name), "name": name, "category": cat, "brand": brand,
                "description": f"{name} by {brand}. Quality checked and assembled at Kirishna Cycle Shop before delivery.",
                "price": mrp, "sale_price": sale, "stock": stock, "images": [f"/img/{i}.jpg" for i in imgs],
                "specs": [{"key": a, "value": b} for a, b in specs.items()], "warranty": warranty,
                "featured": feat, "active": True, "sold_count": (k * 7) % 23, "rating_avg": 0, "rating_count": 0,
                "created_at": now_iso()})
        await db.products.insert_many(docs)
