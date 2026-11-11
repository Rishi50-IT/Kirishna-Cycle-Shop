import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { api, inr, fmtDate } from "@/lib/api";
import { PageHead } from "@/pages/admin/AdminLayout";

export default function AdminCustomers() {
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState("");
  const load = () => api.get("/admin/customers", { params: { q: q || undefined } }).then((r) => setRows(r.data));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div data-testid="admin-customers-page">
      <PageHead title="Customers" sub="Registered customer accounts (guest buyers appear on their orders)" />
      <form onSubmit={(e) => { e.preventDefault(); load(); }} className="relative mb-4 max-w-md">
        <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email or mobile" data-testid="admin-customer-search" className="w-full h-10 rounded-lg border border-slate-300 pl-9 pr-3 text-sm bg-white" />
      </form>
      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]" data-testid="admin-customers-table">
          <thead className="bg-slate-50 text-xs text-slate-600"><tr><th className="text-left px-4 py-2.5">Name</th><th className="text-left px-4">Mobile</th><th className="text-left px-4">Email</th><th className="text-left px-4">City</th><th className="text-right px-4">Orders</th><th className="text-right px-4">Spent</th><th className="text-left px-4">Joined</th></tr></thead>
          <tbody>
            {!rows ? <tr><td colSpan={7} className="px-4 py-6 text-slate-500">Loading…</td></tr> : rows.length === 0 ? <tr><td colSpan={7} className="px-4 py-6 text-slate-500">No customers yet.</td></tr> : rows.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">{c.name}</td><td className="px-4">{c.mobile}</td><td className="px-4 break-all">{c.email}</td>
                <td className="px-4 text-slate-600">{c.addresses?.[0]?.city || "—"}</td>
                <td className="px-4 text-right tnum">{c.orders}</td><td className="px-4 text-right tnum font-medium">{inr(c.spent)}</td>
                <td className="px-4 text-xs text-slate-500">{fmtDate(c.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
