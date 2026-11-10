import { useEffect, useRef, useState } from "react";
import { Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg, img } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/site/Fields";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

const EMPTY = { name: "", category: "", brand: "", description: "", price: "", sale_price: "", stock: "", images: [], specs: [], warranty: "", featured: false, active: true };

const Images = ({ images, setImages }) => {
  const ref = useRef();
  const [busy, setBusy] = useState(false);
  const upload = async (files) => {
    if (!files.length) return;
    const fd = new FormData();
    [...files].forEach((f) => fd.append("files", f));
    setBusy(true);
    try {
      const { data } = await api.post("/admin/images", fd);
      setImages([...images, ...data.urls].slice(0, 10));
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
      ref.current.value = "";
    }
  };
  return (
    <div>
      <Label className="text-sm text-slate-700">Product images (first is the cover)</Label>
      <div className="mt-1.5 flex flex-wrap gap-2" data-testid="product-form-images">
        {images.map((src, k) => (
          <div key={src + k} className="relative h-20 w-24 rounded-lg overflow-hidden border border-slate-200">
            <img src={img(src)} alt="" className="h-full w-full object-cover" />
            <button type="button" onClick={() => setImages(images.filter((_, i) => i !== k))} className="absolute top-1 right-1 h-5 w-5 rounded-full bg-white/90 grid place-items-center" data-testid={`remove-image-${k}`} aria-label="Remove image"><X className="h-3 w-3" /></button>
          </div>
        ))}
        {images.length < 10 && (
          <button type="button" onClick={() => ref.current.click()} disabled={busy} data-testid="upload-images-button" className="h-20 w-24 rounded-lg border-2 border-dashed border-slate-300 text-slate-500 text-xs flex flex-col items-center justify-center gap-1 hover:border-[#14532d]">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}Upload
          </button>
        )}
      </div>
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => upload(e.target.files)} data-testid="upload-images-input" />
      <p className="text-xs text-slate-500 mt-1">JPG, PNG or WEBP · up to 3 MB each · max 10</p>
    </div>
  );
};

const Specs = ({ specs, setSpecs }) => (
  <div>
    <Label className="text-sm text-slate-700">Specifications</Label>
    <div className="space-y-2 mt-1.5">
      {specs.map((s, k) => (
        <div key={k} className="flex gap-2">
          <input value={s.key} placeholder="e.g. Frame" onChange={(e) => setSpecs(specs.map((x, i) => (i === k ? { ...x, key: e.target.value } : x)))} className="w-2/5 h-10 rounded-md border border-slate-300 px-3 text-sm" data-testid={`spec-key-${k}`} />
          <input value={s.value} placeholder="e.g. Alloy 18 inch" onChange={(e) => setSpecs(specs.map((x, i) => (i === k ? { ...x, value: e.target.value } : x)))} className="flex-1 h-10 rounded-md border border-slate-300 px-3 text-sm" data-testid={`spec-value-${k}`} />
          <button type="button" onClick={() => setSpecs(specs.filter((_, i) => i !== k))} className="h-10 w-10 grid place-items-center text-slate-500 hover:text-red-700" aria-label="Remove spec"><Trash2 className="h-4 w-4" /></button>
        </div>
      ))}
      <button type="button" onClick={() => setSpecs([...specs, { key: "", value: "" }])} className="text-sm text-[#14532d] font-medium flex items-center gap-1" data-testid="add-spec-button"><Plus className="h-4 w-4" />Add specification</button>
    </div>
  </div>
);

export default function ProductForm({ open, onClose, product, categories, onSaved }) {
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) setF(product ? { ...EMPTY, ...product } : { ...EMPTY, category: categories[0]?.slug || "" });
  }, [open, product, categories]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    const body = {
      ...f, price: Number(f.price), sale_price: Number(f.sale_price), stock: Number(f.stock),
      specs: f.specs.filter((s) => s.key.trim() && s.value.trim()),
    };
    ["id", "slug", "sold_count", "rating_avg", "rating_count", "created_at", "updated_at"].forEach((k) => delete body[k]);
    setBusy(true);
    try {
      if (product) await api.put(`/admin/products/${product.id}`, body);
      else await api.post("/admin/products", body);
      toast.success(product ? "Product updated" : "Product added");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };
  const off = f.price && f.sale_price ? Math.round(((f.price - f.sale_price) / f.price) * 100) : 0;
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="product-form-dialog">
        <DialogHeader><DialogTitle>{product ? "Edit product" : "Add new product"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Product name" id="pf-name" value={f.name} onChange={set("name")} required minLength={2} />
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pf-category" className="text-sm text-slate-700">Category</Label>
              <select id="pf-category" value={f.category} onChange={set("category")} required data-testid="pf-category-select" className="mt-1.5 w-full h-11 rounded-md border border-slate-300 px-3 text-sm bg-white">
                {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
            </div>
            <Field label="Brand" id="pf-brand" value={f.brand} onChange={set("brand")} required />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Original price (₹)" id="pf-price" type="number" min={1} value={f.price} onChange={set("price")} required />
            <Field label={`Discounted price (₹)${off > 0 ? ` · ${off}% off` : ""}`} id="pf-sale-price" type="number" min={1} value={f.sale_price} onChange={set("sale_price")} required />
            <Field label="Stock" id="pf-stock" type="number" min={0} value={f.stock} onChange={set("stock")} required />
          </div>
          <div>
            <Label htmlFor="pf-description" className="text-sm text-slate-700">Description</Label>
            <Textarea id="pf-description" rows={4} value={f.description} onChange={set("description")} className="mt-1.5" data-testid="pf-description-input" />
          </div>
          <Field label="Warranty information" id="pf-warranty" value={f.warranty} onChange={set("warranty")} placeholder="e.g. 2 years on frame" />
          <Images images={f.images} setImages={(images) => setF((x) => ({ ...x, images }))} />
          <Specs specs={f.specs} setSpecs={(specs) => setF((x) => ({ ...x, specs }))} />
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm"><Switch checked={f.featured} onCheckedChange={(v) => setF({ ...f, featured: v })} data-testid="pf-featured-switch" />Featured on homepage</label>
            <label className="flex items-center gap-2 text-sm"><Switch checked={f.active} onCheckedChange={(v) => setF({ ...f, active: v })} data-testid="pf-active-switch" />Visible in store</label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="h-10 px-4 rounded-lg border border-slate-300 text-sm">Cancel</button>
            <button disabled={busy} data-testid="pf-save-button" className="h-10 px-5 rounded-lg bg-[#14532d] text-white text-sm font-medium flex items-center gap-2">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Save product</button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
