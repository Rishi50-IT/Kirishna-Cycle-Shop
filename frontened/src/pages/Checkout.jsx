import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Banknote, QrCode, Split, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg, inr } from "@/lib/api";
import { useStore } from "@/context/Store";
import useQuote from "@/lib/useQuote";
import { Summary } from "@/pages/Cart";
import UpiPay from "@/components/site/UpiPay";
import AddressFields, { EMPTY_ADDRESS, Field } from "@/components/site/Fields";

const METHODS = [
  { id: "cod", title: "Cash on Delivery", sub: "Pay the full amount when your order arrives", Icon: Banknote },
  { id: "upi_full", title: "Full payment by UPI", sub: "Scan the shop QR and pay the full amount now", Icon: QrCode },
  { id: "upi_advance", title: "25% advance + 75% on delivery", sub: "Pay a small advance by UPI, rest at your door", Icon: Split },
];

const SplitCard = ({ quote, method }) => {
  const plan = quote.plans[method];
  return (
    <div className="grid grid-cols-3 rounded-xl overflow-hidden border border-[#14532d]/30 text-center" data-testid="payment-split-card">
      <div className="p-3 bg-white"><p className="text-[11px] uppercase tracking-wider text-slate-500">Total order</p><p className="text-lg font-bold tnum" data-testid="split-total">{inr(quote.total)}</p></div>
      <div className="p-3 bg-[#14532d] text-white"><p className="text-[11px] uppercase tracking-wider text-green-200">Pay online now</p><p className="text-lg font-bold tnum" data-testid="split-online">{inr(plan.online)}</p></div>
      <div className="p-3 bg-green-50"><p className="text-[11px] uppercase tracking-wider text-slate-500">Pay on delivery</p><p className="text-lg font-bold tnum" data-testid="split-delivery">{inr(plan.on_delivery)}</p></div>
    </div>
  );
};

const MethodPicker = ({ method, setMethod, quote }) => (
  <div className="space-y-3" data-testid="payment-methods">
    {METHODS.map(({ id, title, sub, Icon }) => (
      <button type="button" key={id} onClick={() => setMethod(id)} data-testid={`payment-method-${id}`}
        className={`w-full text-left rounded-xl border-2 p-4 flex items-center gap-4 transition-colors ${method === id ? "border-[#14532d] bg-green-50/60" : "border-slate-200 bg-white hover:border-slate-300"}`}>
        <span className={`h-5 w-5 rounded-full border-2 grid place-items-center shrink-0 ${method === id ? "border-[#14532d]" : "border-slate-300"}`}>{method === id && <span className="h-2.5 w-2.5 rounded-full bg-[#14532d]" />}</span>
        <Icon className="h-6 w-6 text-[#14532d] shrink-0" />
        <span className="flex-1"><span className="block text-sm font-semibold">{title}</span><span className="block text-xs text-slate-500">{sub}</span></span>
        {quote && <span className="text-sm font-bold tnum hidden sm:block">{inr(quote.plans[id].online)} now</span>}
      </button>
    ))}
  </div>
);

