import { useEffect, useState } from "react";
import { Loader2, MessageCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg, img, inr, fmtDate, PAY_LABEL, ORDER_STATUS } from "@/lib/api";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { StatusPill, OrderTimeline } from "@/components/site/OrderBits";

const NEXT = { new: "confirmed", confirmed: "packed", packed: "dispatched", dispatched: "delivered" };
const addr = (a) => [a.line1, a.line2, a.landmark, a.city, a.state, a.pincode].filter(Boolean).join(", ");

const Box = ({ title, children, testid }) => (
  <section className="border border-slate-200 rounded-lg p-4 space-y-2 text-sm" data-testid={testid}><h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</h3>{children}</section>
);
const Row = ({ k, v, bold }) => <div className="flex justify-between gap-3"><span className="text-slate-600">{k}</span><span className={`text-right ${bold ? "font-semibold" : ""}`}>{v}</span></div>;

const PaymentBox = ({ o, act, busy }) => {
  const [note, setNote] = useState("");
  const p = o.payment;
  return (
    <Box title="Payment" testid="order-payment-box">
      <Row k="Method" v={PAY_LABEL[p.method]} />
      <Row k="Total order" v={inr(o.total)} bold />
      <Row k="Online amount" v={inr(p.online_due)} />
      <Row k="Pay on delivery" v={inr(p.cod_due)} />
      <Row k="Received online" v={inr(o.amount_paid_online)} />
      <Row k="Cash collected" v={inr(o.cod_collected)} />
      <Row k="UPI reference" v={<span className="font-mono" data-testid="order-utr">{p.utr || "—"}</span>} />
      <Row k="Status" v={<StatusPill value={p.status} testid="order-payment-status" />} />
      {p.verified_by && <p className="text-xs text-slate-500">{p.status === "verified" ? "Verified" : "Reviewed"} by {p.verified_by} on {fmtDate(p.verified_at)}</p>}
      {p.method !== "cod" && p.status === "pending_verification" && o.status !== "cancelled" && (
        <div className="pt-2 space-y-2">
          <p className="text-xs text-amber-800 bg-amber-50 rounded-md p-2">Open your bank/UPI app and confirm that {inr(p.online_due)} with reference <b>{p.utr}</b> was actually received before verifying. A customer-entered reference is not proof of payment.</p>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="w-full h-9 rounded-md border border-slate-300 px-3 text-sm" data-testid="verify-note-input" />
          <div className="flex gap-2">
            <button disabled={busy} onClick={() => act("verify", { decision: "verified", note })} data-testid="verify-payment-button" className="flex-1 h-10 rounded-lg bg-[#14532d] text-white text-sm font-medium">Mark as received</button>
            <button disabled={busy} onClick={() => act("verify", { decision: "rejected", note })} data-testid="reject-payment-button" className="flex-1 h-10 rounded-lg border border-red-300 text-red-700 text-sm font-medium">Not received</button>
          </div>
        </div>
      )}
    </Box>
  );
};

const StatusBox = ({ o, act, busy }) => {
  const next = NEXT[o.status];
  const blocked = o.payment.method !== "cod" && o.payment.status !== "verified";
  if (["delivered", "cancelled"].includes(o.status)) return null;
  return (
    <Box title="Update order" testid="order-status-box">
      {blocked && <p className="text-xs text-slate-600">Verify the online payment before confirming or dispatching.</p>}
      <div className="flex flex-wrap gap-2">
        {next && <button disabled={busy || blocked} onClick={() => act("status", { status: next })} data-testid="advance-status-button" className="h-10 px-4 rounded-lg bg-[#14532d] text-white text-sm font-medium disabled:opacity-40">Mark as {ORDER_STATUS[next]}</button>}
        <button disabled={busy} onClick={() => window.confirm("Cancel this order? Stock will be restored.") && act("status", { status: "cancelled" })} data-testid="cancel-order-button" className="h-10 px-4 rounded-lg border border-red-300 text-red-700 text-sm font-medium">Cancel order</button>
      </div>
    </Box>
  );
};

