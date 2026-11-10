import { useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg } from "@/lib/api";
import { useStore } from "@/context/Store";
import { Field } from "@/components/site/Fields";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Auth() {
  const { customer, login } = useStore();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const next = params.get("next") || "/account";
  const [l, setL] = useState({ identifier: "", password: "" });
  const [r, setR] = useState({ name: "", email: "", mobile: "", password: "" });
  const [busy, setBusy] = useState(false);
  if (customer) return <Navigate to={next} replace />;

  const go = (path, body) => async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post(path, body);
      login(data.token, data.customer);
      toast.success(`Welcome, ${data.customer.name.split(" ")[0]}!`);
      nav(next);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };
  const Btn = ({ label, testid }) => (
    <button disabled={busy} data-testid={testid} className="w-full h-11 rounded-lg bg-[#14532d] text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50">{busy && <Loader2 className="h-4 w-4 animate-spin" />}{label}</button>
  );

  return (
    <div className="max-w-md mx-auto px-4 py-14" data-testid="auth-page">
      <h1 className="font-display text-3xl font-bold text-center mb-6">Your account</h1>
      <Tabs defaultValue={params.get("tab") || "login"} className="bg-white border border-slate-200 rounded-xl p-5">
        <TabsList className="grid grid-cols-2 w-full mb-5">
          <TabsTrigger value="login" data-testid="auth-tab-login">Login</TabsTrigger>
          <TabsTrigger value="register" data-testid="auth-tab-register">Register</TabsTrigger>
        </TabsList>
        <TabsContent value="login">
          <form onSubmit={go("/auth/login", l)} className="space-y-4">
            <Field label="Email or mobile" id="login-identifier" value={l.identifier} onChange={(e) => setL({ ...l, identifier: e.target.value })} required />
            <Field label="Password" id="login-password" type="password" value={l.password} onChange={(e) => setL({ ...l, password: e.target.value })} required />
            <Btn label="Login" testid="login-submit-button" />
          </form>
        </TabsContent>
        <TabsContent value="register">
          <form onSubmit={go("/auth/register", r)} className="space-y-4">
            <Field label="Full name" id="register-name" value={r.name} onChange={(e) => setR({ ...r, name: e.target.value })} required minLength={2} />
            <Field label="Email" id="register-email" type="email" value={r.email} onChange={(e) => setR({ ...r, email: e.target.value })} required />
            <Field label="Mobile number" id="register-mobile" inputMode="numeric" maxLength={10} pattern="[6-9]\d{9}" title="10-digit mobile number" value={r.mobile} onChange={(e) => setR({ ...r, mobile: e.target.value })} required />
            <Field label="Password (min 6 characters)" id="register-password" type="password" minLength={6} value={r.password} onChange={(e) => setR({ ...r, password: e.target.value })} required />
            <Btn label="Create account" testid="register-submit-button" />
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
