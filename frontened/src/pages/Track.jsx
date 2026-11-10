import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, PackageSearch } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg, img, inr, PAY_LABEL, fmtDate } from "@/lib/api";
import { useStore } from "@/context/Store";
import { OrderTimeline, StatusPill } from "@/components/site/OrderBits";
import UpiPay from "@/components/site/UpiPay";
import { Field } from "@/components/site/Fields";

export const OrderCard = ({ order, children }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5" data-testid="tracked-order">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="font-mono font-bold text-lg text-[#14532d]" data-testid="tracked-order-id">{order.order_id}</p>
        <p className="text-xs text-slate-500">Placed {fmtDate(order.created_at)}{order.city ? ` · Delivering to ${order.city}` : ""}</p>
      </div>
      <div className="flex gap-2"><StatusPill value={order.status} testid="tracked-order-status" /><StatusPill value={order.payment.status} testid="tracked-payment-status" /></div>
    </div>
    <div className="grid md:grid-cols-2 gap-6">
      <OrderTimeline order={order} />
      <div className="space-y-4">
        <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg">
          {order.items.map((i) => (
            <div key={i.name} className="p-3 flex gap-3 items-center text-sm">
              <img src={img(i.image)} alt="" className="h-12 w-14 rounded object-cover bg-slate-100" />
              <span className="flex-1">{i.name} <span className="text-slate-500">× {i.qty}</span></span>
              <span className="tnum font-medium">{inr(i.line_total)}</span>
            </div>
          ))}
        </div>
        <div className="text-sm space-y-1.5 bg-slate-50 rounded-lg p-3">
          <div className="flex justify-between"><span className="text-slate-600">Payment</span><span>{PAY_LABEL[order.payment.method]}</span></div>
          <div className="flex justify-between font-semibold"><span>Total order</span><span className="tnum">{inr(order.total)}</span></div>
          <div className="flex justify-between"><span className="text-slate-600">Online</span><span className="tnum">{inr(order.payment.online_due)}</span></div>
          <div className="flex justify-between"><span className="text-slate-600">On delivery</span><span className="tnum">{inr(order.payment.cod_due)}</span></div>
          {order.payment.utr && <div className="flex justify-between"><span className="text-slate-600">UPI ref</span><span className="font-mono">{order.payment.utr}</span></div>}
        </div>
        {children}
      </div>
    </div>
  </div>
);

export const UtrSubmit = ({ order, onSubmit }) => {
  const { settings } = useStore();
  const [utr, setUtr] = useState("");
  const [busy, setBusy] = useState(false);
  if (order.status === "cancelled" || !["awaiting_payment", "rejected"].includes(order.payment.status)) return null;
  const go = async () => {
    setBusy(true);
    try {
      await onSubmit(utr);
      toast.success("Payment reference submitted for verification");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-3" data-testid="utr-submit-section">
      {order.payment.status === "rejected" && <p className="text-xs text-red-700">We could not verify your earlier payment reference. Please check and submit again.</p>}
      <UpiPay settings={settings} amount={order.payment.online_due} note={`Kirishna ${order.order_id}`} utr={utr} setUtr={setUtr} />
      <button onClick={go} disabled={busy || utr.length < 10} data-testid="utr-submit-button" className="w-full h-11 rounded-lg bg-[#14532d] text-white font-medium disabled:opacity-40">Submit payment reference</button>
    </div>
  );
};

export default function Track() {
  const [params] = useSearchParams();
  const [form, setForm] = useState({ order_id: params.get("order") || "", mobile: "" });
  const [order, setOrder] = useState(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e?.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post("/track", form);
      setOrder(data);
    } catch (err) {
      setOrder(null);
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };
  const sendUtr = async (utr) => {
    const { data } = await api.post("/track/utr", { ...form, utr });
    setOrder(data);
  };
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10" data-testid="track-page">
      <div className="text-center mb-8">
        <PackageSearch className="h-10 w-10 mx-auto text-[#14532d]" />
        <h1 className="font-display text-3xl sm:text-4xl font-bold mt-3">Track your order</h1>
        <p className="text-sm text-slate-500 mt-1">Enter your order ID and the mobile number used while ordering</p>
      </div>
      <form onSubmit={submit} className="bg-white border border-slate-200 rounded-xl p-5 grid sm:grid-cols-[1fr_1fr_auto] gap-4 items-end max-w-3xl mx-auto">
        <Field label="Order ID" id="track-order-id" placeholder="KCS-261109-1234" value={form.order_id} onChange={(e) => setForm({ ...form, order_id: e.target.value.toUpperCase() })} required />
        <Field label="Mobile number" id="track-mobile" inputMode="numeric" maxLength={10} value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} required />
        <button disabled={busy} data-testid="track-submit-button" className="h-11 px-6 rounded-lg bg-[#14532d] text-white font-medium flex items-center gap-2 justify-center">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Track</button>
      </form>
      {order && <div className="mt-8"><OrderCard order={order}><UtrSubmit order={order} onSubmit={sendUtr} /></OrderCard></div>}
    </div>
  );
}
