import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Package, ShoppingBag, Users, IndianRupee, Clock, CheckCircle2, QrCode, Banknote, AlertCircle, MessageCircle } from "lucide-react";
import { api, inr, fmtDate } from "@/lib/api";
import { StatusPill } from "@/components/site/OrderBits";
import { PageHead } from "@/pages/admin/AdminLayout";

const Stat = ({ icon: I, label, value, sub, testid, tone = "text-[#14532d] bg-green-50" }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-4" data-testid={testid}>
    <div className="flex items-center justify-between"><p className="text-xs text-slate-500">{label}</p><span className={`h-8 w-8 rounded-lg grid place-items-center ${tone}`}><I className="h-4 w-4" /></span></div>
    <p className="text-2xl font-semibold tnum mt-2" data-testid={`${testid}-value`}>{value}</p>
    {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
  </div>
);

export default function Dashboard() {
  const [s, setS] = useState(null);
  useEffect(() => {
    api.get("/admin/stats").then((r) => setS(r.data));
  }, []);
  if (!s) return <p className="text-sm text-slate-500">Loading…</p>;
  return (
    <div data-testid="admin-dashboard">
      <PageHead title="Dashboard" sub="Your shop at a glance" />
      {!s.whatsapp_configured && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 flex gap-3" data-testid="whatsapp-not-configured-banner">
          <MessageCircle className="h-5 w-5 shrink-0" />
          <p>WhatsApp order alerts are not active yet. Orders are saved safely; add your Meta WhatsApp keys to start receiving alerts on 9508668053. <Link to="/admin/settings" className="font-semibold underline">See settings</Link></p>
        </div>
      )}
      {s.payments_to_verify > 0 && (
        <Link to="/admin/orders?payment_status=pending_verification" className="mb-5 rounded-xl border border-[#14532d]/30 bg-green-50 p-4 text-sm text-[#14532d] flex gap-3 font-medium" data-testid="verify-payments-banner">
          <AlertCircle className="h-5 w-5" />{s.payments_to_verify} UPI payment(s) waiting for your verification →
        </Link>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        <Stat icon={IndianRupee} label="Total sales" value={inr(s.total_sales)} sub="Excludes cancelled" testid="stat-total-sales" />
        <Stat icon={ShoppingBag} label="Total orders" value={s.total_orders} testid="stat-total-orders" />
        <Stat icon={Clock} label="Pending orders" value={s.pending_orders} sub="Not yet delivered" testid="stat-pending-orders" tone="text-amber-700 bg-amber-50" />
        <Stat icon={CheckCircle2} label="Delivered orders" value={s.delivered_orders} testid="stat-delivered-orders" />
        <Stat icon={Package} label="Total products" value={s.total_products} testid="stat-total-products" tone="text-sky-700 bg-sky-50" />
        <Stat icon={Users} label="Total customers" value={s.total_customers} testid="stat-total-customers" tone="text-sky-700 bg-sky-50" />
        <Stat icon={QrCode} label="Online payments" value={inr(s.online_payments)} sub={`Verified UPI amount · ${s.online_orders} UPI orders`} testid="stat-online-payments" />
        <Stat icon={Banknote} label="Cash collected" value={inr(s.cod_payments)} sub={`On delivery (COD + 75% balances) · ${s.cod_orders} COD orders`} testid="stat-cod-payments" />
        <Stat icon={AlertCircle} label="Outstanding payments" value={inr(s.outstanding_payments)} sub="Still to be received" testid="stat-outstanding" tone="text-red-700 bg-red-50" />
      </div>
      <div className="grid lg:grid-cols-[2fr_1fr] gap-5 mt-6">
        <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
          <div className="px-4 py-3 flex justify-between border-b border-slate-100"><h2 className="text-sm font-semibold">Recent orders</h2><Link to="/admin/orders" className="text-xs text-[#14532d] font-medium">View all</Link></div>
          <table className="w-full text-sm min-w-[520px]">
            <tbody>{s.recent_orders.length === 0 ? <tr><td className="px-4 py-6 text-slate-500">No orders yet.</td></tr> : s.recent_orders.map((o) => (
              <tr key={o.order_id} className="border-t border-slate-100 first:border-0">
                <td className="px-4 py-3"><Link to={`/admin/orders?open=${o.order_id}`} className="font-mono text-[#14532d] font-medium">{o.order_id}</Link><p className="text-xs text-slate-500">{fmtDate(o.created_at)}</p></td>
                <td className="px-4">{o.customer.name}</td>
                <td className="px-4 text-right tnum font-medium">{inr(o.total)}</td>
                <td className="px-4"><StatusPill value={o.status} /></td>
                <td className="px-4"><StatusPill value={o.payment.status} /></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl">
          <div className="px-4 py-3 border-b border-slate-100"><h2 className="text-sm font-semibold">Low stock</h2></div>
          <ul className="divide-y divide-slate-100 text-sm" data-testid="low-stock-list">
            {s.low_stock.length === 0 ? <li className="px-4 py-6 text-slate-500">All products well stocked.</li> : s.low_stock.map((p) => (
              <li key={p.id} className="px-4 py-2.5 flex justify-between gap-3"><span className="truncate">{p.name}</span><span className={`tnum font-semibold ${p.stock === 0 ? "text-red-700" : "text-amber-700"}`}>{p.stock}</span></li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
