import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { LogOut, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg, inr, fmtDate } from "@/lib/api";
import { useStore } from "@/context/Store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AddressFields, { EMPTY_ADDRESS, Field } from "@/components/site/Fields";
import { StatusPill } from "@/components/site/OrderBits";
import { OrderCard, UtrSubmit } from "@/pages/Track";

const Profile = () => {
  const { customer, setCustomer } = useStore();
  const [name, setName] = useState(customer.name);
  const [addresses, setAddresses] = useState(customer.addresses || []);
  const save = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.put("/auth/me", { name, addresses });
      setCustomer(data);
      toast.success("Profile saved");
    } catch (err) {
      toast.error(errMsg(err));
    }
  };
  return (
    <form onSubmit={save} className="space-y-6" data-testid="profile-form">
      <div className="bg-white border border-slate-200 rounded-xl p-5 grid sm:grid-cols-3 gap-4">
        <Field label="Full name" id="profile-name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Field label="Email" id="profile-email" value={customer.email} disabled />
        <Field label="Mobile" id="profile-mobile" value={customer.mobile} disabled />
      </div>
      {addresses.map((a, k) => (
        <div key={k} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4" data-testid={`saved-address-${k}`}>
          <div className="flex items-end gap-3">
            <Field className="flex-1" label="Address label" id={`addr${k}-label`} placeholder="Home / Office" value={a.label || ""} onChange={(e) => setAddresses(addresses.map((x, i) => (i === k ? { ...x, label: e.target.value } : x)))} />
            <button type="button" onClick={() => setAddresses(addresses.filter((_, i) => i !== k))} className="h-11 px-3 rounded-lg border border-slate-300 text-red-700" data-testid={`remove-address-${k}`} aria-label="Remove address"><Trash2 className="h-4 w-4" /></button>
          </div>
          <AddressFields value={a} prefix={`addr${k}`} onChange={(v) => setAddresses(addresses.map((x, i) => (i === k ? v : x)))} />
        </div>
      ))}
      <div className="flex flex-wrap gap-3">
        {addresses.length < 5 && <button type="button" onClick={() => setAddresses([...addresses, { ...EMPTY_ADDRESS, label: "" }])} className="h-11 px-4 rounded-lg border border-slate-300 bg-white text-sm flex items-center gap-2" data-testid="add-address-button"><Plus className="h-4 w-4" />Add address</button>}
        <button className="h-11 px-6 rounded-lg bg-[#14532d] text-white font-medium" data-testid="profile-save-button">Save profile</button>
      </div>
    </form>
  );
};

const Orders = () => {
  const [orders, setOrders] = useState(null);
  const [open, setOpen] = useState(null);
  const load = () => api.get("/account/orders").then((r) => setOrders(r.data));
  useEffect(() => {
    load();
  }, []);
  if (!orders) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!orders.length) return <p className="text-sm text-slate-500 bg-white border border-slate-200 rounded-xl p-6" data-testid="no-orders">No orders yet.</p>;
  return (
    <div className="space-y-3" data-testid="my-orders">
      {orders.map((o) => open === o.order_id ? (
        <div key={o.order_id}>
          <OrderCard order={o}><UtrSubmit order={o} onSubmit={async (utr) => { await api.post(`/account/orders/${o.order_id}/utr`, { utr }); load(); }} /></OrderCard>
          <button onClick={() => setOpen(null)} className="text-sm text-slate-600 mt-2">Close</button>
        </div>
      ) : (
        <button key={o.order_id} onClick={() => setOpen(o.order_id)} data-testid={`my-order-${o.order_id}`} className="w-full bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center gap-3 text-left hover:border-slate-300">
          <span className="font-mono font-semibold text-[#14532d]">{o.order_id}</span>
          <span className="text-xs text-slate-500">{fmtDate(o.created_at)}</span>
          <span className="text-sm text-slate-600 flex-1 truncate">{o.items.map((i) => i.name).join(", ")}</span>
          <span className="font-bold tnum">{inr(o.total)}</span>
          <StatusPill value={o.status} />
        </button>
      ))}
    </div>
  );
};

const KIND = { online_upi: "UPI (online)", cash_on_delivery: "Cash on delivery" };
const Payments = () => {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    api.get("/account/payments").then((r) => setRows(r.data));
  }, []);
  if (!rows) return <p className="text-sm text-slate-500">Loading…</p>;
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto" data-testid="my-payments">
      <table className="w-full text-sm min-w-[560px]">
        <thead className="bg-slate-50 text-slate-600 text-xs"><tr><th className="text-left px-4 py-2.5">Order</th><th className="text-left px-4">Type</th><th className="text-left px-4">UPI ref</th><th className="text-right px-4">Amount</th><th className="text-left px-4">Status</th></tr></thead>
        <tbody>{rows.length === 0 ? <tr><td colSpan={5} className="px-4 py-6 text-slate-500">No payments yet.</td></tr> : rows.map((p) => (
          <tr key={p.id} className="border-t border-slate-100"><td className="px-4 py-3 font-mono">{p.order_id}</td><td className="px-4">{KIND[p.kind]}</td><td className="px-4 font-mono">{p.utr || "—"}</td><td className="px-4 text-right tnum">{inr(p.amount)}</td><td className="px-4"><StatusPill value={p.status} /></td></tr>
        ))}</tbody>
      </table>
    </div>
  );
};

export default function Account() {
  const { customer, logout } = useStore();
  if (!localStorage.getItem("kcs_token")) return <Navigate to="/login" replace />;
  if (!customer) return <p className="p-10 text-center text-sm text-slate-500">Loading…</p>;
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10" data-testid="account-page">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="font-display text-3xl font-bold">Hi, {customer.name.split(" ")[0]}</h1><p className="text-sm text-slate-500">{customer.email}</p></div>
        <button onClick={logout} className="h-10 px-4 rounded-lg border border-slate-300 bg-white text-sm flex items-center gap-2" data-testid="logout-button"><LogOut className="h-4 w-4" />Logout</button>
      </div>
      <Tabs defaultValue="orders">
        <TabsList className="mb-5">
          <TabsTrigger value="orders" data-testid="account-tab-orders">My orders</TabsTrigger>
          <TabsTrigger value="payments" data-testid="account-tab-payments">Payments</TabsTrigger>
          <TabsTrigger value="profile" data-testid="account-tab-profile">Profile & addresses</TabsTrigger>
        </TabsList>
        <TabsContent value="orders"><Orders /></TabsContent>
        <TabsContent value="payments"><Payments /></TabsContent>
        <TabsContent value="profile"><Profile /></TabsContent>
      </Tabs>
    </div>
  );
}
