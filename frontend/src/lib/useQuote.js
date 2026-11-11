import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useStore } from "@/context/Store";

export default function useQuote() {
  const { cart, coupon, setCoupon } = useStore();
  const [quote, setQuote] = useState(null);
  const [couponError, setCouponError] = useState(null);
  const [loading, setLoading] = useState(false);
  const key = JSON.stringify(cart.map((i) => [i.product_id, i.qty])) + coupon;

  useEffect(() => {
    if (!cart.length) {
      setQuote(null);
      return;
    }
    setLoading(true);
    const items = cart.map(({ product_id, qty }) => ({ product_id, qty }));
    api.post("/cart/quote", { items, coupon_code: coupon || null })
      .then((r) => {
        setQuote(r.data);
        if (coupon) setCouponError(r.data.coupon_message);
        if (r.data.coupon_message) setCoupon("");
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { quote, loading, couponError };
}