export default function Checkout() {
  const { cart, coupon, customer, settings, clearCart } = useStore();
  const { quote, loading } = useQuote();
  const nav = useNavigate();
  const [info, setInfo] = useState({ name: "", mobile: "", email: "" });
  const [address, setAddress] = useState(EMPTY_ADDRESS);
  const [method, setMethod] = useState("cod");
  const [utr, setUtr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (customer) {
      setInfo({ name: customer.name, mobile: customer.mobile, email: customer.email });
      if (customer.addresses?.[0]) setAddress({ ...EMPTY_ADDRESS, ...customer.addresses[0] });
    }
  }, [customer]);

  if (!cart.length) return <div className="max-w-xl mx-auto px-4 py-24 text-center" data-testid="checkout-empty"><p className="font-semibold">Your cart is empty</p><Link to="/products" className="text-[#14532d] text-sm">Continue shopping</Link></div>;
  if (settings?.require_login && !customer) {
    return <div className="max-w-xl mx-auto px-4 py-24 text-center" data-testid="checkout-login-required"><p className="font-semibold">Please log in to place your order</p><Link to="/login?next=/checkout" className="inline-flex mt-4 h-11 px-6 rounded-lg bg-[#14532d] text-white items-center">Log in or register</Link></div>;
  }

  const submit = async (e) => {
    e.preventDefault();
    if (method !== "cod" && utr && !/^[A-Za-z0-9]{10,22}$/.test(utr)) return toast.error("UPI reference should be 10–22 letters/digits");
    setBusy(true);
    try {
      const { data } = await api.post("/orders", {
        items: cart.map(({ product_id, qty }) => ({ product_id, qty })), coupon_code: coupon || null,
        customer: { ...info, email: info.email || null, address }, payment_method: method, utr: method !== "cod" && utr ? utr : null,
      });
      sessionStorage.setItem(`kcs_order_${data.order_id}`, JSON.stringify(data));
      clearCart();
      nav(`/order-success/${data.order_id}`);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };
  const set = (k) => (e) => setInfo({ ...info, [k]: e.target.value });

  return (
    <form onSubmit={submit} className="max-w-7xl mx-auto px-4 sm:px-6 py-8" data-testid="checkout-page">
      <h1 className="font-display text-3xl font-bold mb-6">Checkout</h1>
      <div className="grid lg:grid-cols-[1fr_380px] gap-6 items-start">
        <div className="space-y-6">
          <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <h2 className="text-base font-semibold">1. Contact details</h2>
            {!customer && <p className="text-xs text-slate-500">Checking out as guest. <Link to="/login?next=/checkout" className="text-[#14532d] font-medium">Log in</Link> to save orders to your account.</p>}
            <div className="grid sm:grid-cols-3 gap-4">
              <Field label="Full name" id="checkout-name" value={info.name} onChange={set("name")} required minLength={2} />
              <Field label="Mobile number" id="checkout-mobile" value={info.mobile} onChange={set("mobile")} required inputMode="numeric" pattern="[6-9]\d{9}" maxLength={10} title="10-digit mobile number" />
              <Field label="Email (optional)" id="checkout-email" type="email" value={info.email} onChange={set("email")} />
            </div>
          </section>
          <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between"><h2 className="text-base font-semibold">2. Delivery address</h2>
              {customer?.addresses?.length > 1 && (
                <select className="text-sm border border-slate-300 rounded-md h-9 px-2" data-testid="checkout-saved-address" onChange={(e) => setAddress({ ...EMPTY_ADDRESS, ...customer.addresses[e.target.value] })}>
                  {customer.addresses.map((a, k) => <option key={k} value={k}>{a.label || a.line1}</option>)}
                </select>
              )}
            </div>
            <AddressFields value={address} onChange={setAddress} prefix="checkout" />
          </section>
          <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <h2 className="text-base font-semibold">3. Payment method</h2>
            <MethodPicker method={method} setMethod={setMethod} quote={quote} />
            {quote && <SplitCard quote={quote} method={method} />}
            {quote && method !== "cod" && (
              <UpiPay settings={settings} amount={quote.plans[method].online} note={`Kirishna order ${info.mobile}`} utr={utr} setUtr={setUtr} />
            )}
          </section>
        </div>
        <div className="lg:sticky lg:top-40">
          {quote && (
            <Summary quote={quote}>
              {quote.errors.map((e) => <p key={e.product_id} className="text-xs text-red-700">{e.error}</p>)}
              <button disabled={busy || loading || quote.errors.length > 0} data-testid="place-order-button" className="w-full h-12 rounded-lg bg-[#14532d] text-white font-semibold hover:bg-[#166534] disabled:opacity-40 flex items-center justify-center gap-2">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {method === "cod" ? "Place order (Cash on Delivery)" : `Place order · ${inr(quote.plans[method].online)} via UPI`}
              </button>
              <p className="text-[11px] text-slate-500">All amounts are calculated by our server at the time of order.</p>
            </Summary>
          )}
        </div>
      </div>
    </form>
  );
}
