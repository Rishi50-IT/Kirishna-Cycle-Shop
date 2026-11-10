import { QRCodeSVG } from "qrcode.react";
import { Copy, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { img, inr } from "@/lib/api";

export const upiLink = (s, amount, note) =>
  `upi://pay?pa=${encodeURIComponent(s.upi_id)}&pn=${encodeURIComponent(s.upi_payee_name)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;

export default function UpiPay({ settings, amount, note, utr, setUtr, showInput = true }) {
  if (!settings) return null;
  const link = upiLink(settings, amount, note);
  const copy = () => {
    navigator.clipboard?.writeText(settings.upi_id);
    toast.success("UPI ID copied");
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm" data-testid="upi-pay-card">
      <div className="flex flex-col sm:flex-row gap-5 items-center">
        <div className="p-3 rounded-lg border border-slate-200 bg-white shrink-0" data-testid="upi-qr">
          {settings.upi_qr_image ? (
            <img src={img(settings.upi_qr_image)} alt="Shop UPI QR code" className="h-44 w-44 object-contain" />
          ) : (
            <QRCodeSVG value={link} size={176} level="M" />
          )}
        </div>
        <div className="flex-1 w-full space-y-3">
          <div>
            <p className="text-xs text-slate-500">Amount to pay now</p>
            <p className="text-3xl font-bold text-[#14532d] tnum" data-testid="upi-amount">{inr(amount)}</p>
          </div>
          <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
            <div className="min-w-0">
              <p className="text-[11px] text-slate-500">UPI ID</p>
              <p className="text-sm font-semibold truncate" data-testid="upi-id">{settings.upi_id}</p>
            </div>
            <button type="button" onClick={copy} data-testid="upi-copy-button" className="h-8 px-2 rounded-md text-xs font-medium text-[#14532d] hover:bg-green-50 flex items-center gap-1"><Copy className="h-3.5 w-3.5" />Copy</button>
          </div>
          <a href={link} data-testid="upi-open-app" className="sm:hidden flex items-center justify-center gap-2 h-10 rounded-lg border border-[#14532d] text-[#14532d] text-sm font-medium">
            <Smartphone className="h-4 w-4" /> Pay with UPI app
          </a>
          <p className="text-xs text-slate-500">Scan with GPay, PhonePe, Paytm or any UPI app. Payee: {settings.upi_payee_name}.</p>
        </div>
      </div>
      {showInput && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <label className="text-sm font-medium text-slate-800" htmlFor="utr">UPI transaction reference (UTR)</label>
          <input id="utr" data-testid="upi-utr-input" value={utr} onChange={(e) => setUtr(e.target.value.replace(/\s/g, ""))}
            placeholder="12-digit reference e.g. 412345678901" maxLength={22}
            className="mt-1.5 w-full h-11 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-[#14532d]/40 tnum" />
          <p className="mt-1.5 text-xs text-slate-500">Find it in your UPI app's payment history. You can also add it later from the order tracking page. Our team verifies every payment before confirming your order.</p>
        </div>
      )}
    </div>
  );
}
