import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
if (!admin.apps.length) admin.initializeApp();
const db=admin.firestore();
const isAdmin=(a:any)=>!!a&&a.token?.role==="admin";
function requireAdmin(a:any){if(!isAdmin(a))throw new HttpsError("permission-denied","Apenas administradores.");return a.uid;}
function requireAuth(a:any){if(!a)throw new HttpsError("unauthenticated","Não autenticado.");return a.uid;}

export const approveDriver=onCall(async request=>{
 const adminUid=requireAdmin(request.auth); const driverId=String(request.data?.driverId||""); const approved=request.data?.approved===true;
 if(!driverId)throw new HttpsError("invalid-argument","driverId obrigatório.");
 const ref=db.collection("drivers").doc(driverId); const snap=await ref.get(); if(!snap.exists)throw new HttpsError("not-found","Motoboy não encontrado.");
 await ref.update({approved,approvalStatus:approved?"APPROVED":"PENDING",blocked:approved?snap.data()?.blocked||false:true,status:approved?(snap.data()?.status||"OFFLINE"):"OFFLINE",driverStatus:approved?(snap.data()?.driverStatus||"OFFLINE"):"OFFLINE",approvedAt:approved?admin.firestore.FieldValue.serverTimestamp():null,approvedBy:approved?adminUid:null,updatedAt:admin.firestore.FieldValue.serverTimestamp()});
 await db.collection("audit").add({action:approved?"DRIVER_APPROVED":"DRIVER_APPROVAL_REVOKED",actorId:adminUid,actorType:"admin",targetId:driverId,targetType:"driver",at:admin.firestore.FieldValue.serverTimestamp()});
 return {success:true,approved};
});

export const setDriverBlocked=onCall(async request=>{
 const adminUid=requireAdmin(request.auth); const driverId=String(request.data?.driverId||""); const blocked=!!request.data?.blocked; if(!driverId)throw new HttpsError("invalid-argument","driverId obrigatório.");
 const ref=db.collection("drivers").doc(driverId); const snap=await ref.get(); if(!snap.exists)throw new HttpsError("not-found","Motoboy não encontrado.");
 await ref.update({blocked,status:blocked?"OFFLINE":(snap.data()?.status||"OFFLINE"),driverStatus:blocked?"OFFLINE":(snap.data()?.driverStatus||"OFFLINE"),blockedAt:blocked?admin.firestore.FieldValue.serverTimestamp():null,blockedBy:blocked?adminUid:null});
 return {success:true,blocked};
});

export const updatePricingSettings=onCall(async request=>{
 const uid=requireAdmin(request.auth); const d=request.data||{};
 const settings={mode:d.mode==="DYNAMIC"?"DYNAMIC":"NORMAL",baseFee:Math.max(0,Number(d.baseFee||0)),minimumFee:Math.max(0,Number(d.minimumFee||0)),baseKm:Math.max(0,Number(d.baseKm??3)),perKmFee:Math.max(0,Number(d.perKmFee||0)),extraStopFee:Math.max(0,Number(d.extraStopFee||0)),driverBase:Math.max(0,Number(d.driverBase||0)),driverPerKm:Math.max(0,Number(d.driverPerKm||0)),driverExtraStop:Math.max(0,Number(d.driverExtraStop||0)),platformPercent:Math.min(100,Math.max(0,Number(d.platformPercent||0))),dynamicMultiplier:Math.max(0.1,Number(d.dynamicMultiplier||1)),updatedAt:admin.firestore.FieldValue.serverTimestamp(),updatedBy:uid};
 await db.collection("settings").doc("pricing").set(settings,{merge:true});
 await db.collection("audit").add({action:"PRICING_UPDATED",actorId:uid,actorType:"admin",targetId:"pricing",targetType:"settings",details:settings,at:admin.firestore.FieldValue.serverTimestamp()});
 return {success:true,settings};
});

export const storeHeartbeat=onCall(async request=>{
 const uid=requireAuth(request.auth); if(request.auth!.token.role!=="store")throw new HttpsError("permission-denied","Apenas lojas.");
 const q=await db.collection("stores").where("uid","==",uid).limit(1).get(); if(q.empty)throw new HttpsError("not-found","Loja não encontrada.");
 await q.docs[0].ref.update({online:true,lastHeartbeat:admin.firestore.FieldValue.serverTimestamp(),updatedAt:admin.firestore.FieldValue.serverTimestamp()}); return {success:true};
});

