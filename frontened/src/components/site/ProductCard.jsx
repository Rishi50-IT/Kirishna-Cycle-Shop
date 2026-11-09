import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, Star } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/context/Store";
import { img, inr, offPct } from "@/lib/api";

export const PriceTag = ({ p, size = "md" }) => {
  const off = offPct(p);
  return (
    <div className="flex items-baseline flex-wrap gap-x-2">
      <span className={`font-bold text-slate-900 tnum ${size === "lg" ? "text-3xl" : "text-lg"}`} data-testid="price-sale">{inr(p.sale_price)}</span>
      {off > 0 && <span className="text-sm text-slate-400 line-through tnum" data-testid="price-mrp">{inr(p.price)}</span>}
      {off > 0 && <span className="text-xs font-semibold text-green-700">{off}% off</span>}
    </div>
  );
};

export default function ProductCard({ p }) {
  const { addToCart } = useStore();
  const nav = useNavigate();
  const off = offPct(p);
  const add = (e) => {
    e.preventDefault();
    addToCart(p);
    toast.success(`${p.name} added to cart`, { action: { label: "View cart", onClick: () => nav("/cart") } });
  };
  return (
    <Link to={`/product/${p.slug}`} data-testid={`product-card-${p.slug}`} className="group bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col hover:border-[#14532d]/40 hover:shadow-md transition-[border-color,box-shadow]">
      <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
        <img src={img(p.images?.[0])} alt={p.name} loading="lazy" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
        {off > 0 && <span className="absolute top-2 left-2 rounded-full bg-[#14532d] text-white text-[11px] font-semibold px-2 py-0.5">{off}% OFF</span>}
        {p.stock === 0 && <span className="absolute inset-0 bg-white/70 grid place-items-center text-sm font-semibold text-slate-700">Out of stock</span>}
      </div>
      <div className="p-3 sm:p-4 flex flex-col gap-1.5 flex-1">
        <span className="text-[11px] uppercase tracking-wider text-slate-500">{p.brand}</span>
        <h3 className="text-sm font-semibold text-slate-900 line-clamp-2 min-h-[2.5rem]">{p.name}</h3>
        {p.rating_count > 0 && (
          <span className="flex items-center gap-1 text-xs text-slate-600"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{p.rating_avg} ({p.rating_count})</span>
        )}
        <PriceTag p={p} />
        <div className="mt-auto pt-2 flex items-center justify-between gap-2">
          <span className={`text-xs ${p.stock > 5 ? "text-green-700" : p.stock > 0 ? "text-amber-700" : "text-red-700"}`}>
            {p.stock > 5 ? "In stock" : p.stock > 0 ? `Only ${p.stock} left` : "Sold out"}
          </span>
          <button onClick={add} disabled={p.stock === 0} data-testid={`add-to-cart-${p.slug}`} aria-label="Add to cart"
            className="h-9 w-9 rounded-lg bg-[#14532d] text-white grid place-items-center hover:bg-[#166534] disabled:opacity-40 active:scale-95 transition-transform">
            <ShoppingCart className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Link>
  );
}

export const ProductGrid = ({ items, testid }) => (
  <div data-testid={testid} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
    {items.map((p) => <ProductCard key={p.id} p={p} />)}
  </div>
);
