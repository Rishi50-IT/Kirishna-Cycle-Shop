import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, inr, fmtDate } from "@/lib/api";
import { StatusPill } from "@/components/site/OrderBits";
import { PageHead } from "@/pages/admin/AdminLayout";

const KIND = { online_upi: "UPI (online)", cash_on_delivery: "Cash on delivery" };
const FILTERS = [["", "All"], ["pending_verification", "To verify"], ["awaiting_payment", "Awaiting"], ["verified", "Verified"], ["rejected", "Rejected"], ["due_on_delivery", "COD due"], ["collected", "COD collected"]];

export default function AdminPayments() {
  const [rows, setRows] = useState(null);
  const [status, setStatus] = useState("");
  useEffect(() => {
    setRows(null);
    api.get("/admin/payments", { params: { status: status || undefined } }).then((r) => setRows(r.data));
  }, [status]);
  return (
    <div data-testid="admin-payments-page">
      <PageHead title="Payments" sub="Every online UPI and cash-on-delivery amount, per order" />
      <div className="flex flex-wrap gap-2 mb-4">
        {FILTERS.map(([k, v]) => (
          <button key={k} onClick={() => setStatus(k)} data-testid={`payments-filter-${k || "all"}`} className={`h-9 px-3 rounded-full text-sm border ${status === k ? "bg-[#14532d] text-white border-[#14532d]" : "bg-white border-slate-300 text-slate-700"}`}>{v}</button>
        ))}
      </div>
      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]" data-testid="admin-payments-table">
          <thead className="bg-slate-50 text-xs text-slate-600"><tr><th className="text-left px-4 py-2.5">Order</th><th className="text-left px-4">Type</th><th className="text-left px-4">UPI reference</th><th className="text-right px-4">Amount</th><th className="text-left px-4">Status</th><th className="text-left px-4">Date</th></tr></thead>
          <tbody>
            {!rows ? <tr><td colSpan={6} className="px-4 py-6 text-slate-500">Loading…</td></tr> : rows.length === 0 ? <tr><td colSpan={6} className="px-4 py-6 text-slate-500">No payments.</td></tr> : rows.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="px-4 py-3"><Link to={`/admin/orders?open=${p.order_id}`} className="font-mono text-[#14532d] font-medium">{p.order_id}</Link></td>
                <td className="px-4">{KIND[p.kind]}</td><td className="px-4 font-mono">{p.utr || "—"}</td>
                <td className="px-4 text-right tnum font-medium">{inr(p.amount)}</td><td className="px-4"><StatusPill value={p.status} /></td>
                <td className="px-4 text-xs text-slate-500">{fmtDate(p.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
