import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingBag, Tag } from "lucide-react";
import { useStore } from "@/context/Store";
import useQuote from "@/lib/useQuote";
import { img, inr } from "@/lib/api";

export const Summary = ({ quote, children }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 text-sm" data-testid="order-summary">
    <h2 className="text-base font-semibold">Order summary</h2>
    <div className="flex justify-between"><span className="text-slate-600">Price (MRP)</span><span className="tnum">{inr(quote.mrp_total)}</span></div>
    {quote.mrp_total > quote.subtotal && <div className="flex justify-between text-green-700"><span>Product discount</span><span className="tnum">−{inr(quote.mrp_total - quote.subtotal)}</span></div>}
    {quote.coupon_discount > 0 && <div className="flex justify-between text-green-700" data-testid="summary-coupon"><span>Coupon {quote.coupon_code}</span><span className="tnum">−{inr(quote.coupon_discount)}</span></div>}
    <div className="flex justify-between"><span className="text-slate-600">Delivery</span><span className="text-green-700">Free</span></div>
    <div className="flex justify-between border-t border-slate-100 pt-3 text-base font-bold"><span>Total amount</span><span className="tnum" data-testid="summary-total">{inr(quote.total)}</span></div>
    {quote.mrp_total > quote.total && <p className="text-xs text-green-700 font-medium">You save {inr(quote.mrp_total - quote.total)} on this order</p>}
    {children}
  </div>
);

const CouponBox = ({ quote, couponError }) => {
  const { coupon, setCoupon } = useStore();
  const [code, setCode] = useState(coupon);
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4" data-testid="coupon-box">
      <p className="text-sm font-semibold flex items-center gap-2 mb-2"><Tag className="h-4 w-4 text-[#14532d]" />Apply coupon</p>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); setCoupon(code.trim().toUpperCase()); }}>
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. RIDE10" data-testid="coupon-input" className="flex-1 h-10 rounded-lg border border-slate-300 px-3 text-sm uppercase placeholder:normal-case" />
        {coupon ? (
          <button type="button" onClick={() => { setCoupon(""); setCode(""); }} className="h-10 px-4 rounded-lg border border-slate-300 text-sm" data-testid="coupon-remove">Remove</button>
        ) : (
          <button className="h-10 px-4 rounded-lg bg-slate-900 text-white text-sm" data-testid="coupon-apply">Apply</button>
        )}
      </form>
      {couponError && <p className="text-xs text-red-700 mt-2" data-testid="coupon-error">{couponError}</p>}
      {quote?.coupon_code && <p className="text-xs text-green-700 mt-2" data-testid="coupon-success">{quote.coupon_code} applied — you saved {inr(quote.coupon_discount)}</p>}
    </div>
  );
};

export default function Cart() {
  const { cart, setQty } = useStore();
  const { quote, couponError } = useQuote();
  const nav = useNavigate();
  if (!cart.length) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center" data-testid="cart-empty">
        <ShoppingBag className="h-12 w-12 mx-auto text-slate-300" />
        <h1 className="font-display text-2xl font-bold mt-4">Your cart is empty</h1>
        <Link to="/products" className="inline-flex mt-5 h-11 px-6 rounded-lg bg-[#14532d] text-white font-medium items-center">Start shopping</Link>
      </div>
    );
  }
  const lineOf = (pid) => quote?.lines.find((l) => l.product_id === pid);
  const errOf = (pid) => quote?.errors.find((e) => e.product_id === pid)?.error;
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8" data-testid="cart-page">
      <h1 className="font-display text-3xl font-bold mb-6">Shopping cart</h1>
      <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          {cart.map((i) => {
            const l = lineOf(i.product_id);
            return (
              <div key={i.product_id} className="p-4 flex gap-4" data-testid={`cart-item-${i.product_id}`}>
                <Link to={`/product/${i.slug}`} className="h-20 w-24 sm:h-24 sm:w-28 rounded-lg overflow-hidden bg-slate-100 shrink-0"><img src={img(i.image)} alt={i.name} className="h-full w-full object-cover" /></Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/product/${i.slug}`} className="text-sm font-semibold line-clamp-2 hover:text-[#14532d]">{i.name}</Link>
                  {l && <p className="text-sm mt-1"><span className="font-bold tnum">{inr(l.unit_price)}</span>{l.unit_mrp > l.unit_price && <span className="ml-2 text-xs text-slate-400 line-through">{inr(l.unit_mrp)}</span>}</p>}
                  {errOf(i.product_id) && <p className="text-xs text-red-700 mt-1" data-testid="cart-item-error">{errOf(i.product_id)}</p>}
                  <div className="flex items-center gap-3 mt-3">
                    <div className="flex items-center border border-slate-300 rounded-lg">
                      <button onClick={() => setQty(i.product_id, i.qty - 1)} className="h-8 w-8 grid place-items-center" data-testid={`cart-decrease-${i.product_id}`} aria-label="Decrease"><Minus className="h-3.5 w-3.5" /></button>
                      <span className="w-8 text-center text-sm tnum font-semibold" data-testid={`cart-qty-${i.product_id}`}>{i.qty}</span>
                      <button onClick={() => setQty(i.product_id, Math.min(i.qty + 1, l?.stock ?? 20, 20))} className="h-8 w-8 grid place-items-center" data-testid={`cart-increase-${i.product_id}`} aria-label="Increase"><Plus className="h-3.5 w-3.5" /></button>
                    </div>
                    <button onClick={() => setQty(i.product_id, 0)} className="text-xs text-slate-500 hover:text-red-700 flex items-center gap-1" data-testid={`cart-remove-${i.product_id}`}><Trash2 className="h-3.5 w-3.5" />Remove</button>
                  </div>
                </div>
                {l && <p className="text-sm font-bold tnum hidden sm:block">{inr(l.line_total)}</p>}
              </div>
            );
          })}
        </div>
        <div className="space-y-4 lg:sticky lg:top-40">
          <CouponBox quote={quote} couponError={couponError} />
          {quote && (
            <Summary quote={quote}>
              <button onClick={() => nav("/checkout")} disabled={quote.errors.length > 0} data-testid="cart-checkout-button" className="w-full h-12 rounded-lg bg-[#14532d] text-white font-semibold hover:bg-[#166534] disabled:opacity-40">Proceed to checkout</button>
            </Summary>
          )}
        </div>
      </div>
    </div>
  );
}
