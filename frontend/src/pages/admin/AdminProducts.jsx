import { useEffect, useState } from "react";
import { Pencil, Plus, Search, Trash2, Star } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg, img, inr } from "@/lib/api";
import { useStore } from "@/context/Store";
import { PageHead } from "@/pages/admin/AdminLayout";
import ProductForm from "@/pages/admin/ProductForm";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const StockInput = ({ p, onSaved }) => {
  const [v, setV] = useState(p.stock);
  const save = async () => {
    if (Number(v) === p.stock) return;
    try {
      await api.patch(`/admin/products/${p.id}`, { stock: Number(v) });
      toast.success("Stock updated");
      onSaved();
    } catch (e) {
      toast.error(errMsg(e));
      setV(p.stock);
    }
  };
  return <input type="number" min={0} value={v} onChange={(e) => setV(e.target.value)} onBlur={save} onKeyDown={(e) => e.key === "Enter" && e.target.blur()} data-testid={`stock-input-${p.slug}`}
    className={`w-20 h-8 rounded-md border px-2 text-right tnum text-sm ${p.stock <= 5 ? "border-amber-400 bg-amber-50" : "border-slate-300"}`} />;
};

export default function AdminProducts() {
  const { categories } = useStore();
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [edit, setEdit] = useState(null);
  const [del, setDel] = useState(null);
  const load = () => api.get("/admin/products", { params: { q: q || undefined, category: cat || undefined } }).then((r) => setRows(r.data));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat]);
  const toggleFeatured = async (p) => {
    await api.patch(`/admin/products/${p.id}`, { featured: !p.featured });
    load();
  };
  const remove = async () => {
    try {
      await api.delete(`/admin/products/${del.id}`);
      toast.success("Product deleted");
      setDel(null);
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  const catName = (s) => categories.find((c) => c.slug === s)?.name || s;
  return (
    <div data-testid="admin-products-page">
      <PageHead title="Products" sub={rows ? `${rows.length} products` : ""}>
        <button onClick={() => setEdit({})} data-testid="add-product-button" className="h-10 px-4 rounded-lg bg-[#14532d] text-white text-sm font-medium flex items-center gap-2"><Plus className="h-4 w-4" />Add product</button>
      </PageHead>
      <div className="flex flex-wrap gap-2 mb-4">
        <form onSubmit={(e) => { e.preventDefault(); load(); }} className="relative flex-1 min-w-[220px]">
          <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or brand, press Enter" data-testid="admin-product-search" className="w-full h-10 rounded-lg border border-slate-300 pl-9 pr-3 text-sm bg-white" />
        </form>
        <select value={cat} onChange={(e) => setCat(e.target.value)} data-testid="admin-product-category-filter" className="h-10 rounded-lg border border-slate-300 px-3 text-sm bg-white">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[860px]" data-testid="admin-products-table">
          <thead className="bg-slate-50 text-xs text-slate-600 sticky top-0"><tr>
            <th className="text-left px-4 py-2.5">Product</th><th className="text-left px-4">Category</th><th className="text-right px-4">MRP</th><th className="text-right px-4">Price</th><th className="text-right px-4">Stock</th><th className="text-center px-4">Featured</th><th className="text-left px-4">Status</th><th className="px-4" />
          </tr></thead>
          <tbody>
            {!rows ? <tr><td colSpan={8} className="px-4 py-6 text-slate-500">Loading…</td></tr> : rows.map((p) => (
              <tr key={p.id} className="border-t border-slate-100" data-testid={`admin-product-row-${p.slug}`}>
                <td className="px-4 py-2.5"><div className="flex items-center gap-3"><img src={img(p.images?.[0])} alt="" className="h-10 w-12 rounded object-cover bg-slate-100" /><div className="min-w-0"><p className="font-medium truncate max-w-[260px]">{p.name}</p><p className="text-xs text-slate-500">{p.brand}</p></div></div></td>
                <td className="px-4 text-slate-600">{catName(p.category)}</td>
                <td className="px-4 text-right tnum text-slate-500">{inr(p.price)}</td>
                <td className="px-4 text-right tnum font-medium">{inr(p.sale_price)}</td>
                <td className="px-4 text-right"><StockInput key={p.stock} p={p} onSaved={load} /></td>
                <td className="px-4 text-center"><button onClick={() => toggleFeatured(p)} data-testid={`toggle-featured-${p.slug}`} aria-label="Toggle featured"><Star className={`h-4 w-4 ${p.featured ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} /></button></td>
                <td className="px-4"><span className={`text-xs rounded-full px-2 py-0.5 ${p.active ? "bg-green-50 text-green-800" : "bg-slate-100 text-slate-600"}`}>{p.active ? "Visible" : "Hidden"}</span></td>
                <td className="px-4 whitespace-nowrap text-right">
                  <button onClick={() => setEdit(p)} className="h-8 w-8 inline-grid place-items-center rounded-md hover:bg-slate-100" data-testid={`edit-product-${p.slug}`} aria-label="Edit"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => setDel(p)} className="h-8 w-8 inline-grid place-items-center rounded-md hover:bg-red-50 text-red-700" data-testid={`delete-product-${p.slug}`} aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ProductForm open={!!edit} product={edit?.id ? edit : null} categories={categories} onClose={() => setEdit(null)} onSaved={load} />
      <AlertDialog open={!!del} onOpenChange={(v) => !v && setDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete product?</AlertDialogTitle><AlertDialogDescription>{del?.name} will be removed from the store permanently.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={remove} className="bg-red-700 hover:bg-red-800" data-testid="confirm-delete-product">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
