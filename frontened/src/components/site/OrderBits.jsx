import { Check, CircleDot, X } from "lucide-react";
import { ORDER_STATUS, PAY_STATUS, fmtDate } from "@/lib/api";

const TONE = {
  new: "bg-sky-50 text-sky-800", confirmed: "bg-green-50 text-green-800", packed: "bg-sky-50 text-sky-800",
  dispatched: "bg-amber-50 text-amber-800", delivered: "bg-green-100 text-green-900", cancelled: "bg-red-50 text-red-800",
  verified: "bg-green-50 text-green-800", pending_verification: "bg-amber-50 text-amber-800",
  awaiting_payment: "bg-slate-100 text-slate-700", rejected: "bg-red-50 text-red-800", not_required: "bg-slate-100 text-slate-600",
  sent: "bg-green-50 text-green-800", failed: "bg-red-50 text-red-800", not_configured: "bg-slate-100 text-slate-600",
  pending: "bg-slate-100 text-slate-600", refund_due: "bg-red-50 text-red-800", collected: "bg-green-50 text-green-800", due_on_delivery: "bg-slate-100 text-slate-700",
};
const LABEL = { ...PAY_STATUS, ...ORDER_STATUS, sent: "Sent", failed: "Failed", not_configured: "Not configured", pending: "Pending", refund_due: "Refund due", collected: "Collected", due_on_delivery: "Due on delivery" };

export const StatusPill = ({ value, testid }) => (
  <span data-testid={testid} className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE[value] || "bg-slate-100 text-slate-700"}`}>
    {LABEL[value] || value}
  </span>
);

const at = (order, s) => order.status_history?.find((h) => h.status === s)?.at;

export const OrderTimeline = ({ order }) => {
  const order_ = ["new", "confirmed", "packed", "dispatched", "delivered"];
  const idx = order_.indexOf(order.status);
  const pay = order.payment.status;
  const steps = [
    { label: "Order received", done: true, time: at(order, "new") },
    {
      label: "Payment verification",
      done: pay === "verified" || pay === "not_required",
      current: pay === "pending_verification" || pay === "awaiting_payment",
      failed: pay === "rejected",
      sub: pay === "not_required" ? "Cash on Delivery – pay at doorstep" : PAY_STATUS[pay],
      time: at(order, "payment_verified"),
    },
    ...["confirmed", "packed", "dispatched", "delivered"].map((s) => ({
      label: ORDER_STATUS[s], done: idx >= order_.indexOf(s), time: at(order, s),
      current: idx === order_.indexOf(s) - 1 && order.status !== "cancelled" && (pay === "verified" || pay === "not_required"),
    })),
  ];
  return (
    <ol className="relative space-y-0" data-testid="order-timeline">
      {order.status === "cancelled" && (
        <li className="mb-4 flex items-center gap-2 text-sm font-medium text-red-700" data-testid="timeline-cancelled"><X className="h-4 w-4" /> This order was cancelled</li>
      )}
      {steps.map((s, i) => (
        <li key={s.label} className="flex gap-4 pb-6 last:pb-0 relative" data-testid={`timeline-step-${i}`}>
          {i < steps.length - 1 && <span className={`absolute left-[15px] top-8 bottom-0 w-0.5 ${s.done ? "bg-[#14532d]" : "bg-slate-200"}`} />}
          <span className={`relative z-10 h-8 w-8 shrink-0 rounded-full grid place-items-center border-2 ${
            s.failed ? "border-red-600 bg-red-50 text-red-700" : s.done ? "border-[#14532d] bg-[#14532d] text-white" : s.current ? "border-amber-500 bg-amber-50 text-amber-600" : "border-slate-200 bg-white text-slate-300"}`}>
            {s.failed ? <X className="h-4 w-4" /> : s.done ? <Check className="h-4 w-4" /> : <CircleDot className="h-4 w-4" />}
          </span>
          <div className="pt-1">
            <p className={`text-sm font-semibold ${s.done ? "text-slate-900" : "text-slate-500"}`}>{s.label}</p>
            {s.sub && <p className="text-xs text-slate-500">{s.sub}</p>}
            {s.time && <p className="text-xs text-slate-400">{fmtDate(s.time)}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
};
