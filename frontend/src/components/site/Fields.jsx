import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Field = ({ label, id, error, className = "", ...props }) => (
  <div className={className}>
    <Label htmlFor={id} className="text-sm text-slate-700">{label}</Label>
    <Input id={id} data-testid={`${id}-input`} className="mt-1.5 h-11" {...props} />
    {error && <p className="text-xs text-red-700 mt-1">{error}</p>}
  </div>
);

export const EMPTY_ADDRESS = { line1: "", line2: "", landmark: "", city: "", state: "", pincode: "" };

export default function AddressFields({ value, onChange, prefix = "addr" }) {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <Field className="sm:col-span-2" label="House no., street, area" id={`${prefix}-line1`} value={value.line1} onChange={set("line1")} required minLength={3} />
      <Field label="Locality (optional)" id={`${prefix}-line2`} value={value.line2 || ""} onChange={set("line2")} />
      <Field label="Landmark (optional)" id={`${prefix}-landmark`} value={value.landmark || ""} onChange={set("landmark")} />
      <Field label="City" id={`${prefix}-city`} value={value.city} onChange={set("city")} required />
      <Field label="State" id={`${prefix}-state`} value={value.state} onChange={set("state")} required />
      <Field label="PIN code" id={`${prefix}-pincode`} value={value.pincode} onChange={set("pincode")} required pattern="\d{6}" inputMode="numeric" maxLength={6} title="6-digit PIN code" />
    </div>
  );
}
