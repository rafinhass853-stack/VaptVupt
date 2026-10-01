import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../lib/firebase";
import { Bike, Store, Package, Wallet, CheckCircle2, Clock } from "lucide-react";
import LiveMap, { type MapMarker } from "../components/LiveMap";

type Tab="overview"|"drivers"|"stores"|"orders"|"finance"|"pricing";
const money=(v:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(v||0);
const date=(v:any)=>v?.toDate? v.toDate().toLocaleString("pt-BR"):v?new Date(v).toLocaleString("pt-BR"):"—";

export default function Administration(){
 const [tab,setTab]=useState<Tab>("overview");
 const [drivers,setDrivers]=useState<any[]>([]);
 const [stores,setStores]=useState<any[]>([]);
 const [orders,setOrders]=useState<any[]>([]);
 const [payouts,setPayouts]=useState<any[]>([]);
 const [pricing,setPricing]=useState<any>({});
 useEffect(()=>onSnapshot(collection(db,"drivers"),s=>setDrivers(s.docs.map(d=>({id:d.id,...d.data()})))),[]);
 useEffect(()=>onSnapshot(collection(db,"stores"),s=>setStores(s.docs.map(d=>({id:d.id,...d.data()})))),[]);
 useEffect(()=>onSnapshot(query(collection(db,"orders"),orderBy("createdAt","desc"),limit(500)),s=>setOrders(s.docs.map(d=>({id:d.id,...d.data()})))),[]);
 useEffect(()=>onSnapshot(query(collection(db,"driverPayouts"),orderBy("createdAt","desc"),limit(200)),s=>setPayouts(s.docs.map(d=>({id:d.id,...d.data()})))),[]);
 useEffect(()=>onSnapshot(collection(db,"settings"),s=>{const p=s.docs.find(d=>d.id==="pricing");if(p)setPricing(p.data())}),[]);

 const onlineDrivers=drivers.filter(d=>(d.status==="ONLINE"||d.driverStatus==="ONLINE")&&!d.blocked);
 const activeOrders=orders.filter(o=>!["DELIVERED","CANCELLED","FAILED"].includes(o.status));
 const delivered=orders.filter(o=>o.status==="DELIVERED");
 const commission=delivered.reduce((n,o)=>n+Number(o.finance?.platformFee??o.pricing?.platformFee??0),0);
 const markers:MapMarker[]=onlineDrivers.filter(d=>Number.isFinite(d.lat)&&Number.isFinite(d.lng)).map(d=>({id:d.id,lat:d.lat,lng:d.lng,name:d.name||d.fullName||"Motoboy",status:d.status||d.driverStatus||"ONLINE",type:"driver"}));

 const tabs=[["overview","Visão geral"],["drivers","Motoboys"],["stores","Lojas"],["orders","Entregas"],["finance","Financeiro"],["pricing","Preços"] ] as const;
 return <div className="p-5 lg:p-8 max-w-[1800px] mx-auto">
  <div className="mb-6"><p className="text-sm font-semibold text-blue-600">Controle administrativo total</p><h1 className="text-3xl font-bold text-slate-900">Administração</h1><p className="text-slate-500 mt-1">Cadastros, operação, localização, entregas, saldos, repasses e regras de preço.</p></div>
  <div className="flex gap-2 overflow-x-auto mb-6">{tabs.map(([id,label])=><button key={id} onClick={()=>setTab(id)} className={`px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap ${tab===id?"bg-slate-900 text-white":"bg-white border border-slate-200 text-slate-600"}`}>{label}</button>)}</div>
  {tab==="overview"&&<section>
   <div className="grid grid-cols-2 xl:grid-cols-6 gap-4 mb-6">
    <Kpi icon={Bike} label="Motoboys online" value={onlineDrivers.length}/>
    <Kpi icon={Store} label="Lojas cadastradas" value={stores.length}/>
    <Kpi icon={Package} label="Entregas ativas" value={activeOrders.length}/>
    <Kpi icon={CheckCircle2} label="Entregas concluídas" value={delivered.length}/>
    <Kpi icon={Wallet} label="Comissão acumulada" value={money(commission)}/>
    <Kpi icon={Clock} label="Repasses pendentes" value={payouts.filter(p=>p.status!=="PAID").length}/>
   </div>
   <div className="grid xl:grid-cols-[1.7fr_.8fr] gap-6">
    <Panel title="Localização dos motoboys online"><div className="h-[560px]"><LiveMap markers={markers}/></div></Panel>
    <div className="space-y-4"><Panel title="Aprovações pendentes">{drivers.filter(d=>d.approved===false||d.approvalStatus==="PENDING").slice(0,8).map(d=><Person key={d.id} name={d.name||d.fullName} meta="Cadastro aguardando análise"/>)}</Panel><Panel title="Lojas com saldo baixo">{stores.filter(s=>Number(s.balance||0)<Number(s.minimumBalance||20)).slice(0,8).map(s=><Person key={s.id} name={s.name} meta={`Saldo ${money(s.balance)}`}/>)}</Panel></div>
   </div>
  </section>}
  {tab==="drivers"&&<DriverManager drivers={drivers}/>}
  {tab==="stores"&&<StoreManager stores={stores}/>}
  {tab==="orders"&&<OrderManager orders={orders} drivers={drivers} stores={stores}/>}
  {tab==="finance"&&<FinanceManager payouts={payouts} commission={commission}/>}
  {tab==="pricing"&&<PricingManager pricing={pricing}/>}
 </div>;
}
function Kpi({icon:Icon,label,value}:{icon:any;label:string;value:any}){return <div className="bg-white border border-slate-200 rounded-2xl p-4"><Icon size={20} className="text-blue-600"/><p className="text-xs text-slate-500 mt-3">{label}</p><p className="text-xl font-bold text-slate-900 mt-1">{value}</p></div>}
function Panel({title,children}:{title:string;children:any}){return <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden"><div className="px-5 py-4 border-b border-slate-200 font-bold">{title}</div>{children}</div>}
function Person({name,meta}:{name:string;meta:string}){return <div className="px-5 py-3 border-b border-slate-100"><p className="font-semibold text-sm">{name||"Sem nome"}</p><p className="text-xs text-slate-500">{meta}</p></div>}

function DriverManager({drivers}:{drivers:any[]}){
 const approve=httpsCallable(functions,"approveDriver"); const block=httpsCallable(functions,"setDriverBlocked");
 const pending=drivers.filter(d=>d.approved===false||d.approvalStatus==="PENDING");
 const online=drivers.filter(d=>(d.status==="ONLINE"||d.driverStatus==="ONLINE")&&!d.blocked);
 return <div className="space-y-6"><div className="grid md:grid-cols-3 gap-4"><Kpi icon={Bike} label="Total" value={drivers.length}/><Kpi icon={CheckCircle2} label="Online" value={online.length}/><Kpi icon={Clock} label="Aguardando aprovação" value={pending.length}/></div>
 <Panel title="Motoboys e status"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50"><tr>{["Motoboy","Veículo","Status","Localização","Aprovação","Ações"].map(x=><th key={x} className="text-left px-4 py-3">{x}</th>)}</tr></thead><tbody>{drivers.map(d=><tr key={d.id} className="border-t border-slate-100"><td className="px-4 py-3 font-semibold">{d.name||d.fullName||"—"}<div className="text-xs text-slate-500">{d.cpf||"CPF não informado"}</div></td><td className="px-4 py-3">{d.vehicle?.type||d.vehicleType||"—"} {d.plate||d.vehicle?.plate||""}</td><td className="px-4 py-3">{d.blocked?"BLOQUEADO":(d.status||d.driverStatus||"OFFLINE")}</td><td className="px-4 py-3">{Number.isFinite(d.lat)&&Number.isFinite(d.lng)?`${Number(d.lat).toFixed(5)}, ${Number(d.lng).toFixed(5)}`:"—"}</td><td className="px-4 py-3">{d.approved===false||d.approvalStatus==="PENDING"?"PENDENTE":"APROVADO"}</td><td className="px-4 py-3 flex gap-2">{(d.approved===false||d.approvalStatus==="PENDING")&&<button onClick={()=>approve({driverId:d.id,approved:true})} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white">Aprovar</button>}<button onClick={()=>block({driverId:d.id,blocked:!d.blocked})} className="px-3 py-1.5 rounded-lg bg-slate-100">{d.blocked?"Desbloquear":"Bloquear"}</button></td></tr>)}</tbody></table></div></Panel></div>
}
function StoreManager({stores}:{stores:any[]}){
 return <div className="space-y-6"><div className="grid md:grid-cols-3 gap-4"><Kpi icon={Store} label="Lojas" value={stores.length}/><Kpi icon={CheckCircle2} label="Online" value={stores.filter(s=>s.online).length}/><Kpi icon={Wallet} label="Saldo total" value={money(stores.reduce((n,s)=>n+Number(s.balance||0),0))}/></div><Panel title="Lojas e saldos"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50"><tr>{["Loja","Slug","Online","Saldo","Endereço"].map(x=><th key={x} className="text-left px-4 py-3">{x}</th>)}</tr></thead><tbody>{stores.map(s=><tr key={s.id} className="border-t border-slate-100"><td className="px-4 py-3 font-semibold">{s.name}</td><td className="px-4 py-3 font-mono text-xs">/{s.slug}</td><td className="px-4 py-3">{s.online?"ONLINE":"OFFLINE"}</td><td className={`px-4 py-3 font-bold ${Number(s.balance||0)<=0?"text-red-600":"text-emerald-600"}`}>{money(s.balance)}</td><td className="px-4 py-3 text-slate-500">{[s.address?.street,s.address?.number,s.address?.neighborhood,s.address?.city,s.address?.zipCode||s.address?.cep].filter(Boolean).join(", ")||"—"}</td></tr>)}</tbody></table></div></Panel></div>
}
function OrderManager({orders,drivers,stores}:{orders:any[];drivers:any[];stores:any[]}){
 return <Panel title="Gestão de entregas"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50"><tr>{["Pedido","Loja","Motoboy","Status","Valor cobrado","Pagar motoboy","Comissão","Criado em"].map(x=><th key={x} className="text-left px-4 py-3">{x}</th>)}</tr></thead><tbody>{orders.map(o=>{const d=drivers.find(x=>x.id===o.assignedDriverId);const s=stores.find(x=>x.id===o.storeId);const total=Number(o.pricing?.totalFee||0), payout=Number(o.finance?.driverPayout??o.pricing?.driverPayout??0), comm=Number(o.finance?.platformFee??o.pricing?.platformFee??total-payout);return <tr key={o.id} className="border-t border-slate-100"><td className="px-4 py-3 font-mono">#{o.id.slice(0,8)}</td><td className="px-4 py-3">{s?.name||o.storeName||"—"}</td><td className="px-4 py-3">{d?.name||d?.fullName||"—"}</td><td className="px-4 py-3">{o.status}</td><td className="px-4 py-3">{money(total)}</td><td className="px-4 py-3">{money(payout)}</td><td className="px-4 py-3">{money(comm)}</td><td className="px-4 py-3">{date(o.createdAt)}</td></tr>})}</tbody></table></div></Panel>
}
function FinanceManager({payouts,commission}:{payouts:any[];commission:number}){
 const mark=httpsCallable(functions,"markDriverPayoutPaid");
 return <div className="space-y-6"><div className="grid md:grid-cols-3 gap-4"><Kpi icon={Wallet} label="Minha comissão" value={money(commission)}/><Kpi icon={Clock} label="A pagar" value={money(payouts.filter(p=>p.status!=="PAID").reduce((n,p)=>n+Number(p.amount||0),0))}/><Kpi icon={CheckCircle2} label="Já pagos" value={money(payouts.filter(p=>p.status==="PAID").reduce((n,p)=>n+Number(p.amount||0),0))}/></div><Panel title="Histórico de repasses aos motoboys"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50"><tr>{["Motoboy","Período","Valor","Status","PIX","Detalhes"].map(x=><th key={x} className="text-left px-4 py-3">{x}</th>)}</tr></thead><tbody>{payouts.map(p=><tr key={p.id} className="border-t border-slate-100"><td className="px-4 py-3">{p.driverName||p.driverId}</td><td className="px-4 py-3">{p.periodKey||"—"}</td><td className="px-4 py-3 font-bold">{money(p.amount)}</td><td className="px-4 py-3">{p.status}</td><td className="px-4 py-3 text-xs">{p.pixKey||"—"}</td><td className="px-4 py-3">{p.status!=="PAID"&&<button onClick={()=>mark({payoutId:p.id})} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white">Marcar PIX pago</button>}</td></tr>)}</tbody></table></div></Panel></div>
}
function PricingManager({pricing}:{pricing:any}){
 const [form,setForm]=useState({mode:pricing.mode||"NORMAL",baseFee:Number(pricing.baseFee||0),minimumFee:Number(pricing.minimumFee||0),baseKm:Number(pricing.baseKm||3),perKmFee:Number(pricing.perKmFee||0),extraStopFee:Number(pricing.extraStopFee||0),driverBase:Number(pricing.driverBase||0),driverPerKm:Number(pricing.driverPerKm||0),driverExtraStop:Number(pricing.driverExtraStop||0),platformPercent:Number(pricing.platformPercent||0),dynamicMultiplier:Number(pricing.dynamicMultiplier||1)});
 useEffect(()=>setForm({mode:pricing.mode||"NORMAL",baseFee:Number(pricing.baseFee||0),minimumFee:Number(pricing.minimumFee||0),baseKm:Number(pricing.baseKm||3),perKmFee:Number(pricing.perKmFee||0),extraStopFee:Number(pricing.extraStopFee||0),driverBase:Number(pricing.driverBase||0),driverPerKm:Number(pricing.driverPerKm||0),driverExtraStop:Number(pricing.driverExtraStop||0),platformPercent:Number(pricing.platformPercent||0),dynamicMultiplier:Number(pricing.dynamicMultiplier||1)}),[pricing]);
 const save=httpsCallable(functions,"updatePricingSettings");
 const fields=[["baseFee","Valor base cobrado"],["minimumFee","Mínimo cobrado"],["baseKm","Km incluídos"],["perKmFee","Valor por km cobrado"],["extraStopFee","Valor por parada extra cobrado"],["driverBase","Valor base do motoboy"],["driverPerKm","Valor por km do motoboy"],["driverExtraStop","Valor por parada extra do motoboy"],["platformPercent","Comissão (%)"],["dynamicMultiplier","Multiplicador dinâmico"]];
 return <Panel title="Ajuste de preço normal ou dinâmico"><div className="p-5 grid md:grid-cols-2 gap-4"><label className="text-sm font-semibold">Modo<select value={form.mode} onChange={e=>setForm({...form,mode:e.target.value})} className="mt-1 w-full border rounded-lg p-2.5"><option value="NORMAL">Normal</option><option value="DYNAMIC">Dinâmico</option></select></label>{fields.map(([k,l])=><label key={k} className="text-sm font-semibold">{l}<input type="number" step="0.01" value={(form as any)[k]} onChange={e=>setForm({...form,[k]:Number(e.target.value)})} className="mt-1 w-full border rounded-lg p-2.5"/></label>)}<button onClick={()=>save(form)} className="md:col-span-2 bg-blue-600 text-white rounded-xl py-3 font-semibold">Salvar regras de preço</button></div></Panel>
}
