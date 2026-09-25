import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Activity, LayoutDashboard, Map, Package, Bike, Store, Wallet, Bell, LifeBuoy, FileText, Settings, LogOut, Truck, Shield, Menu, X } from "lucide-react";
import { useState } from "react";

const groups = [
  { title:"OPERAÇÃO", items:[{to:"/",icon:LayoutDashboard,label:"Dashboard",end:true},{to:"/operations",icon:Map,label:"Mapa operacional"},{to:"/orders",icon:Package,label:"Pedidos"},{to:"/couriers",icon:Bike,label:"Entregadores"},{to:"/stores",icon:Store,label:"Lojas"}]},
  { title:"GESTÃO", items:[{to:"/finance",icon:Wallet,label:"Financeiro"},{to:"/analytics",icon:Activity,label:"BI operacional"},{to:"/notifications",icon:Bell,label:"Notificações"},{to:"/support",icon:LifeBuoy,label:"Suporte"},{to:"/audit",icon:FileText,label:"Auditoria"}]},
  { title:"CONFIGURAÇÃO", items:[{to:"/settings",icon:Settings,label:"Configurações"}]}
];

export default function Layout({children}:{children:ReactNode}) {
  const {user,logout}=useAuth(); const navigate=useNavigate(); const [open,setOpen]=useState(false);
  const handleLogout=async()=>{await logout();navigate("/login");};
  return <div className="min-h-screen bg-slate-50 flex">
    <button className="lg:hidden fixed z-50 top-4 left-4 bg-slate-900 text-white p-2.5 rounded-xl shadow-lg" onClick={()=>setOpen(!open)}>{open?<X size={20}/>:<Menu size={20}/>}</button>
    {open && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={()=>setOpen(false)}/>}
    <aside className={`fixed lg:sticky top-0 z-40 h-screen w-72 bg-slate-950 text-white flex flex-col transition-transform ${open?"translate-x-0":"-translate-x-full lg:translate-x-0"}`}>
      <div className="px-6 py-5 border-b border-slate-800"><div className="flex items-center gap-3"><div className="bg-blue-600 p-2.5 rounded-xl"><Truck size={23}/></div><div><h1 className="text-xl font-bold">VaptVupt</h1><p className="text-xs text-blue-300">Central de Operações</p></div></div></div>
      <div className="px-5 py-4 border-b border-slate-800"><div className="flex items-center gap-3"><div className="bg-emerald-500/15 p-2 rounded-lg"><Shield size={16} className="text-emerald-400"/></div><div className="min-w-0"><p className="text-[11px] uppercase tracking-wider text-slate-500">Administrador</p><p className="text-sm font-semibold truncate">{user?.email || "Admin"}</p></div></div></div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">{groups.map(g=><div key={g.title}><p className="px-3 mb-2 text-[10px] font-bold tracking-[.16em] text-slate-500">{g.title}</p><div className="space-y-1">{g.items.map(item=><NavLink key={item.to} to={item.to} end={item.end} onClick={()=>setOpen(false)} className={({isActive})=>`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${isActive?"bg-blue-600 text-white shadow-lg shadow-blue-950/30":"text-slate-300 hover:bg-slate-900 hover:text-white"}`}><item.icon size={18}/><span>{item.label}</span></NavLink>)}</div></div>)}</nav>
      <div className="p-4 border-t border-slate-800"><button onClick={handleLogout} className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-red-300 hover:bg-red-950/40"><LogOut size={18}/> Sair</button></div>
    </aside>
    <main className="flex-1 min-w-0"><div className="min-h-screen">{children}</div></main>
  </div>;
}