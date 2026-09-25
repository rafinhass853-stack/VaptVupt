import {useEffect,useMemo,useState} from "react";
import {collection,onSnapshot,query,orderBy,limit} from "firebase/firestore";
import {db} from "../lib/firebase";
import {Link} from "react-router-dom";
import {Activity,AlertTriangle,Bike,CheckCircle2,Clock,Map,Package,Store,Wallet,ArrowRight} from "lucide-react";
import LiveMap,{type MapMarker} from "../components/LiveMap";

type Order={id:string;status:string;storeName?:string;pricing?:{totalFee?:number;distanceKm?:number};createdAt:any;assignedDriverId?:string|null};
type Driver={id:string;name?:string;status?:string;lat?:number;lng?:number};
const terminal=["DELIVERED","CANCELLED","FAILED"];
const label=(s:string)=>({PENDING:"Pendente",SEARCHING_DRIVER:"Buscando entregador",OFFERED:"Oferta enviada",ACCEPTED:"Aceito",ARRIVING_PICKUP:"A caminho da coleta",COLLECTED:"Coletado",IN_DELIVERY:"Em entrega",ARRIVING_DESTINATION:"Chegando",DELIVERED:"Entregue",CANCELLED:"Cancelado",FAILED:"Falhou"} as Record<string,string>)[s]||s;
const badge=(s:string)=>s==="DELIVERED"?"bg-emerald-100 text-emerald-700":terminal.includes(s)?"bg-red-100 text-red-700":s==="SEARCHING_DRIVER"||s==="OFFERED"?"bg-amber-100 text-amber-700":"bg-blue-100 text-blue-700";

