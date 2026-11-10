import { Link } from "react-router-dom";
import { Phone, Mail, MessageCircle, MapPin } from "lucide-react";
import { useStore } from "@/context/Store";
import { Logo } from "@/components/site/Header";

export default function Footer() {
  const { settings, categories } = useStore();
  const phone = settings?.phone || "9508668053";
  return (
    <footer className="bg-slate-900 text-slate-400 mt-20" id="contact" data-testid="site-footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Logo />
          <p className="text-sm leading-relaxed">Bicycles, accessories and genuine spare parts for every rider in the family.</p>
        </div>
        <div>
          <h4 className="text-white text-sm font-semibold mb-4">Shop</h4>
          <ul className="space-y-2 text-sm">
            {categories.slice(0, 6).map((c) => (
              <li key={c.slug}><Link className="hover:text-white" to={`/products?category=${c.slug}`}>{c.name}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-white text-sm font-semibold mb-4">Help</h4>
          <ul className="space-y-2 text-sm">
            <li><Link className="hover:text-white" to="/track">Track your order</Link></li>
            <li><Link className="hover:text-white" to="/account">My account</Link></li>
            <li><Link className="hover:text-white" to="/cart">Cart</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white text-sm font-semibold mb-4">Contact us</h4>
          <ul className="space-y-3 text-sm">
            <li><a data-testid="footer-phone" className="flex gap-2 hover:text-white" href={`tel:+91${phone}`}><Phone className="h-4 w-4 mt-0.5" />+91 {phone}</a></li>
            <li><a data-testid="footer-whatsapp" className="flex gap-2 hover:text-white" href={`https://wa.me/91${settings?.whatsapp || phone}`} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4 mt-0.5" />WhatsApp +91 {settings?.whatsapp || phone}</a></li>
            <li><a data-testid="footer-email" className="flex gap-2 hover:text-white break-all" href={`mailto:${settings?.email || "kumarkirishna5777@gmail.com"}`}><Mail className="h-4 w-4 mt-0.5 shrink-0" />{settings?.email || "kumarkirishna5777@gmail.com"}</a></li>
            {settings?.address && <li className="flex gap-2"><MapPin className="h-4 w-4 mt-0.5 shrink-0" />{settings.address}</li>}
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-800 py-5 text-center text-xs">© {new Date().getFullYear()} Kirishna Cycle Shop. All prices in Indian Rupees (₹).</div>
    </footer>
  );
}
