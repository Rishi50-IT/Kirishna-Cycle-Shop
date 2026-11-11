import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, Truck, Wallet, Wrench, Star, Tag, Phone, MessageCircle, Mail } from "lucide-react";
import { api } from "@/lib/api";
import { useStore } from "@/context/Store";
import { ProductGrid } from "@/components/site/ProductCard";
import { CategoryIcon } from "@/components/site/CategoryIcon";
import { Skeleton } from "@/components/ui/skeleton";

const Section = ({ title, sub, to, children, testid }) => (
  <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-14 rise" data-testid={testid}>
    <div className="flex items-end justify-between gap-4 mb-5">
      <div>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">{title}</h2>
        {sub && <p className="text-sm text-slate-500 mt-1">{sub}</p>}
      </div>
      {to && <Link to={to} className="text-sm font-medium text-[#14532d] flex items-center gap-1 hover:gap-2 transition-[gap] shrink-0">View all <ArrowRight className="h-4 w-4" /></Link>}
    </div>
    {children}
  </section>
);

const Hero = () => (
  <section className="relative overflow-hidden bg-slate-900" data-testid="home-hero">
    <img src="/img/hero.jpg" alt="Rider on a mountain trail" className="absolute inset-0 h-full w-full object-cover object-[center_60%] opacity-60" />
    <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/60 to-transparent" />
    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-28 lg:py-36">
      <p className="text-green-300 text-xs sm:text-sm font-semibold tracking-[0.25em] uppercase rise">Kirishna Cycle Shop</p>
      <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mt-3 max-w-2xl leading-[1.05] rise" style={{ animationDelay: "80ms" }}>
        Ride further. Pay your way.
      </h1>
      <p className="text-slate-200 mt-5 max-w-lg text-base sm:text-lg rise" style={{ animationDelay: "160ms" }}>
        Mountain, gear, kids, ladies and electric cycles plus helmets, tyres, lights and genuine spare parts. Cash on Delivery, UPI or just 25% advance.
      </p>
      <div className="mt-8 flex flex-wrap gap-3 rise" style={{ animationDelay: "240ms" }}>
        <Link to="/products" data-testid="hero-shop-now" className="h-12 px-6 rounded-lg bg-white text-[#14532d] font-semibold flex items-center gap-2 hover:bg-green-50">
          Explore cycles <ArrowRight className="h-4 w-4" />
        </Link>
        <Link to="/products?category=bicycle-accessories" data-testid="hero-accessories" className="h-12 px-6 rounded-lg border border-white/40 text-white font-medium flex items-center hover:bg-white/10">
          Shop accessories
        </Link>
      </div>
    </div>
  </section>
);

const TRUST = [
  [Truck, "Home delivery", "Packed & shipped with care"],
  [Wallet, "3 ways to pay", "COD, UPI or 25% advance"],
  [ShieldCheck, "Brand warranty", "On every cycle we sell"],
  [Wrench, "Spare parts", "Genuine parts in stock"],
];

const Trust = () => (
  <div className="bg-white border-b border-slate-200">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 grid grid-cols-2 lg:grid-cols-4 gap-4">
      {TRUST.map(([I, t, s]) => (
        <div key={t} className="flex items-center gap-3">
          <span className="h-10 w-10 rounded-full bg-green-50 text-[#14532d] grid place-items-center shrink-0"><I className="h-5 w-5" /></span>
          <div><p className="text-sm font-semibold">{t}</p><p className="text-xs text-slate-500">{s}</p></div>
        </div>
      ))}
    </div>
  </div>
);

const Categories = () => {
  const { categories } = useStore();
  return (
    <Section title="Shop by category" sub="12 departments for every rider" testid="home-categories">
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {categories.map((c) => (
          <Link key={c.slug} to={`/products?category=${c.slug}`} data-testid={`home-category-${c.slug}`}
            className="group rounded-xl bg-white border border-slate-200 p-4 flex flex-col items-center text-center gap-2 hover:border-[#14532d] hover:-translate-y-0.5 transition-[transform,border-color]">
            <span className="h-12 w-12 rounded-full bg-green-50 text-[#14532d] grid place-items-center group-hover:bg-[#14532d] group-hover:text-white transition-colors">
              <CategoryIcon name={c.icon} className="h-6 w-6" />
            </span>
            <span className="text-xs sm:text-sm font-medium text-slate-800 leading-tight">{c.name}</span>
            <span className="text-[11px] text-slate-400">{c.count} items</span>
          </Link>
        ))}
      </div>
    </Section>
  );
};

