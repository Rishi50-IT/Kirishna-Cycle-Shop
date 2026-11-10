import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Minus, Plus, ShieldCheck, ShoppingCart, Star, Zap, Truck } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg, img } from "@/lib/api";
import { useStore } from "@/context/Store";
import { PriceTag, ProductGrid } from "@/components/site/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

const Gallery = ({ images, name }) => {
  const [i, setI] = useState(0);
  const list = images?.length ? images : [""];
  return (
    <div className="space-y-3" data-testid="product-gallery">
      <div className="aspect-[4/3] rounded-xl overflow-hidden bg-white border border-slate-200">
        <img src={img(list[i])} alt={name} className="h-full w-full object-cover" data-testid="gallery-main-image" />
      </div>
      {list.length > 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {list.map((src, k) => (
            <button key={src + k} onClick={() => setI(k)} data-testid={`gallery-thumb-${k}`}
              className={`h-16 w-20 shrink-0 rounded-lg overflow-hidden border-2 ${k === i ? "border-[#14532d]" : "border-transparent opacity-70 hover:opacity-100"}`}>
              <img src={img(src)} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const Stars = ({ n, onPick }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <button key={i} type="button" disabled={!onPick} onClick={() => onPick?.(i)} data-testid={onPick ? `review-star-${i}` : undefined}>
        <Star className={`h-4 w-4 ${i <= n ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
      </button>
    ))}
  </div>
);

const ReviewBox = ({ pid, onDone }) => {
  const { customer } = useStore();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  if (!customer) return <p className="text-sm text-slate-500"><Link to="/login" className="text-[#14532d] font-medium">Log in</Link> to write a review.</p>;
  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/products/${pid}/reviews`, { rating, comment });
      toast.success("Thanks for your review!");
      setComment("");
      onDone();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };
  return (
    <form onSubmit={submit} className="space-y-3 bg-white border border-slate-200 rounded-xl p-4" data-testid="review-form">
      <Stars n={rating} onPick={setRating} />
      <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="How is the product?" minLength={3} required data-testid="review-comment-input" />
      <button className="h-10 px-4 rounded-lg bg-[#14532d] text-white text-sm font-medium" data-testid="review-submit-button">Submit review</button>
    </form>
  );
};

export default function ProductDetail() {
  const { key } = useParams();
  const nav = useNavigate();
  const { addToCart, cart, categories } = useStore();
  const [d, setD] = useState(null);
  const [qty, setQty] = useState(1);
  const load = () => api.get(`/products/${key}`).then((r) => setD(r.data)).catch(() => setD({ notFound: true }));
  useEffect(() => {
    setD(null);
    setQty(1);
    load();
    window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!d) return <div className="max-w-7xl mx-auto px-4 py-10 grid md:grid-cols-2 gap-8"><Skeleton className="aspect-[4/3] rounded-xl" /><Skeleton className="h-96 rounded-xl" /></div>;
  if (d.notFound) return <div className="max-w-7xl mx-auto px-4 py-20 text-center" data-testid="product-not-found"><p className="font-semibold">Product not found</p><Link to="/products" className="text-[#14532d] text-sm">Browse products</Link></div>;
  const p = d.product;
  const inCart = cart.find((i) => i.product_id === p.id)?.qty || 0;
  const maxQty = Math.max(0, Math.min(p.stock - inCart, 20));
  const add = () => {
    addToCart(p, qty);
    toast.success("Added to cart", { action: { label: "View cart", onClick: () => nav("/cart") } });
  };
  const buyNow = () => {
    if (maxQty > 0) addToCart(p, qty);
    nav("/checkout");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-28 md:pb-8" data-testid="product-detail-page">
      <nav className="text-xs text-slate-500 mb-5"><Link to="/" className="hover:text-slate-800">Home</Link> / <Link to={`/products?category=${p.category}`} className="hover:text-slate-800">{categories.find((c) => c.slug === p.category)?.name || p.category}</Link> / <span className="text-slate-700">{p.name}</span></nav>
      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        <Gallery images={p.images} name={p.name} />
        <div className="space-y-5">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500" data-testid="product-brand">{p.brand}</p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold mt-1" data-testid="product-name">{p.name}</h1>
            {p.rating_count > 0 && <div className="flex items-center gap-2 mt-2 text-sm text-slate-600"><Stars n={Math.round(p.rating_avg)} />{p.rating_avg} · {p.rating_count} reviews</div>}
          </div>
          <PriceTag p={p} size="lg" />
          <p className="text-xs text-slate-500 -mt-3">Inclusive of all taxes</p>
          <p className={`text-sm font-medium ${p.stock > 5 ? "text-green-700" : p.stock > 0 ? "text-amber-700" : "text-red-700"}`} data-testid="product-stock">
            {p.stock > 0 ? `${p.stock} in stock` : "Out of stock"}
          </p>
          {p.stock > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600">Quantity</span>
              <div className="flex items-center border border-slate-300 rounded-lg bg-white">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="h-10 w-10 grid place-items-center" data-testid="qty-decrease" aria-label="Decrease"><Minus className="h-4 w-4" /></button>
                <span className="w-10 text-center tnum font-semibold" data-testid="qty-value">{qty}</span>
                <button onClick={() => setQty(Math.min(maxQty || 1, qty + 1))} className="h-10 w-10 grid place-items-center" data-testid="qty-increase" aria-label="Increase"><Plus className="h-4 w-4" /></button>
              </div>
            </div>
          )}
          <div className="hidden md:flex gap-3">
            <button onClick={add} disabled={maxQty === 0} data-testid="add-to-cart-button" className="flex-1 h-12 rounded-lg border-2 border-[#14532d] text-[#14532d] font-semibold flex items-center justify-center gap-2 hover:bg-green-50 disabled:opacity-40"><ShoppingCart className="h-5 w-5" />Add to cart</button>
            <button onClick={buyNow} disabled={p.stock === 0} data-testid="buy-now-button" className="flex-1 h-12 rounded-lg bg-[#14532d] text-white font-semibold flex items-center justify-center gap-2 hover:bg-[#166534] disabled:opacity-40"><Zap className="h-5 w-5" />Buy now</button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 flex gap-3" data-testid="product-warranty"><ShieldCheck className="h-5 w-5 text-[#14532d] shrink-0" /><div><p className="text-sm font-semibold">Warranty</p><p className="text-xs text-slate-600">{p.warranty || "As per manufacturer"}</p></div></div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 flex gap-3"><Truck className="h-5 w-5 text-[#14532d] shrink-0" /><div><p className="text-sm font-semibold">Pay your way</p><p className="text-xs text-slate-600">COD, full UPI or 25% advance</p></div></div>
          </div>
          <div>
            <h2 className="text-base font-semibold mb-2">Description</h2>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line" data-testid="product-description">{p.description}</p>
          </div>
          {p.specs?.length > 0 && (
            <div>
              <h2 className="text-base font-semibold mb-2">Specifications</h2>
              <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden bg-white" data-testid="product-specs">
                <tbody>{p.specs.map((s) => <tr key={s.key} className="border-b border-slate-100 last:border-0"><td className="px-4 py-2.5 bg-slate-50 text-slate-600 w-2/5">{s.key}</td><td className="px-4 py-2.5 text-slate-900">{s.value}</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <section className="mt-14 grid lg:grid-cols-2 gap-8" data-testid="product-reviews">
        <div>
          <h2 className="font-display text-2xl font-bold mb-4">Customer reviews</h2>
          {d.reviews.length === 0 ? <p className="text-sm text-slate-500">No reviews yet.</p> : (
            <div className="space-y-3">{d.reviews.map((r) => (
              <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-4"><Stars n={r.rating} /><p className="text-sm mt-2">{r.comment}</p><p className="text-xs text-slate-500 mt-2">{r.customer_name}</p></div>
            ))}</div>
          )}
        </div>
        <div><h3 className="text-base font-semibold mb-3">Write a review</h3><ReviewBox pid={p.id} onDone={load} /></div>
      </section>

      {d.related.length > 0 && <section className="mt-14"><h2 className="font-display text-2xl font-bold mb-4">You may also like</h2><ProductGrid items={d.related} /></section>}

      <div className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 p-3 flex gap-3">
        <button onClick={add} disabled={maxQty === 0} data-testid="mobile-add-to-cart" className="flex-1 h-12 rounded-lg border-2 border-[#14532d] text-[#14532d] font-semibold disabled:opacity-40">Add to cart</button>
        <button onClick={buyNow} disabled={p.stock === 0} data-testid="mobile-buy-now" className="flex-1 h-12 rounded-lg bg-[#14532d] text-white font-semibold disabled:opacity-40">Buy now</button>
      </div>
    </div>
  );
}
