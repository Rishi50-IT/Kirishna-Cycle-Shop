import axios from "axios";

export const BACKEND = process.env.REACT_APP_BACKEND_URL;
export const api = axios.create({ baseURL: `${BACKEND}/api` });

api.interceptors.request.use((cfg) => {
  const isAdmin = cfg.url.startsWith("/admin");
  const token = localStorage.getItem(isAdmin ? "kcs_admin_token" : "kcs_token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && err.config.url.startsWith("/admin") && err.config.url !== "/admin/login") {
      localStorage.removeItem("kcs_admin_token");
      if (!window.location.pathname.endsWith("/admin/login")) window.location.href = "/admin/login";
    }
    return Promise.reject(err);
  }
);

export const img = (src) => (src?.startsWith("/api/") ? `${BACKEND}${src}` : src || "/img/parts1.jpg");

export const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;

export const errMsg = (e) => {
  const d = e?.response?.data?.detail;
  if (Array.isArray(d)) return d.map((x) => x.msg.replace("Value error, ", "")).join(", ");
  return d || "Something went wrong. Please try again.";
};

export const offPct = (p) => (p.price > p.sale_price ? Math.round(((p.price - p.sale_price) / p.price) * 100) : 0);

export const fmtDate = (s) =>
  new Date(s).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export const PAY_LABEL = {
  cod: "Cash on Delivery",
  upi_full: "Full UPI Payment",
  upi_advance: "25% Advance + 75% on Delivery",
};

export const PAY_STATUS = {
  not_required: "Not required",
  awaiting_payment: "Awaiting payment",
  pending_verification: "Pending verification",
  verified: "Verified",
  rejected: "Rejected",
};

export const ORDER_STATUS = {
  new: "New", confirmed: "Confirmed", packed: "Packed", dispatched: "Dispatched", delivered: "Delivered", cancelled: "Cancelled",
};