export const expireStoreOnline=onSchedule("every 2 minutes",async()=>{
 const cutoff=admin.firestore.Timestamp.fromMillis(Date.now()-3*60*1000);
 const snap=await db.collection("stores").where("online","==",true).get();
 const batch=db.batch(); let count=0;
 snap.docs.forEach(d=>{const h=d.data().lastHeartbeat;if(!h||h.toMillis()<cutoff.toMillis()){batch.update(d.ref,{online:false});count++;}});
 if(count)await batch.commit();
});

export const createDriverApplication=onCall(async request=>{
 const uid=requireAuth(request.auth); const d=request.data||{};
 const fullName=String(d.fullName||"").trim(),cpf=String(d.cpf||"").trim(),phone=String(d.phone||"").trim(),plate=String(d.plate||"").trim().toUpperCase();
 if(!fullName||!cpf||!phone||!plate)throw new HttpsError("invalid-argument","Nome, CPF, telefone e placa são obrigatórios.");
 const existing=await db.collection("driverApplications").where("uid","==",uid).where("status","in",["PENDING","APPROVED"]).limit(1).get();
 if(!existing.empty)throw new HttpsError("already-exists","Já existe um cadastro em análise.");
 const ref=await db.collection("driverApplications").add({uid,fullName,cpf,phone,plate,vehicleType:d.vehicleType==="CARRO"?"CARRO":"MOTO",documentUrl:d.documentUrl||null,status:"PENDING",createdAt:admin.firestore.FieldValue.serverTimestamp(),updatedAt:admin.firestore.FieldValue.serverTimestamp()});
 return {success:true,applicationId:ref.id};
});

export const processDailyDriverPayouts=onSchedule({schedule:"5 0 * * *",timeZone:"America/Sao_Paulo"},async()=>{
 const period=new Date(Date.now()-3*60*60*1000); period.setDate(period.getDate()-1); const key=period.toISOString().slice(0,10);
 const earnings=await db.collection("driverEarnings").where("status","==","PENDING").limit(1000).get();
 const grouped=new Map<string,{amount:number;earningIds:string[]}>();
 earnings.docs.forEach(d=>{const e=d.data();const driverId=String(e.driverId||"");if(!driverId)return;const g=grouped.get(driverId)||{amount:0,earningIds:[]};g.amount+=Number(e.amount||e.driverPayout||0);g.earningIds.push(d.id);grouped.set(driverId,g);});
 for(const [driverId,g] of grouped){
  if(g.amount<=0)continue;
  const existing=await db.collection("driverPayouts").where("driverId","==",driverId).where("periodKey","==",key).limit(1).get(); if(!existing.empty)continue;
  const driver=await db.collection("drivers").doc(driverId).get(); const dd=driver.data()||{};
  await db.collection("driverPayouts").add({driverId,driverName:dd.name||dd.fullName||"",amount:Number(g.amount.toFixed(2)),periodKey:key,status:"READY_FOR_PIX",pixKey:dd.pixKey||dd.pix?.key||null,earningIds:g.earningIds,createdAt:admin.firestore.FieldValue.serverTimestamp()});
 }
});

export const markDriverPayoutPaid=onCall(async request=>{
 const uid=requireAdmin(request.auth); const payoutId=String(request.data?.payoutId||""); if(!payoutId)throw new HttpsError("invalid-argument","payoutId obrigatório.");
 const ref=db.collection("driverPayouts").doc(payoutId); const snap=await ref.get(); if(!snap.exists)throw new HttpsError("not-found","Repasse não encontrado."); const p=snap.data()!;
 await ref.update({status:"PAID",paidAt:admin.firestore.FieldValue.serverTimestamp(),paidBy:uid,paymentMethod:"PIX"});
 if(Array.isArray(p.earningIds)&&p.earningIds.length){const batch=db.batch();p.earningIds.slice(0,450).forEach((id:string)=>batch.update(db.collection("driverEarnings").doc(id),{status:"PAID",paidAt:admin.firestore.FieldValue.serverTimestamp(),payoutId}));await batch.commit();}
 return {success:true};
});
