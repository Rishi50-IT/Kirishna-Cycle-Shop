import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg } from "@/lib/api";
import { Logo } from "@/components/site/Header";
import { Field } from "@/components/site/Fields";

export default function AdminLogin() {
  const [f, setF] = useState({ email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  if (localStorage.getItem("kcs_admin_token")) return <Navigate to="/admin" replace />;
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post("/admin/login", f);
      localStorage.setItem("kcs_admin_token", data.token);
      nav("/admin");
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="min-h-screen bg-[#14532d] grid place-items-center px-4" data-testid="admin-login-page">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex justify-center"><Logo /></div>
        <form onSubmit={submit} className="bg-white rounded-xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-2"><Lock className="h-4 w-4 text-[#14532d]" /><h1 className="font-semibold">Admin login</h1></div>
          <Field label="Email" id="admin-email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required />
          <Field label="Password" id="admin-password" type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required />
          <button disabled={busy} data-testid="admin-login-submit" className="w-full h-11 rounded-lg bg-[#14532d] text-white font-semibold flex items-center justify-center gap-2">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Sign in</button>
        </form>
      </div>
    </div>
  );
}
