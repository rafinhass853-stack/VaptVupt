import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentUpdated, onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import * as crypto from "crypto";

import { assertTransition } from "./state/orderStateMachine";
import { logAudit } from "./services/auditService";
import {
  requireAuth,
  validateStops,
  validateDistance,
} from "./services/validationService";

admin.initializeApp();
const db = admin.firestore();

// ============ TIPOS ============
interface PricingSettings {
  baseFee: number;
  baseKm: number;
  perKmFee: number;
  extraStopFee: number;
}

interface Stop {
  address: string;
  lat: number;
  lng: number;
  customerName: string;
  customerPhone: string;
  codValue?: number;
}

// ============ HELPERS ============
async function getPricing(): Promise<PricingSettings> {
  const doc = await db.collection("settings").doc("pricing").get();
  if (!doc.exists) {
    return { baseFee: 8.0, baseKm: 3.0, perKmFee: 1.5, extraStopFee: 2.0 };
  }
  return doc.data() as PricingSettings;
}

// ============ 1. CREATE DELIVERY ORDER ============
export const createDeliveryOrder = onCall(async (request) => {
  const uid = requireAuth(request.auth);

  const { storeId, stops, totalDistanceKm, idempotencyKey } = request.data as {
    storeId: string;
    stops: Stop[];
    totalDistanceKm: number;
    idempotencyKey?: string;
  };

  if (!storeId) throw new HttpsError("invalid-argument", "storeId obrigatório.");
  validateStops(stops);
  const distance = validateDistance(totalDistanceKm);

  // Idempotência: se já existe um pedido com essa chave, devolve ele
  if (idempotencyKey) {
    const existing = await db
      .collection("orders")
      .where("idempotencyKey", "==", idempotencyKey)
      .limit(1)
      .get();
    if (!existing.empty) {
      const doc = existing.docs[0];
      const data = doc.data();
      console.log(`[IDEMPOTENTE] Pedido já criado: ${doc.id}`);
      return {
        success: true,
        orderId: doc.id,
        totalFee: data.pricing.totalFee,
        idempotent: true,
      };
    }
  }

  const pricing = await getPricing();
  const extraStops = stops.length - 1;
  const billableKm = Math.max(0, distance - pricing.baseKm);
  const totalFee =
    pricing.baseFee + billableKm * pricing.perKmFee + extraStops * pricing.extraStopFee;

  const storeRef = db.collection("stores").doc(storeId);

  const result = await db.runTransaction(async (transaction) => {
    const storeDoc = await transaction.get(storeRef);
    if (!storeDoc.exists) {
      throw new HttpsError("not-found", "Loja não encontrada.");
    }

    const storeData = storeDoc.data()!;
    const currentBalance = storeData.balance || 0;

    if (storeData.uid && storeData.uid !== uid) {
      throw new HttpsError("permission-denied", "Loja não pertence a você.");
    }

    if (currentBalance < totalFee) {
      throw new HttpsError(
        "failed-precondition",
        `Saldo insuficiente. Necessário: R$ ${totalFee.toFixed(2)}, disponível: R$ ${currentBalance.toFixed(2)}`
      );
    }

    const newBalance = currentBalance - totalFee;
    transaction.update(storeRef, { balance: newBalance });

    const transactionRef = db.collection("transactions").doc();
    transaction.set(transactionRef, {
      storeId,
      type: "DEBIT_DELIVERY",
      amount: totalFee,
      orderId: null,
      description: `Frete para ${stops.length} parada(s)`,
      balanceAfter: newBalance,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: uid,
    });

    const orderRef = db.collection("orders").doc();
    transaction.set(orderRef, {
      orderId: orderRef.id,
      storeId,
      storeName: storeData.name || "Loja",
      status: "PENDING",
      assignedDriverId: null,
      rejectedDriverIds: [],
      offerExpiresAt: null,
      deliveryCodeHash: "",
      pricing: { totalFee, distanceKm: distance },
      stops: stops,
      idempotencyKey: idempotencyKey || null,
      statusHistory: [
        {
          status: "PENDING",
          at: admin.firestore.Timestamp.now(),
          by: uid,
        },
      ],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    transaction.update(transactionRef, { orderId: orderRef.id });

    return { success: true, orderId: orderRef.id, totalFee, newBalance };
  });

  // Mover para SEARCHING_DRIVER (após commit, dispara o matching)
  await db.collection("orders").doc(result.orderId).update({
    status: "SEARCHING_DRIVER",
    statusHistory: admin.firestore.FieldValue.arrayUnion({
      status: "SEARCHING_DRIVER",
      at: admin.firestore.Timestamp.now(),
      by: "system",
    }),
  });

  await logAudit({
    action: "ORDER_CREATED",
    actorId: uid,
    actorType: "store",
    targetId: result.orderId,
    targetType: "order",
    details: { totalFee, distance, stopsCount: stops.length },
  });

  return result;
});

// ============ 2. ACCEPT ORDER ============
export const acceptOrder = onCall(async (request) => {
  const uid = requireAuth(request.auth);

  const { orderId } = request.data as { orderId: string };
  if (!orderId) throw new HttpsError("invalid-argument", "orderId obrigatório.");

  const orderRef = db.collection("orders").doc(orderId);
  const driverRef = db.collection("drivers").doc(uid);

  const result = await db.runTransaction(async (transaction) => {
    const orderDoc = await transaction.get(orderRef);
    const driverDoc = await transaction.get(driverRef);

    if (!orderDoc.exists || !driverDoc.exists) {
      throw new HttpsError("not-found", "Pedido ou motorista não encontrado.");
    }

    const order = orderDoc.data()!;
    const driver = driverDoc.data()!;

    if (order.status !== "OFFERED") {
      throw new HttpsError("failed-precondition", `Status inválido: ${order.status}`);
    }
    if (order.assignedDriverId !== uid) {
      throw new HttpsError("permission-denied", "Este pedido não foi ofertado a você.");
    }
    if (order.offerExpiresAt && order.offerExpiresAt.toDate() < new Date()) {
      throw new HttpsError("deadline-exceeded", "Tempo para aceitar expirou.");
    }
    if (driver.status !== "ONLINE") {
      throw new HttpsError("failed-precondition", "Você precisa estar online.");
    }
    if (driver.activeOrderId) {
      throw new HttpsError("failed-precondition", "Você já tem um pedido ativo.");
    }

    assertTransition(order.status, "ACCEPTED");

    transaction.update(orderRef, {
      status: "ACCEPTED",
      offerExpiresAt: null,
      acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
      statusHistory: admin.firestore.FieldValue.arrayUnion({
        status: "ACCEPTED",
        at: admin.firestore.Timestamp.now(),
        by: uid,
      }),
    });

    transaction.update(driverRef, {
      status: "IN_TRIP",
      activeOrderId: orderId,
    });

    return { success: true, orderId };
  });

  await logAudit({
    action: "ORDER_ACCEPTED",
    actorId: uid,
    actorType: "driver",
    targetId: orderId,
    targetType: "order",
  });

  return result;
});

// ============ 3. VERIFY DELIVERY CODE ============
export const verifyDeliveryCode = onCall(async (request) => {
  const uid = requireAuth(request.auth);

  const { orderId, code } = request.data as { orderId: string; code: string };
  if (!orderId || !code) {
    throw new HttpsError("invalid-argument", "orderId e code obrigatórios.");
  }
  if (!/^\d{4}$/.test(code)) {
    throw new HttpsError("invalid-argument", "O código deve ter 4 dígitos.");
  }

  const orderRef = db.collection("orders").doc(orderId);
  const driverRef = db.collection("drivers").doc(uid);

  const result = await db.runTransaction(async (transaction) => {
    const orderDoc = await transaction.get(orderRef);
    if (!orderDoc.exists) {
      throw new HttpsError("not-found", "Pedido não encontrado.");
    }

    const order = orderDoc.data()!;

    if (order.assignedDriverId !== uid) {
      throw new HttpsError("permission-denied", "Pedido não pertence a você.");
    }
    if (!["COLLECTED", "IN_DELIVERY", "ARRIVING_DESTINATION"].includes(order.status)) {
      throw new HttpsError("failed-precondition", `Status inválido: ${order.status}`);
    }

    assertTransition(order.status, "DELIVERED");

    const codeHash = crypto.createHash("sha256").update(code).digest("hex");
    if (order.deliveryCodeHash && order.deliveryCodeHash !== codeHash) {
      throw new HttpsError("invalid-argument", "Código de confirmação inválido.");
    }

    transaction.update(orderRef, {
      status: "DELIVERED",
      deliveredAt: admin.firestore.FieldValue.serverTimestamp(),
      statusHistory: admin.firestore.FieldValue.arrayUnion({
        status: "DELIVERED",
        at: admin.firestore.Timestamp.now(),
        by: uid,
      }),
    });

    transaction.update(driverRef, {
      status: "ONLINE",
      activeOrderId: null,
      totalDeliveries: admin.firestore.FieldValue.increment(1),
    });

    return { success: true };
  });

  await logAudit({
    action: "ORDER_DELIVERED",
    actorId: uid,
    actorType: "driver",
    targetId: orderId,
    targetType: "order",
  });

  return result;
});

// ============ 4. HANDLE EXPIRED OFFERS (CRON) ============
export const handleExpiredOffers = onSchedule("every 1 minutes", async () => {
  const now = admin.firestore.Timestamp.now();
  const expired = await db
    .collection("orders")
    .where("status", "==", "OFFERED")
    .where("offerExpiresAt", "<", now)
    .get();

  const batch = db.batch();
  expired.forEach((doc) => {
    const docData = doc.data();
    batch.update(doc.ref, {
      status: "SEARCHING_DRIVER",
      assignedDriverId: null,
      offerExpiresAt: null,
      rejectedDriverIds: admin.firestore.FieldValue.arrayUnion(docData.assignedDriverId),
    });
  });

  await batch.commit();
  console.log(`Processadas ${expired.size} ofertas expiradas.`);
});

// ============ 5. MATCHING DRIVER (TRIGGER) ============
export const matchingDriver = onDocumentUpdated(
  "orders/{orderId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (!before || !after) return;
    if (before.status === after.status) return;
    if (after.status !== "SEARCHING_DRIVER") return;

    const orderId = event.params.orderId;
    const rejectedIds: string[] = after.rejectedDriverIds || [];

    const driversSnap = await db
      .collection("drivers")
      .where("status", "==", "ONLINE")
      .get();

    if (driversSnap.empty) {
      console.log(`[MATCHING] Pedido ${orderId}: nenhum motoboy online.`);
      return;
    }

    const candidates = driversSnap.docs
      .filter((d) => {
        const data = d.data();
        if (rejectedIds.includes(d.id)) return false;
        if (data.blocked) return false;
        if (data.approved === false) return false;
        return true;
      })
      .map((d) => ({ id: d.id, ...d.data() }));

    if (candidates.length === 0) {
      console.log(`[MATCHING] Pedido ${orderId}: nenhum candidato elegível.`);
      return;
    }

    candidates.sort((a: any, b: any) => {
      const aActive = a.activeOrderId ? 1 : 0;
      const bActive = b.activeOrderId ? 1 : 0;
      return aActive - bActive;
    });

    const chosen = candidates[0];
    const now = admin.firestore.Timestamp.now();
    const expiresAt = admin.firestore.Timestamp.fromMillis(now.toMillis() + 30000);

    await db.collection("orders").doc(orderId).update({
      status: "OFFERED",
      assignedDriverId: chosen.id,
      offerExpiresAt: expiresAt,
      statusHistory: admin.firestore.FieldValue.arrayUnion({
        status: "OFFERED",
        at: now,
        by: "system",
        driverId: chosen.id,
      }),
    });

    console.log(`[MATCHING] Pedido ${orderId} → motorista ${chosen.id} (30s)`);
  }
);

// ============ 6. SET USER ROLE (ADMIN ONLY) ============
export const setUserRole = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Não autenticado.");
  }

  if (request.auth.token.role !== "admin") {
    throw new HttpsError("permission-denied", "Apenas administradores.");
  }

  const { uid, role, storeId } = request.data as {
    uid: string;
    role: "admin" | "store" | "driver";
    storeId?: string;
  };

  if (!uid || !role) {
    throw new HttpsError("invalid-argument", "uid e role obrigatórios.");
  }

  const claims: Record<string, any> = { role };
  if (role === "store" && storeId) claims.storeId = storeId;

  await admin.auth().setCustomUserClaims(uid, claims);

  if (role === "store" && storeId) {
    await db.collection("stores").doc(storeId).update({ uid });
  }

  await db.collection("audit").add({
    action: "SET_USER_ROLE",
    uid,
    role,
    storeId: storeId || null,
    performedBy: request.auth.uid,
    at: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true };
});

// ============ 7. AUTO-ASSIGN DRIVER CLAIM (TRIGGER) ============
export const onDriverCreated = onDocumentCreated(
  "drivers/{driverId}",
  async (event) => {
    const driverId = event.params.driverId;
    if (!driverId) return;

    try {
      await admin.auth().setCustomUserClaims(driverId, { role: "driver" });
      console.log(`[OK] Claim 'driver' atribuída a ${driverId}`);
    } catch (err) {
      console.error(`Erro ao atribuir claim a ${driverId}:`, err);
    }
  }
);