import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Search, ShoppingCart, User, Phone, PackageSearch, Bike } from "lucide-react";
import { useStore } from "@/context/Store";

export const Logo = ({ light = true }) => (
  <Link to="/" data-testid="site-logo" className="flex items-center gap-2 shrink-0">
    <span className={`h-9 w-9 rounded-lg grid place-items-center ${light ? "bg-white text-[#14532d]" : "bg-[#14532d] text-white"}`}>
      <Bike className="h-5 w-5" />
    </span>
    <span className="leading-none">
      <span className={`font-display text-xl font-extrabold block ${light ? "text-white" : "text-slate-900"}`}>Kirishna</span>
      <span className={`text-[10px] tracking-[0.2em] uppercase ${light ? "text-green-200" : "text-slate-500"}`}>Cycle Shop</span>
    </span>
  </Link>
);

const SearchBox = ({ className }) => {
  const [q, setQ] = useState("");
  const nav = useNavigate();
  const submit = (e) => {
    e.preventDefault();
    nav(`/products?q=${encodeURIComponent(q.trim())}`);
  };
  return (
    <form onSubmit={submit} className={`relative ${className}`} role="search">
      <input
        data-testid="header-search-input"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search cycles, helmets, tyres, brands…"
        className="w-full h-11 rounded-lg bg-white pl-4 pr-12 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-green-300"
      />
      <button data-testid="header-search-button" aria-label="Search" className="absolute right-1 top-1 h-9 w-10 rounded-md bg-[#14532d] text-white grid place-items-center hover:bg-[#166534]">
        <Search className="h-4 w-4" />
      </button>
    </form>
  );
};

export default function Header() {
  const { cartCount, customer, categories, settings } = useStore();
  return (
    <header className="sticky top-0 z-40">
      <div className="bg-slate-900 text-slate-300 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-8 flex items-center justify-between">
          <a href={`tel:+91${settings?.phone || "9508668053"}`} className="flex items-center gap-1.5 hover:text-white" data-testid="topbar-phone">
            <Phone className="h-3 w-3" /> +91 {settings?.phone || "9508668053"}
          </a>
          <span className="hidden sm:block">Free assembly check on every cycle · COD & UPI accepted</span>
          <Link to="/admin" className="hover:text-white" data-testid="topbar-admin-link">Admin</Link>
        </div>
      </div>
      <div className="bg-[#14532d]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
          <Logo />
          <SearchBox className="hidden md:block flex-1 max-w-2xl mx-auto" />
          <nav className="ml-auto flex items-center gap-1 text-white">
            <Link to="/track" data-testid="nav-track-order" className="flex items-center gap-1.5 px-3 h-10 rounded-md hover:bg-white/10 text-sm">
              <PackageSearch className="h-5 w-5" /><span className="hidden lg:inline">Track order</span>
            </Link>
            <Link to={customer ? "/account" : "/login"} data-testid="nav-account" className="flex items-center gap-1.5 px-3 h-10 rounded-md hover:bg-white/10 text-sm">
              <User className="h-5 w-5" /><span className="hidden lg:inline max-w-[110px] truncate">{customer ? customer.name.split(" ")[0] : "Login"}</span>
            </Link>
            <Link to="/cart" data-testid="nav-cart" className="relative flex items-center gap-1.5 px-3 h-10 rounded-md hover:bg-white/10 text-sm">
              <ShoppingCart className="h-5 w-5" /><span className="hidden lg:inline">Cart</span>
              {cartCount > 0 && (
                <span data-testid="nav-cart-count" className="absolute -top-0.5 left-6 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-400 text-slate-900 text-[11px] font-bold grid place-items-center">
                  {cartCount}
                </span>
              )}
            </Link>
          </nav>
        </div>
        <div className="md:hidden px-4 pb-3"><SearchBox /></div>
      </div>
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto no-scrollbar">
          <NavLink to="/products" end className="shrink-0 px-3 py-2.5 text-sm font-medium text-slate-700 hover:text-[#14532d]" data-testid="catbar-all">All products</NavLink>
          {categories.map((c) => (
            <Link key={c.slug} to={`/products?category=${c.slug}`} data-testid={`catbar-${c.slug}`} className="shrink-0 px-3 py-2.5 text-sm text-slate-600 hover:text-[#14532d] whitespace-nowrap">
              {c.name}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