export default function Dashboard(){
 const [orders,setOrders]=useState<Order[]>([]),[drivers,setDrivers]=useState<Driver[]>([]);
 useEffect(()=>onSnapshot(query(collection(db,"orders"),orderBy("createdAt","desc"),limit(100)),s=>setOrders(s.docs.map(d=>({id:d.id,...d.data()} as Order)))),[]);
 useEffect(()=>onSnapshot(collection(db,"drivers"),s=>setDrivers(s.docs.map(d=>({id:d.id,...d.data()} as Driver)))),[]);
 const active=orders.filter(o=>!terminal.includes(o.status)), searching=orders.filter(o=>["SEARCHING_DRIVER","OFFERED"].includes(o.status));
 const today=useMemo(()=>{const d=new Date();d.setHours(0,0,0,0);return orders.filter(o=>o.createdAt?.toDate?.()?.getTime()>=d.getTime())},[orders]);
 const deliveredToday=today.filter(o=>o.status==="DELIVERED");
 const revenue=deliveredToday.reduce((n,o)=>n+(o.pricing?.totalFee||0),0);
 const markers:MapMarker[]=drivers.filter(d=>typeof d.lat==="number"&&typeof d.lng==="number").map(d=>({id:d.id,lat:d.lat!,lng:d.lng!,name:d.name||"Entregador",status:d.status||"OFFLINE",type:"driver"}));
 const alerts=[...searching.map(o=>({id:o.id,title:`Pedido #${o.id.slice(0,8)} precisa de atenção`,desc:o.status==="OFFERED"?"Oferta enviada ao entregador":"Procurando entregador"})),...active.filter(o=>{const t=o.createdAt?.toDate?.();return t&&Date.now()-t.getTime()>45*60*1000}).map(o=>({id:o.id,title:`Pedido #${o.id.slice(0,8)} atrasado`,desc:label(o.status)}))].slice(0,6);
 return <div className="p-4 sm:p-6 lg:p-8 max-w-[1800px] mx-auto">
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7"><div><p className="text-sm font-semibold text-blue-600">Central de Operações</p><h1 className="text-3xl font-bold text-slate-900 mt-1">Dashboard</h1><p className="text-slate-500 mt-1">Visão em tempo real da operação VaptVupt.</p></div><Link to="/operations" className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-slate-800"><Map size={18}/> Abrir mapa</Link></div>
  <div className="grid grid-cols-2 xl:grid-cols-5 gap-4 mb-6"><Stat icon={Package} label="Pedidos hoje" value={today.length} tone="blue"/><Stat icon={Activity} label="Em andamento" value={active.length} tone="amber"/><Stat icon={Bike} label="Entregadores online" value={drivers.filter(d=>d.status==="ONLINE").length} tone="green"/><Stat icon={Clock} label="Buscando entregador" value={searching.length} tone="orange"/><Stat icon={Wallet} label="Fretes entregues hoje" value={`R$ ${revenue.toFixed(2)}`} tone="purple"/></div>
  <div className="grid xl:grid-cols-[1.6fr_.9fr] gap-6">
   <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden min-h-[520px]"><div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between"><div><h2 className="font-bold text-slate-900">Operação em tempo real</h2><p className="text-xs text-slate-500 mt-0.5">{markers.length} localizações ativas</p></div><Link to="/operations" className="text-sm text-blue-600 font-semibold">Ver mapa completo</Link></div><div className="h-[460px]"><LiveMap markers={markers}/></div></div>
   <div className="space-y-6">
    <div className="bg-white rounded-2xl border border-slate-200"><div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between"><div><h2 className="font-bold">Alertas operacionais</h2><p className="text-xs text-slate-500">Itens que merecem atenção</p></div><AlertTriangle className="text-amber-500" size={20}/></div>{alerts.length===0?<div className="p-8 text-center text-sm text-slate-500"><CheckCircle2 className="mx-auto text-emerald-500 mb-2" size={28}/>Tudo tranquilo por enquanto.</div>:<div className="divide-y divide-slate-100">{alerts.map(a=><Link key={a.id} to="/orders" className="block p-4 hover:bg-slate-50"><p className="text-sm font-semibold text-slate-800">{a.title}</p><p className="text-xs text-slate-500 mt-1">{a.desc}</p></Link>)}</div>}</div>
    <div className="bg-white rounded-2xl border border-slate-200"><div className="px-5 py-4 border-b border-slate-200 flex justify-between"><h2 className="font-bold">Pedidos recentes</h2><Link to="/orders" className="text-sm text-blue-600 font-semibold">Ver todos</Link></div><div className="divide-y divide-slate-100">{orders.slice(0,7).map(o=><Link key={o.id} to="/orders" className="flex items-center gap-3 p-4 hover:bg-slate-50"><div className="p-2 rounded-lg bg-slate-100"><Package size={16}/></div><div className="flex-1 min-w-0"><p className="text-sm font-semibold truncate">#{o.id.slice(0,8)} · {o.storeName||"Loja"}</p><p className="text-xs text-slate-500">{o.pricing?.distanceKm?.toFixed?.(1)||"—"} km</p></div><span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${badge(o.status)}`}>{label(o.status)}</span></Link>)}</div></div>
   </div>
  </div>
  <div className="grid md:grid-cols-3 gap-4 mt-6"><Quick to="/orders" icon={Package} title="Central de pedidos" text="Filtros, timeline e detalhes"/><Quick to="/couriers" icon={Bike} title="Entregadores" text="Disponibilidade e histórico"/><Quick to="/stores" icon={Store} title="Lojas" text="Operação e relacionamento"/></div>
 </div>;
}
function Stat({icon:Icon,label,value,tone}:{icon:any;label:string;value:any;tone:string}){const c:any={blue:"bg-blue-50 text-blue-600",amber:"bg-amber-50 text-amber-600",green:"bg-emerald-50 text-emerald-600",orange:"bg-orange-50 text-orange-600",purple:"bg-purple-50 text-purple-600"};return <div className="bg-white border border-slate-200 rounded-2xl p-4"><div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c[tone]}`}><Icon size={20}/></div><p className="text-xs text-slate-500 mt-3">{label}</p><p className="text-2xl font-bold text-slate-900 mt-1">{value}</p></div>}
function Quick({to,icon:Icon,title,text}:{to:string;icon:any;title:string;text:string}){return <Link to={to} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-300 hover:shadow-sm flex items-center gap-4"><div className="p-3 rounded-xl bg-slate-100"><Icon size={20}/></div><div className="flex-1"><p className="font-bold text-slate-900">{title}</p><p className="text-xs text-slate-500 mt-1">{text}</p></div><ArrowRight size={18} className="text-slate-400"/></Link>}
