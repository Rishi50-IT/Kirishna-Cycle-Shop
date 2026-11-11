import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { api, inr, fmtDate, PAY_LABEL, ORDER_STATUS, PAY_STATUS } from "@/lib/api";
import { StatusPill } from "@/components/site/OrderBits";
import { PageHead } from "@/pages/admin/AdminLayout";
import OrderDetail from "@/pages/admin/OrderDetail";

const OrderCards = ({ rows, open }) => (
  <div className="md:hidden space-y-3" data-testid="admin-orders-cards">
    {!rows ? <p className="text-sm text-slate-500">Loading…</p> : rows.length === 0 ? <p className="text-sm text-slate-500 bg-white border border-slate-200 rounded-xl p-4" data-testid="admin-orders-cards-empty">No orders found.</p> : rows.map((o) => (
      <button key={o.order_id} onClick={() => open(o.order_id)} data-testid={`admin-order-card-${o.order_id}`}
        className="w-full text-left bg-white border border-slate-200 rounded-xl p-4 space-y-3 active:bg-slate-50">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0"><p className="font-mono font-semibold text-[#14532d]">{o.order_id}</p><p className="text-xs text-slate-500">{fmtDate(o.created_at)}</p></div>
          <p className="text-lg font-bold tnum shrink-0">{inr(o.total)}</p>
        </div>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="truncate">{o.customer.name} · <span className="text-slate-500">{o.customer.mobile}</span></span>
          <span className="text-xs text-slate-500 shrink-0">{o.items.reduce((s, i) => s + i.qty, 0)} item(s)</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill value={o.status} />
          <StatusPill value={o.payment.status} />
          <span className="text-xs text-slate-500">{PAY_LABEL[o.payment.method]}</span>
        </div>
        {o.payment.method !== "cod" && <p className="text-xs text-slate-600 tnum">Online {inr(o.payment.online_due)} · On delivery {inr(o.payment.cod_due)}</p>}
      </button>
    ))}
  </div>
);

export default function AdminOrders() {
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState(params.get("q") || "");
  const filters = ["status", "payment_status", "date_from", "date_to", "q"].reduce((a, k) => (params.get(k) ? { ...a, [k]: params.get(k) } : a), {});
  const key = JSON.stringify(filters);
  const load = () => api.get("/admin/orders", { params: filters }).then((r) => setRows(r.data));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const set = (k, v) => {
    const n = new URLSearchParams(params);
    v ? n.set(k, v) : n.delete(k);
    setParams(n);
  };
  const sel = "h-10 rounded-lg border border-slate-300 px-3 text-sm bg-white";
  return (
    <div data-testid="admin-orders-page">
      <PageHead title="Orders" sub={rows ? `${rows.length} orders` : ""} />
      <div className="flex flex-wrap gap-2 mb-4">
        <form onSubmit={(e) => { e.preventDefault(); set("q", q.trim()); }} className="relative flex-1 min-w-[220px]">
          <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Order ID, name, mobile or email" data-testid="admin-order-search" className="w-full h-10 rounded-lg border border-slate-300 pl-9 pr-3 text-sm bg-white" />
        </form>
        <select value={params.get("status") || ""} onChange={(e) => set("status", e.target.value)} className={sel} data-testid="admin-order-status-filter">
          <option value="">All statuses</option>{Object.entries(ORDER_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={params.get("payment_status") || ""} onChange={(e) => set("payment_status", e.target.value)} className={sel} data-testid="admin-order-payment-filter">
          <option value="">All payments</option>{Object.entries(PAY_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <label className="flex items-center gap-1 text-xs text-slate-500">From<input type="date" value={params.get("date_from") || ""} onChange={(e) => set("date_from", e.target.value)} className={sel} data-testid="admin-order-date-from" /></label>
        <label className="flex items-center gap-1 text-xs text-slate-500">To<input type="date" value={params.get("date_to") || ""} onChange={(e) => set("date_to", e.target.value)} className={sel} data-testid="admin-order-date-to" /></label>
        {Object.keys(filters).length > 0 && <button onClick={() => { setQ(""); setParams({}); }} className="h-10 px-3 text-sm text-slate-600" data-testid="admin-order-clear-filters">Clear</button>}
      </div>
      <OrderCards rows={rows} open={(id) => set("open", id)} />
      <div className="hidden md:block bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]" data-testid="admin-orders-table">
          <thead className="bg-slate-50 text-xs text-slate-600"><tr>
            <th className="text-left px-4 py-2.5">Order</th><th className="text-left px-4">Customer</th><th className="text-right px-4">Items</th><th className="text-right px-4">Total</th><th className="text-left px-4">Payment</th><th className="text-right px-4">Online / COD</th><th className="text-left px-4">Status</th>
          </tr></thead>
          <tbody>
            {!rows ? <tr><td colSpan={7} className="px-4 py-6 text-slate-500">Loading…</td></tr> : rows.length === 0 ? <tr><td colSpan={7} className="px-4 py-6 text-slate-500" data-testid="admin-orders-empty">No orders found.</td></tr> : rows.map((o) => (
              <tr key={o.order_id} onClick={() => set("open", o.order_id)} className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer" data-testid={`admin-order-row-${o.order_id}`}>
                <td className="px-4 py-3"><p className="font-mono font-medium text-[#14532d]">{o.order_id}</p><p className="text-xs text-slate-500">{fmtDate(o.created_at)}</p></td>
                <td className="px-4"><p>{o.customer.name}</p><p className="text-xs text-slate-500">{o.customer.mobile}</p></td>
                <td className="px-4 text-right tnum">{o.items.reduce((s, i) => s + i.qty, 0)}</td>
                <td className="px-4 text-right tnum font-semibold">{inr(o.total)}</td>
                <td className="px-4"><p className="text-xs">{PAY_LABEL[o.payment.method]}</p><StatusPill value={o.payment.status} /></td>
                <td className="px-4 text-right tnum text-xs">{inr(o.payment.online_due)} / {inr(o.payment.cod_due)}</td>
                <td className="px-4"><StatusPill value={o.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <OrderDetail orderId={params.get("open")} onClose={() => set("open", "")} onChanged={load} />
    </div>
  );
}
