import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { LogIn, AlertCircle, MapPin, Truck } from "lucide-react";
import { Button } from "@vaptvupt/shared-ui";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); setError(""); setLoading(true); try { await login(email, password); } catch (err: any) { setError(err.code === "auth/invalid-credential" ? "E-mail ou senha incorretos" : err.message || "Erro ao fazer login"); } finally { setLoading(false); } };
  return (
    <div className="min-h-screen bg-[#111827] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(0,87,184,.32),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(227,6,19,.22),transparent_42%)]"/>
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full border-[32px] border-[#ffc400]/10"/>
      <div className="absolute -bottom-40 -left-20 w-96 h-96 rounded-full bg-[#e30613]/10"/>
      <div className="bg-white rounded-[28px] shadow-2xl p-10 w-full max-w-md relative z-10 border-t-4 border-[#e30613]">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center bg-gradient-to-br from-[#e30613] to-[#9f0710] text-white w-16 h-16 rounded-2xl mb-4 shadow-lg shadow-red-900/30 relative">
            <Truck size={32} strokeWidth={2.5}/><span className="absolute -right-1 -top-1 w-4 h-4 rounded-full bg-[#ffc400]"/>
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">VaptVupt</h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">Painel Administrativo</p>
          <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[#0057b8]"><MapPin size={13}/> São Carlos • SP</div>
        </div>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-5 flex items-start gap-2 text-sm"><AlertCircle size={18} className="flex-shrink-0 mt-0.5"/><span>{error}</span></div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">E-mail</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm transition" placeholder="admin@vaptvupt.com"/></div>
          <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Senha</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm transition" placeholder="••••••••"/></div>
          <Button type="submit" variant="primary" size="lg" loading={loading} fullWidth icon={!loading && <LogIn size={20}/>}>{loading ? "Entrando..." : "Entrar"}</Button>
        </form>
        <p className="text-center text-xs text-slate-400 mt-6">Acesso restrito a administradores</p>
      </div>
    </div>
  );
}