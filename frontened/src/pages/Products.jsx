import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SlidersHorizontal, X } from "lucide-react";
import { api } from "@/lib/api";
import { useStore } from "@/context/Store";
import { ProductGrid } from "@/components/site/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SORTS = { new: "Newest", popular: "Popularity", price_asc: "Price: low to high", price_desc: "Price: high to low" };

const Filters = ({ params, set, brands, categories }) => (
  <div className="space-y-6" data-testid="product-filters">
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Category</p>
      <div className="space-y-1">
        {[{ slug: "", name: "All categories" }, ...categories].map((c) => (
          <button key={c.slug} onClick={() => set({ category: c.slug, brand: "" })} data-testid={`filter-category-${c.slug || "all"}`}
            className={`w-full text-left text-sm px-3 py-2 rounded-md ${(params.get("category") || "") === c.slug ? "bg-green-50 text-[#166534] font-semibold" : "text-slate-700 hover:bg-slate-100"}`}>
            {c.name}
          </button>
        ))}
      </div>
    </div>
    {brands.length > 0 && (
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Brand</p>
        <div className="flex flex-wrap gap-2">
          {brands.map((b) => (
            <button key={b} onClick={() => set({ brand: params.get("brand") === b ? "" : b })} data-testid={`filter-brand-${b}`}
              className={`text-xs px-3 py-1.5 rounded-full border ${params.get("brand") === b ? "bg-[#14532d] text-white border-[#14532d]" : "border-slate-300 text-slate-700 hover:border-slate-400"}`}>{b}</button>
          ))}
        </div>
      </div>
    )}
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Price (₹)</p>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.target); set({ min_price: f.get("min"), max_price: f.get("max") }); }}>
        <input name="min" defaultValue={params.get("min_price") || ""} placeholder="Min" inputMode="numeric" data-testid="filter-min-price" className="w-full h-9 rounded-md border border-slate-300 px-2 text-sm" />
        <input name="max" defaultValue={params.get("max_price") || ""} placeholder="Max" inputMode="numeric" data-testid="filter-max-price" className="w-full h-9 rounded-md border border-slate-300 px-2 text-sm" />
        <button className="h-9 px-3 rounded-md bg-[#14532d] text-white text-sm" data-testid="filter-price-apply">Go</button>
      </form>
    </div>
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <input type="checkbox" checked={params.get("in_stock") === "true"} onChange={(e) => set({ in_stock: e.target.checked ? "true" : "" })} data-testid="filter-in-stock" className="accent-[#14532d] h-4 w-4" />
      In stock only
    </label>
  </div>
);

export default function Products() {
  const [params, setParams] = useSearchParams();
  const { categories } = useStore();
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setData(null);
    const q = Object.fromEntries([...params.entries()].filter(([, v]) => v));
    api.get("/products", { params: q }).then((r) => setData(r.data));
  }, [params]);

  const set = (obj) => {
    const n = new URLSearchParams(params);
    Object.entries(obj).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k)));
    setParams(n);
    setOpen(false);
  };
  const cat = categories.find((c) => c.slug === params.get("category"));
  const q = params.get("q");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8" data-testid="products-page">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold">{q ? `Results for “${q}”` : cat?.name || "All products"}</h1>
          <p className="text-sm text-slate-500 mt-1" data-testid="products-count">{data ? `${data.total} products` : "Loading…"}</p>
        </div>
        <div className="flex items-center gap-2">
          {[...params.keys()].length > 0 && <button onClick={() => setParams({})} className="text-sm text-slate-600 flex items-center gap-1 hover:text-slate-900" data-testid="filters-reset"><X className="h-4 w-4" />Reset</button>}
          <button onClick={() => setOpen(!open)} className="lg:hidden h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm flex items-center gap-2" data-testid="filters-toggle"><SlidersHorizontal className="h-4 w-4" />Filters</button>
          <Select value={params.get("sort") || "new"} onValueChange={(v) => set({ sort: v })}>
            <SelectTrigger className="w-[190px] h-10 bg-white" data-testid="sort-select"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(SORTS).map(([k, v]) => <SelectItem key={k} value={k} data-testid={`sort-${k}`}>{v}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid lg:grid-cols-[240px_1fr] gap-8">
        <aside className={`${open ? "block" : "hidden"} lg:block bg-white lg:bg-transparent border lg:border-0 border-slate-200 rounded-xl p-4 lg:p-0`}>
          <Filters params={params} set={set} brands={data?.brands || []} categories={categories} />
        </aside>
        <div>
          {!data ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-5">{[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-72 rounded-xl" />)}</div>
          ) : data.items.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center" data-testid="products-empty">
              <p className="font-semibold">No products match these filters</p>
              <button onClick={() => setParams({})} className="mt-3 text-sm text-[#14532d] font-medium">Clear filters</button>
            </div>
          ) : (
            <ProductGrid items={data.items} testid="products-grid" />
          )}
        </div>
      </div>
    </div>
  );
}
