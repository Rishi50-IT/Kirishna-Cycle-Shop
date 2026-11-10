import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

const StoreCtx = createContext(null);
const CART_KEY = "kcs_cart";

const loadCart = () => {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
};

export function StoreProvider({ children }) {
  const [cart, setCart] = useState(loadCart);
  const [coupon, setCoupon] = useState(localStorage.getItem("kcs_coupon") || "");
  const [customer, setCustomer] = useState(null);
  const [settings, setSettings] = useState(null);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem("kcs_coupon", coupon);
  }, [coupon]);

  useEffect(() => {
    api.get("/settings").then((r) => setSettings(r.data)).catch(() => {});
    api.get("/categories").then((r) => setCategories(r.data)).catch(() => {});
    if (localStorage.getItem("kcs_token")) {
      api.get("/auth/me").then((r) => setCustomer(r.data)).catch(() => localStorage.removeItem("kcs_token"));
    }
  }, []);

  const addToCart = useCallback((p, qty = 1) => {
    setCart((c) => {
      const ex = c.find((i) => i.product_id === p.id);
      if (ex) return c.map((i) => (i.product_id === p.id ? { ...i, qty: Math.min(i.qty + qty, p.stock, 20) } : i));
      return [...c, { product_id: p.id, qty: Math.min(qty, p.stock), name: p.name, image: p.images?.[0], slug: p.slug }];
    });
  }, []);

  const setQty = useCallback((pid, qty) => {
    setCart((c) => (qty < 1 ? c.filter((i) => i.product_id !== pid) : c.map((i) => (i.product_id === pid ? { ...i, qty } : i))));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setCoupon("");
  }, []);

  const login = (token, c) => {
    localStorage.setItem("kcs_token", token);
    setCustomer(c);
  };
  const logout = () => {
    localStorage.removeItem("kcs_token");
    setCustomer(null);
  };

  const value = useMemo(
    () => ({
      cart, addToCart, setQty, clearCart, coupon, setCoupon, customer, setCustomer, login, logout, settings, categories,
      cartCount: cart.reduce((s, i) => s + i.qty, 0),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cart, coupon, customer, settings, categories]
  );
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export const useStore = () => useContext(StoreCtx);