const NotifyBox = ({ o, act, busy }) => (
  <Box title="WhatsApp alert to shop" testid="order-notification-box">
    <div className="flex items-center justify-between"><StatusPill value={o.notification?.status || "pending"} testid="order-notification-status" />
      <button disabled={busy} onClick={() => act("notify")} className="text-xs text-[#14532d] font-medium flex items-center gap-1" data-testid="resend-notification-button"><RefreshCw className="h-3.5 w-3.5" />Resend</button></div>
    {o.notification?.error && <p className="text-xs text-red-700">{o.notification.error}</p>}
    <pre className="whitespace-pre-wrap text-xs bg-slate-50 rounded-md p-3 max-h-56 overflow-y-auto font-sans">{o.notification?.message}</pre>
    <a href={`https://wa.me/91${o.customer.mobile}`} target="_blank" rel="noreferrer" className="text-xs text-[#14532d] font-medium flex items-center gap-1" data-testid="whatsapp-customer-link"><MessageCircle className="h-3.5 w-3.5" />Chat with customer</a>
  </Box>
);

export default function OrderDetail({ orderId, onClose, onChanged }) {
  const [o, setO] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = () => api.get(`/admin/orders/${orderId}`).then((r) => setO(r.data));
  useEffect(() => {
    setO(null);
    if (orderId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);
  const act = async (kind, body) => {
    setBusy(true);
    try {
      const path = { verify: "verify-payment", status: "status", notify: "notify" }[kind];
      const { data } = await api.post(`/admin/orders/${orderId}/${path}`, body || {});
      if (kind === "notify") toast[data.status === "sent" ? "success" : "warning"](`WhatsApp: ${data.status}${data.error ? ` – ${data.error}` : ""}`);
      else toast.success("Order updated");
      await load();
      onChanged();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet open={!!orderId} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto" data-testid="order-detail-sheet">
        <SheetHeader><SheetTitle className="font-mono">{orderId}</SheetTitle></SheetHeader>
        {!o ? <Loader2 className="h-5 w-5 animate-spin mt-6" /> : (
          <div className="space-y-4 mt-4">
            <div className="flex flex-wrap gap-2 items-center"><StatusPill value={o.status} testid="order-detail-status" /><span className="text-xs text-slate-500">Placed {fmtDate(o.created_at)}</span></div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Box title="Customer" testid="order-customer-box">
                <p className="font-semibold">{o.customer.name}</p>
                <a href={`tel:${o.customer.mobile}`} className="block text-[#14532d]">{o.customer.mobile}</a>
                {o.customer.email && <p className="break-all">{o.customer.email}</p>}
                <p className="text-slate-600">{addr(o.customer.address)}</p>
                <p className="text-xs text-slate-500">{o.customer_id ? "Registered customer" : "Guest checkout"}</p>
              </Box>
              <PaymentBox o={o} act={act} busy={busy} />
            </div>
            <Box title="Products" testid="order-items-box">
              {o.items.map((i) => (
                <div key={i.product_id} className="flex items-center gap-3"><img src={img(i.image)} alt="" className="h-10 w-12 rounded object-cover bg-slate-100" /><span className="flex-1">{i.name}<span className="text-slate-500"> × {i.qty} @ {inr(i.unit_price)}</span></span><span className="tnum font-medium">{inr(i.line_total)}</span></div>
              ))}
              <div className="border-t border-slate-100 pt-2"><Row k="Subtotal" v={inr(o.subtotal)} />{o.coupon_discount > 0 && <Row k={`Coupon ${o.coupon_code}`} v={`−${inr(o.coupon_discount)}`} />}<Row k="Total" v={inr(o.total)} bold /></div>
            </Box>
            <StatusBox o={o} act={act} busy={busy} />
            <div className="grid sm:grid-cols-2 gap-4">
              <Box title="Progress"><OrderTimeline order={o} /></Box>
              <NotifyBox o={o} act={act} busy={busy} />
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
