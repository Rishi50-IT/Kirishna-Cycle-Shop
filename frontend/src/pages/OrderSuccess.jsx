import { Link, useParams } from "react-router-dom";
import { CheckCircle2, MessageCircle, PackageSearch } from "lucide-react";
import { inr, PAY_LABEL, PAY_STATUS } from "@/lib/api";
import { useStore } from "@/context/Store";

const waText = (o) =>
  `Hello Kirishna Cycle Shop, I placed order ${o.order_id}.\n` +
  o.items.map((i) => `${i.name} x${i.qty}`).join("\n") +
  `\nTotal: ${inr(o.total)}\nPayment: ${PAY_LABEL[o.payment.method]}${o.payment.utr ? `\nUPI ref: ${o.payment.utr}` : ""}`;

export default function OrderSuccess() {
  const { orderId } = useParams();
  const { settings } = useStore();
  const o = JSON.parse(sessionStorage.getItem(`kcs_order_${orderId}`) || "null");
  return (
    <div className="max-w-2xl mx-auto px-4 py-14" data-testid="order-success-page">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 text-center">
        <CheckCircle2 className="h-14 w-14 text-[#14532d] mx-auto" />
        <h1 className="font-display text-3xl font-bold mt-4">Order placed!</h1>
        <p className="text-slate-600 mt-2">Your order ID is</p>
        <p className="font-mono text-2xl font-bold text-[#14532d] mt-1" data-testid="success-order-id">{orderId}</p>
        <p className="text-xs text-slate-500 mt-2">Save this ID — you need it with your mobile number to track the order.</p>
        {o && (
          <div className="mt-6 text-left rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm space-y-2" data-testid="success-payment-summary">
            <div className="flex justify-between"><span className="text-slate-600">Payment method</span><span className="font-medium">{PAY_LABEL[o.payment.method]}</span></div>
            <div className="flex justify-between"><span className="text-slate-600">Total order</span><span className="font-bold tnum">{inr(o.total)}</span></div>
            <div className="flex justify-between"><span className="text-slate-600">Online payment</span><span className="tnum">{inr(o.payment.online_due)}</span></div>
            <div className="flex justify-between"><span className="text-slate-600">Pay on delivery</span><span className="tnum">{inr(o.payment.cod_due)}</span></div>
            <div className="flex justify-between"><span className="text-slate-600">Payment status</span><span className="font-medium" data-testid="success-payment-status">{PAY_STATUS[o.payment.status]}</span></div>
            {o.payment.status === "awaiting_payment" && <p className="text-xs text-amber-800 bg-amber-50 rounded-md p-2">Pay {inr(o.payment.online_due)} to our UPI ID and add the transaction reference on the Track Order page so we can verify and confirm your order.</p>}
            {o.payment.status === "pending_verification" && <p className="text-xs text-slate-600">We will verify your UPI payment and confirm the order shortly.</p>}
          </div>
        )}
        <div className="mt-6 grid sm:grid-cols-2 gap-3">
          <Link to={`/track?order=${orderId}`} data-testid="success-track-button" className="h-11 rounded-lg bg-[#14532d] text-white font-medium flex items-center justify-center gap-2"><PackageSearch className="h-4 w-4" />Track order</Link>
          {o && (
            <a href={`https://wa.me/91${settings?.whatsapp || "9508668053"}?text=${encodeURIComponent(waText(o))}`} target="_blank" rel="noreferrer" data-testid="success-whatsapp-button"
              className="h-11 rounded-lg border border-[#14532d] text-[#14532d] font-medium flex items-center justify-center gap-2"><MessageCircle className="h-4 w-4" />Message us on WhatsApp</a>
          )}
        </div>
      </div>
    </div>
  );
}
