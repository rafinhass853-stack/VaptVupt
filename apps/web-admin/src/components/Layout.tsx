import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Activity, LayoutDashboard, Map, Package, Bike, Store, Wallet, Bell, LifeBuoy, FileText, Settings, LogOut, Truck, Shield, Menu, X, MapPin } from "lucide-react";
import { useState } from "react";

const groups = [
  { title:"OPERAÇÃO", items:[{to:"/administration",icon:Shield,label:"Administração"},{to:"/",icon:LayoutDashboard,label:"Dashboard",end:true},{to:"/operations",icon:Map,label:"Mapa operacional"},{to:"/orders",icon:Package,label:"Pedidos"},{to:"/couriers",icon:Bike,label:"Entregadores"},{to:"/stores",icon:Store,label:"Lojas"}]},
  { title:"GESTÃO", items:[{to:"/finance",icon:Wallet,label:"Financeiro"},{to:"/analytics",icon:Activity,label:"BI operacional"},{to:"/notifications",icon:Bell,label:"Notificações"},{to:"/support",icon:LifeBuoy,label:"Suporte"},{to:"/audit",icon:FileText,label:"Auditoria"}]},
  { title:"CONFIGURAÇÃO", items:[{to:"/settings",icon:Settings,label:"Configurações"}]}
];

export default function Layout({children}:{children:ReactNode}) {
  const {user,logout}=useAuth(); const navigate=useNavigate(); const [open,setOpen]=useState(false);
  const handleLogout=async()=>{await logout();navigate("/login");};
  return <div className="min-h-screen bg-slate-50 flex">
    <button className="lg:hidden fixed z-50 top-4 left-4 bg-slate-950 text-white p-2.5 rounded-xl shadow-lg" onClick={()=>setOpen(!open)}>{open?<X size={20}/>:<Menu size={20}/>}</button>
    {open && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={()=>setOpen(false)}/>}
    <aside className={`fixed lg:sticky top-0 z-40 h-screen w-72 bg-[#111827] text-white flex flex-col transition-transform ${open?"translate-x-0":"-translate-x-full lg:translate-x-0"}`}>
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="relative bg-[#e30613] p-2.5 rounded-xl shadow-lg shadow-red-950/40">
            <Truck size={23}/>
            <span className="absolute -right-1 -top-1 w-3 h-3 rounded-full bg-[#ffc400] ring-2 ring-[#111827]"/>
          </div>
          <div><h1 className="text-xl font-black tracking-tight">VaptVupt</h1><p className="text-xs text-[#ffc400] font-semibold">Central de Operações</p></div>
        </div>
        <div className="mt-4 flex items-center gap-2 text-[10px] uppercase tracking-[.18em] text-slate-400"><MapPin size={12} className="text-[#ffc400]"/> São Carlos • SP</div>
      </div>
      <div className="px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-3"><div className="bg-[#0057b8]/25 p-2 rounded-lg"><Shield size={16} className="text-[#ffc400]"/></div><div className="min-w-0"><p className="text-[11px] uppercase tracking-wider text-slate-500">Administrador</p><p className="text-sm font-semibold truncate">{user?.email || "Admin"}</p></div></div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">{groups.map(g=><div key={g.title}><p className="px-3 mb-2 text-[10px] font-bold tracking-[.16em] text-slate-500">{g.title}</p><div className="space-y-1">{g.items.map(item=><NavLink key={item.to} to={item.to} end={item.end} onClick={()=>setOpen(false)} className={({isActive})=>`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${isActive?"bg-[#e30613] text-white shadow-lg shadow-red-950/30":"text-slate-300 hover:bg-white/5 hover:text-white"}`}><item.icon size={18}/><span>{item.label}</span></NavLink>)}</div></div>)}</nav>
      <div className="p-4 border-t border-white/10">
        <div className="mb-3 rounded-xl bg-gradient-to-r from-[#0057b8]/30 to-[#168b45]/20 border border-white/10 px-3 py-2.5 text-[11px] text-slate-300"><span className="font-bold text-white">VaptVupt São Carlos</span><br/>Entregas rápidas pela cidade.</div>
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-red-300 hover:bg-red-950/40"><LogOut size={18}/> Sair</button>
      </div>
    </aside>
    <main className="flex-1 min-w-0"><div className="min-h-screen">{children}</div></main>
  </div>;
}