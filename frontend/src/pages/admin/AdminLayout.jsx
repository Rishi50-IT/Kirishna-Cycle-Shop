import { useEffect, useState } from "react";
import { Link, NavLink, Navigate, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, Package, ShoppingBag, Users, Wallet, Settings, LogOut, Store, Menu } from "lucide-react";
import { api } from "@/lib/api";
import { Logo } from "@/components/site/Header";

const NAV = [
  ["/admin", "Dashboard", LayoutDashboard, true],
  ["/admin/orders", "Orders", ShoppingBag],
  ["/admin/products", "Products", Package],
  ["/admin/payments", "Payments", Wallet],
  ["/admin/customers", "Customers", Users],
  ["/admin/settings", "Settings", Settings],
];

export const PageHead = ({ title, sub, children }) => (
  <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
    <div><h1 className="text-2xl font-semibold text-slate-900">{title}</h1>{sub && <p className="text-sm text-slate-500 mt-0.5">{sub}</p>}</div>
    <div className="flex flex-wrap gap-2">{children}</div>
  </div>
);

export default function AdminLayout() {
  const [admin, setAdmin] = useState(null);
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const token = localStorage.getItem("kcs_admin_token");
  useEffect(() => {
    if (token) api.get("/admin/me").then((r) => setAdmin(r.data)).catch(() => {});
  }, [token]);
  if (!token) return <Navigate to="/admin/login" replace />;
  if (!admin) return <p className="p-10 text-center text-sm text-slate-500">Loading admin…</p>;
  const logout = () => {
    localStorage.removeItem("kcs_admin_token");
    nav("/admin/login");
  };
  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[240px_1fr]" data-testid="admin-layout">
      <aside className={`${open ? "block" : "hidden"} lg:block bg-slate-900 text-slate-300 lg:min-h-screen lg:sticky lg:top-0 lg:h-screen p-4 space-y-6`}>
        <div className="px-2 pt-2"><Logo /></div>
        <nav className="space-y-1">
          {NAV.map(([to, label, Icon, end]) => (
            <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)} data-testid={`admin-nav-${label.toLowerCase()}`}
              className={({ isActive }) => `flex items-center gap-3 px-3 h-10 rounded-md text-sm ${isActive ? "bg-[#14532d] text-white" : "hover:bg-slate-800 hover:text-white"}`}>
              <Icon className="h-4 w-4" />{label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-800 pt-4 space-y-1">
          <Link to="/" className="flex items-center gap-3 px-3 h-10 rounded-md text-sm hover:bg-slate-800" data-testid="admin-view-store"><Store className="h-4 w-4" />View store</Link>
          <button onClick={logout} className="w-full flex items-center gap-3 px-3 h-10 rounded-md text-sm hover:bg-slate-800" data-testid="admin-logout"><LogOut className="h-4 w-4" />Logout</button>
          <p className="px-3 pt-2 text-[11px] text-slate-500 break-all">{admin.email}</p>
        </div>
      </aside>
      <div className="min-w-0">
        <div className="lg:hidden bg-slate-900 px-4 h-14 flex items-center justify-between">
          <Logo />
          <button onClick={() => setOpen(!open)} className="text-white" data-testid="admin-menu-toggle" aria-label="Menu"><Menu className="h-6 w-6" /></button>
        </div>
        <main className="p-4 sm:p-6 lg:p-8 max-w-[1400px]"><Outlet /></main>
      </div>
    </div>
  );
}
