# Kirishna Cycle Shop – Full-stack E-commerce

Customer store + admin dashboard for **Kirishna Cycle Shop** (Bicycles, Accessories & Spare Parts, India, ₹).

- Phone / WhatsApp: 9508668053 · Email: kumarkirishna5777@gmail.com · UPI: kumarkirishna5777@oksbi

## Tech stack
| Layer | Tech |
|---|---|
| Frontend | React 19, React Router, Tailwind CSS, shadcn/ui, qrcode.react |
| Backend | Python 3.11, FastAPI, Motor (async MongoDB) |
| Database | MongoDB (local or MongoDB Atlas) |
| Auth | JWT (PyJWT) + bcrypt password hashing |
| Images | Stored in MongoDB (`images` collection), served from `/api/images/{id}` |
| Payments | Cash on Delivery · Full UPI QR · 25% UPI advance + 75% on delivery |
| Alerts | Official Meta WhatsApp Cloud API (template message) |

> Note: the brief listed Node.js/Express + Cloudinary. As the owner chose, this project uses FastAPI + MongoDB image storage instead, with the same features.

## Project structure
```
backend/
  server.py        all /api routes, pricing, orders, admin
  core.py          db connection, JWT/bcrypt, rate limiting, login lockout
  whatsapp.py      WhatsApp Cloud API notification (never blocks an order)
  seed.py          first-run data: admin, 12 categories, sample products, coupons, settings
  requirements.txt
  .env.example
frontend/
  src/pages/       Home, Products, ProductDetail, Cart, Checkout, OrderSuccess, Track, Auth, Account
  src/pages/admin/ Dashboard, Products (+ProductForm), Orders (+OrderDetail), Payments, Customers, Settings
  src/components/site/  Header, Footer, ProductCard, UpiPay, OrderBits (timeline, status pills), Fields
  src/context/Store.jsx cart (saved in localStorage), customer session, settings
  package.json
  .env.example
```

## MongoDB collections
`admins`, `customers`, `products`, `orders`, `payments`, `notifications` (+ `categories`, `coupons`, `reviews`, `images`, `settings`, `login_attempts`). The backend creates indexes automatically at startup (unique email/mobile, unique order_id, unique UPI reference, text search). Passwords are stored only as bcrypt hashes.

## Run locally in Visual Studio Code
Prerequisites: Python 3.11+, Node 18+ with Yarn (`npm i -g yarn`), MongoDB (local or Atlas).

1. Open the folder in VS Code → Terminal → New Terminal.
2. Backend:
   ```bash
   cd backend
   python -m venv .venv
   # Windows: .venv\Scripts\activate    macOS/Linux: source .venv/bin/activate
   pip install fastapi "uvicorn[standard]" motor pymongo "pydantic[email]" python-dotenv bcrypt PyJWT httpx python-multipart
   cp .env.example .env      # then edit MONGO_URL, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD…
   uvicorn server:app --reload --port 8001
   ```
3. Frontend (second terminal):
   ```bash
   cd frontend
   cp .env.example .env      # REACT_APP_BACKEND_URL=http://localhost:8001
   yarn install
   yarn start
   ```
4. Open http://localhost:3000 (store) and http://localhost:3000/admin/login (admin: ADMIN_EMAIL / ADMIN_PASSWORD).

On first start the backend adds the admin account, 12 categories, 16 **sample** products (edit or delete them in Admin → Products), 2 coupons and the shop settings.

## Payment flows (the server calculates every amount)
- **COD**: the order is saved with payment status *Not required*. The full amount is collected at delivery and marked collected when the status becomes Delivered.
- **Full UPI**: checkout shows the shop QR, the UPI ID and the amount. The QR is either generated from the UPI ID with the exact amount, or the official QR image uploaded in Admin → Settings. The customer enters the UTR and the status becomes *Pending verification*. Admin checks the bank/UPI app and clicks *Mark as received*, which confirms the order automatically.
- **25% advance + 75% on delivery**: the server calculates the advance (25% of the total, rounded to the rupee) and the balance. Verification works the same way. The order cannot be confirmed, packed or dispatched until the advance is verified.
- A UPI reference entered by a customer is never treated as proof of payment, and each reference can only be used once.
- Customers who pay later can submit the UTR on **Track Order** or in **My Account**.

## WhatsApp order alert setup (Meta WhatsApp Cloud API)
1. Create an app at https://developers.facebook.com/apps → add **WhatsApp**.
2. In WhatsApp Manager create a **Utility** template named `kirishna_new_order`, language **English (en)**, body:
   ```
   🛒 NEW ORDER RECEIVED! – KIRISHNA CYCLE SHOP
   Order ID: {{1}}
   CUSTOMER: {{2}} | Mobile: {{3}} | Email: {{4}}
   Delivery Address: {{5}}
   PRODUCTS: {{6}}
   Total Order Amount: {{7}}
   Payment Method: {{8}} | Online Payment: {{9}} | Remaining COD: {{10}}
   Payment Status: {{11}}
   Order Date: {{12}}
   Please log in to the admin dashboard to manage this order.
   ```
   (Meta does not allow line breaks inside variables, so all products go into {{6}}.)
3. Get a permanent **System User access token** (permission `whatsapp_business_messaging`) and the **Phone Number ID**.
4. Set `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TO=919508668053`, `WHATSAPP_TEMPLATE_NAME` and `WHATSAPP_TEMPLATE_LANGUAGE` in `backend/.env`, then restart the backend.
5. After each order is saved, the alert is sent in the background. The result (sent / failed / not_configured, plus any error) is stored in `notifications` and shown on the order in Admin → Orders and in Admin → Settings, where a **Resend** button is also available. An order is never lost if WhatsApp fails.

## Security
- JWT auth (7-day tokens) for admin and customers, with bcrypt password hashing.
- Protected `/api/admin/*` routes and Pydantic input validation.
- Prices, discounts and the advance are calculated on the server. Stock is reserved atomically.
- Uploaded images are checked for type, size and file signature (magic bytes).
- Per-IP rate limiting on login, register, order and track. An account is locked for 15 minutes after 5 failed logins.
- Secrets are kept only in `.env`.
- Tracking needs the Order ID plus the matching mobile number and returns masked data.

## Deployment
- **Database**: create a MongoDB Atlas cluster, allow your server's IP, and put the connection string in `MONGO_URL`.
- **Backend**: deploy to Render, Railway or any VPS with `uvicorn server:app --host 0.0.0.0 --port 8001`. Set every `.env` value as an environment variable and set `CORS_ORIGINS` to your site URL.
- **Frontend**: run `yarn build` and host the `build/` folder on Vercel or Netlify with SPA fallback to index.html. Set `REACT_APP_BACKEND_URL` to the backend's HTTPS URL before building.
- Always serve both over **HTTPS** in production.
- On Emergent, use the **Deploy** button, which handles hosting and HTTPS.