const Offers = ({ coupons }) => (
  <div className="grid sm:grid-cols-2 gap-3 mb-5">
    {coupons.map((c) => (
      <div key={c.code} className="rounded-xl border-2 border-dashed border-[#14532d]/40 bg-green-50 p-4 flex items-center gap-4" data-testid={`coupon-${c.code}`}>
        <Tag className="h-6 w-6 text-[#14532d] shrink-0" />
        <div className="flex-1"><p className="text-sm font-semibold text-slate-900">{c.description}</p><p className="text-xs text-slate-500">Apply in cart</p></div>
        <span className="font-mono font-bold text-[#14532d] bg-white rounded-md px-3 py-1.5 border border-green-200">{c.code}</span>
      </div>
    ))}
  </div>
);

const Reviews = ({ reviews }) => (
  <Section title="What riders say" sub="Real reviews from our customers" testid="home-reviews">
    {reviews.length === 0 ? (
      <p className="text-sm text-slate-500 bg-white border border-slate-200 rounded-xl p-6" data-testid="home-reviews-empty">No reviews yet. Bought from us? Log in and review your product on its page.</p>
    ) : (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {reviews.map((r) => (
          <figure key={r.id} className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex gap-0.5">{[1, 2, 3, 4, 5].map((i) => <Star key={i} className={`h-4 w-4 ${i <= r.rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />)}</div>
            <blockquote className="text-sm text-slate-700 mt-3 leading-relaxed">“{r.comment}”</blockquote>
            <figcaption className="text-xs text-slate-500 mt-3">{r.customer_name} · {r.product_name}</figcaption>
          </figure>
        ))}
      </div>
    )}
  </Section>
);

const Contact = () => {
  const { settings } = useStore();
  const phone = settings?.phone || "9508668053";
  const items = [
    [Phone, "Call us", `+91 ${phone}`, `tel:+91${phone}`],
    [MessageCircle, "WhatsApp", `+91 ${settings?.whatsapp || phone}`, `https://wa.me/91${settings?.whatsapp || phone}`],
    [Mail, "Email", settings?.email || "kumarkirishna5777@gmail.com", `mailto:${settings?.email || "kumarkirishna5777@gmail.com"}`],
  ];
  return (
    <Section title="Need help choosing a cycle?" sub="Talk to us — we reply fast on WhatsApp" testid="home-contact">
      <div className="grid sm:grid-cols-3 gap-4">
        {items.map(([I, t, v, href]) => (
          <a key={t} href={href} target="_blank" rel="noreferrer" className="bg-[#14532d] text-white rounded-xl p-5 flex items-center gap-4 hover:bg-[#166534]" data-testid={`contact-${t.toLowerCase().replace(" ", "-")}`}>
            <I className="h-6 w-6 shrink-0" /><div className="min-w-0"><p className="text-xs text-green-200">{t}</p><p className="font-semibold truncate">{v}</p></div>
          </a>
        ))}
      </div>
    </Section>
  );
};

const Loading = () => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-14 grid grid-cols-2 lg:grid-cols-4 gap-5">
    {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
  </div>
);

export default function Home() {
  const [d, setD] = useState(null);
  useEffect(() => {
    api.get("/home").then((r) => setD(r.data));
  }, []);
  return (
    <div data-testid="home-page">
      <Hero />
      <Trust />
      <Categories />
      {!d ? <Loading /> : (
        <>
          <Section title="Featured cycles" sub="Hand-picked by our team" to="/products" testid="home-featured"><ProductGrid items={d.featured} /></Section>
          <Section title="Special offers" sub="Biggest discounts right now" to="/products?sort=discount" testid="home-offers">
            <Offers coupons={d.coupons} />
            <ProductGrid items={d.offers} />
          </Section>
          <Section title="Best sellers" sub="What riders are buying" to="/products?sort=popular" testid="home-bestsellers"><ProductGrid items={d.best_sellers} /></Section>
          <Section title="Latest arrivals" sub="Fresh in store" to="/products" testid="home-latest"><ProductGrid items={d.latest} /></Section>
          <Reviews reviews={d.reviews} />
        </>
      )}
      <Contact />
    </div>
  );
}
