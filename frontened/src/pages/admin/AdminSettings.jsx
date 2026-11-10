import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, Pencil, Upload } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg, img, fmtDate } from "@/lib/api";
import { PageHead } from "@/pages/admin/AdminLayout";
import { Field } from "@/components/site/Fields";
import { Switch } from "@/components/ui/switch";
import { StatusPill } from "@/components/site/OrderBits";
import { CategoryIcon, ICON_NAMES } from "@/components/site/CategoryIcon";

const Card = ({ title, sub, children, testid }) => (
  <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4" data-testid={testid}>
    <div><h2 className="font-semibold">{title}</h2>{sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}</div>{children}
  </section>
);

const ShopSettings = () => {
  const [s, setS] = useState(null);
  const ref = useRef();
  useEffect(() => {
    api.get("/settings").then((r) => setS(r.data));
  }, []);
  if (!s) return null;
  const save = async (e) => {
    e?.preventDefault();
    try {
      const { data } = await api.put("/admin/settings", { address: s.address, upi_id: s.upi_id, upi_payee_name: s.upi_payee_name, upi_qr_image: s.upi_qr_image, require_login: s.require_login });
      setS(data);
      toast.success("Settings saved");
    } catch (err) {
      toast.error(errMsg(err));
    }
  };
  const uploadQr = async (file) => {
    const fd = new FormData();
    fd.append("files", file);
    try {
      const { data } = await api.post("/admin/images", fd);
      setS({ ...s, upi_qr_image: data.urls[0] });
      toast.success("QR uploaded — click Save to apply");
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  return (
    <Card title="Shop & UPI payments" sub="Shown to customers at checkout" testid="settings-shop">
      <form onSubmit={save} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="UPI ID" id="settings-upi-id" value={s.upi_id} onChange={(e) => setS({ ...s, upi_id: e.target.value })} required />
          <Field label="Payee name" id="settings-payee" value={s.upi_payee_name} onChange={(e) => setS({ ...s, upi_payee_name: e.target.value })} required />
        </div>
        <Field label="Shop address (shown in footer)" id="settings-address" value={s.address} onChange={(e) => setS({ ...s, address: e.target.value })} placeholder="Add your shop's address" />
        <div className="flex items-center gap-4">
          <div className="h-24 w-24 rounded-lg border border-slate-200 grid place-items-center bg-slate-50 overflow-hidden">
            {s.upi_qr_image ? <img src={img(s.upi_qr_image)} alt="UPI QR" className="h-full w-full object-contain" /> : <span className="text-[10px] text-slate-500 text-center px-1">Auto QR from UPI ID</span>}
          </div>
          <div className="space-y-2">
            <button type="button" onClick={() => ref.current.click()} className="h-9 px-3 rounded-lg border border-slate-300 text-sm flex items-center gap-2" data-testid="settings-upload-qr"><Upload className="h-4 w-4" />Upload official QR</button>
            {s.upi_qr_image && <button type="button" onClick={() => setS({ ...s, upi_qr_image: "" })} className="text-xs text-red-700" data-testid="settings-remove-qr">Use auto-generated QR instead</button>}
            <input ref={ref} type="file" hidden accept="image/png,image/jpeg,image/webp" onChange={(e) => e.target.files[0] && uploadQr(e.target.files[0])} />
          </div>
        </div>
        <label className="flex items-center gap-3 text-sm"><Switch checked={s.require_login} onCheckedChange={(v) => setS({ ...s, require_login: v })} data-testid="settings-require-login" />Require customers to log in before ordering (off = guest checkout allowed)</label>
        <button className="h-10 px-5 rounded-lg bg-[#14532d] text-white text-sm font-medium" data-testid="settings-save-button">Save settings</button>
      </form>
    </Card>
  );
};

const Categories = () => {
  const [rows, setRows] = useState([]);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("Package");
  const load = () => api.get("/categories").then((r) => setRows(r.data));
  useEffect(() => {
    load();
  }, []);
  const run = async (fn, msg) => {
    try {
      await fn();
      toast.success(msg);
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  return (
    <Card title="Categories" sub="Shown in the store menu and filters" testid="settings-categories">
      <form onSubmit={(e) => { e.preventDefault(); run(() => api.post("/admin/categories", { name, icon }), "Category added").then(() => setName("")); }} className="flex flex-wrap gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category name" required minLength={2} className="flex-1 min-w-[180px] h-10 rounded-lg border border-slate-300 px-3 text-sm" data-testid="category-name-input" />
        <select value={icon} onChange={(e) => setIcon(e.target.value)} className="h-10 rounded-lg border border-slate-300 px-2 text-sm" data-testid="category-icon-select">{ICON_NAMES.map((i) => <option key={i}>{i}</option>)}</select>
        <button className="h-10 px-4 rounded-lg bg-[#14532d] text-white text-sm flex items-center gap-1" data-testid="category-add-button"><Plus className="h-4 w-4" />Add</button>
      </form>
      <ul className="divide-y divide-slate-100 text-sm">
        {rows.map((c) => (
          <li key={c.id} className="py-2 flex items-center gap-3" data-testid={`category-row-${c.slug}`}>
            <CategoryIcon name={c.icon} className="h-4 w-4 text-[#14532d]" /><span className="flex-1">{c.name}</span><span className="text-xs text-slate-500">{c.count} products</span>
            <button onClick={() => { const n = window.prompt("Rename category", c.name); if (n) run(() => api.put(`/admin/categories/${c.id}`, { name: n, icon: c.icon }), "Renamed"); }} aria-label="Rename" data-testid={`category-rename-${c.slug}`}><Pencil className="h-4 w-4 text-slate-500" /></button>
            <button onClick={() => window.confirm(`Delete ${c.name}?`) && run(() => api.delete(`/admin/categories/${c.id}`), "Deleted")} aria-label="Delete" data-testid={`category-delete-${c.slug}`}><Trash2 className="h-4 w-4 text-red-700" /></button>
          </li>
        ))}
      </ul>
    </Card>
  );
};

const Coupons = () => {
  const [rows, setRows] = useState([]);
  const [f, setF] = useState({ code: "", type: "percent", value: "", min_order: "", max_discount: "", description: "" });
  const load = () => api.get("/admin/coupons").then((r) => setRows(r.data));
  useEffect(() => {
    load();
  }, []);
  const add = async (e) => {
    e.preventDefault();
    try {
      await api.post("/admin/coupons", { ...f, value: Number(f.value), min_order: Number(f.min_order || 0), max_discount: Number(f.max_discount || 0) });
      toast.success("Coupon added");
      setF({ code: "", type: "percent", value: "", min_order: "", max_discount: "", description: "" });
      load();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };
  const inp = "h-10 rounded-lg border border-slate-300 px-3 text-sm";
  return (
    <Card title="Discount coupons" sub="Customers apply these in the cart" testid="settings-coupons">
      <form onSubmit={add} className="grid grid-cols-2 sm:grid-cols-6 gap-2">
        <input className={inp} placeholder="CODE" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} required data-testid="coupon-code-input" />
        <select className={inp} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} data-testid="coupon-type-select"><option value="percent">% off</option><option value="flat">₹ off</option></select>
        <input className={inp} type="number" min={1} placeholder="Value" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} required data-testid="coupon-value-input" />
        <input className={inp} type="number" min={0} placeholder="Min order ₹" value={f.min_order} onChange={(e) => setF({ ...f, min_order: e.target.value })} data-testid="coupon-min-input" />
        <input className={inp} type="number" min={0} placeholder="Max off ₹" value={f.max_discount} onChange={(e) => setF({ ...f, max_discount: e.target.value })} data-testid="coupon-max-input" />
        <button className="h-10 rounded-lg bg-[#14532d] text-white text-sm" data-testid="coupon-add-button">Add</button>
        <input className={`${inp} col-span-2 sm:col-span-6`} placeholder="Description shown to customers" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} data-testid="coupon-desc-input" />
      </form>
      <ul className="divide-y divide-slate-100 text-sm">
        {rows.map((c) => (
          <li key={c.id} className="py-2 flex items-center gap-3" data-testid={`coupon-row-${c.code}`}>
            <span className="font-mono font-semibold">{c.code}</span><span className="flex-1 text-slate-600 truncate">{c.description}</span>
            <Switch checked={c.active} onCheckedChange={(v) => api.patch(`/admin/coupons/${c.id}`, { active: v }).then(load)} data-testid={`coupon-toggle-${c.code}`} />
            <button onClick={() => api.delete(`/admin/coupons/${c.id}`).then(load)} aria-label="Delete coupon" data-testid={`coupon-delete-${c.code}`}><Trash2 className="h-4 w-4 text-red-700" /></button>
          </li>
        ))}
      </ul>
    </Card>
  );
};

const Notifications = () => {
  const [d, setD] = useState(null);
  useEffect(() => {
    api.get("/admin/notifications").then((r) => setD(r.data));
  }, []);
  if (!d) return null;
  return (
    <Card title="WhatsApp order alerts" sub="Sent automatically to the shop's WhatsApp for every new order" testid="settings-whatsapp">
      <div className="flex items-center gap-2 text-sm">Connection: <StatusPill value={d.configured ? "sent" : "not_configured"} testid="whatsapp-config-status" /></div>
      {!d.configured && <p className="text-xs text-slate-600">Add WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID from your Meta WhatsApp Cloud API app, and create the approved template described in the README. Until then every alert is logged here as “Not configured” and orders are never affected.</p>}
      <ul className="divide-y divide-slate-100 text-sm max-h-72 overflow-y-auto">
        {d.items.length === 0 ? <li className="py-3 text-slate-500">No alerts yet.</li> : d.items.map((n) => (
          <li key={n.id} className="py-2 flex flex-wrap items-center gap-3"><span className="font-mono">{n.order_id}</span><StatusPill value={n.status} /><span className="text-xs text-slate-500 flex-1 truncate">{n.error || n.message_id}</span><span className="text-xs text-slate-400">{fmtDate(n.updated_at)}</span></li>
        ))}
      </ul>
    </Card>
  );
};

export default function AdminSettings() {
  return (
    <div className="space-y-5" data-testid="admin-settings-page">
      <PageHead title="Settings" />
      <ShopSettings />
      <Notifications />
      <div className="grid xl:grid-cols-2 gap-5"><Categories /><Coupons /></div>
    </div>
  );
}
