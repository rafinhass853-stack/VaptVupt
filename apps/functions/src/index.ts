import { onCall, HttpsError, onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import {
  onDocumentUpdated,
  onDocumentCreated,
} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import * as crypto from "crypto";

import { assertTransition } from "./state/orderStateMachine";
import type { OrderStatus } from "./state/orderStateMachine";
import { logAudit } from "./services/auditService";
import {
  requireAuth,
  validateStops,
  validateDistance,
  isValidCPF,
  isValidPlate,
  isValidPhone,
  isValidEmail,
} from "./services/validationService";
import { findBestDriver } from "./services/matchingService";
import {
  geocodeAddress,
  calculateRoute,
  autocompleteAddress,
} from "./services/geocodingService";

admin.initializeApp();
const db = admin.firestore();

// ============ TIPOS ============
interface PricingSettings {
  baseFee: number;
  baseKm: number;
  perKmFee: number;
  extraStopFee: number;
}

interface OrderItem {
  nome: string;
  quantidade: number;
  valorUnitario: number;
}

interface Stop {
  address: string;
  lat: number;
  lng: number;
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  paymentMethod: string;
  trocoPara?: number;
  notes?: string;
  totalValue: number;
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
        pin: null,
      };
    }
  }

  const pricing = await getPricing();
  const extraStops = stops.length - 1;
  const billableKm = Math.max(0, distance - pricing.baseKm);
  const totalFee =
    pricing.baseFee +
    billableKm * pricing.perKmFee +
    extraStops * pricing.extraStopFee;

  const totalOrderValue = stops.reduce((sum, stop) => {
    const stopTotal = (stop.items || []).reduce(
      (s, item) => s + item.quantidade * item.valorUnitario,
      0
    );
    return sum + stopTotal;
  }, 0);

  const pin = String(Math.floor(1000 + Math.random() * 9000));
  const deliveryCodeHash = crypto.createHash("sha256").update(pin).digest("hex");

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
      deliveryCodeHash,
      pricing: { totalFee, distanceKm: distance },
      stops: stops,
      totalOrderValue,
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

    return {
      success: true,
      orderId: orderRef.id,
      totalFee,
      newBalance,
      totalOrderValue,
    };
  });

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
    details: {
      totalFee,
      distance,
      stopsCount: stops.length,
      totalOrderValue,
    },
  });

  return { ...result, pin };
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
      throw new HttpsError(
        "failed-precondition",
        `Status inválido: ${order.status}`
      );
    }
    if (order.assignedDriverId !== uid) {
      throw new HttpsError(
        "permission-denied",
        "Este pedido não foi ofertado a você."
      );
    }
    if (order.offerExpiresAt && order.offerExpiresAt.toDate() < new Date()) {
      throw new HttpsError("deadline-exceeded", "Tempo para aceitar expirou.");
    }
    if (driver.driverStatus !== "ONLINE" && driver.status !== "ONLINE") {
      throw new HttpsError("failed-precondition", "Você precisa estar online.");
    }
    if (driver.activeOrderId) {
      throw new HttpsError(
        "failed-precondition",
        "Você já tem um pedido ativo."
      );
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
      driverStatus: "IN_TRIP",
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

// ============ DRIVER ORDER ACTIONS ============
export const updateOrderStatus = onCall(async (request) => {
  const uid = requireAuth(request.auth);
  const { orderId, status } = request.data as { orderId: string; status: OrderStatus };
  if (!orderId || !status) throw new HttpsError("invalid-argument", "orderId e status obrigatórios.");

  const allowed = ["ARRIVING_PICKUP", "COLLECTED", "IN_DELIVERY", "ARRIVING_DESTINATION"];
  if (!allowed.includes(status)) throw new HttpsError("invalid-argument", "Status operacional inválido.");

  const orderRef = db.collection("orders").doc(orderId);
  const driverRef = db.collection("drivers").doc(uid);

  await db.runTransaction(async (transaction) => {
    const [orderDoc, driverDoc] = await Promise.all([transaction.get(orderRef), transaction.get(driverRef)]);
    if (!orderDoc.exists || !driverDoc.exists) throw new HttpsError("not-found", "Pedido ou entregador não encontrado.");
    const order = orderDoc.data()!;
    const driver = driverDoc.data()!;
    if (order.assignedDriverId !== uid || driver.activeOrderId !== orderId) throw new HttpsError("permission-denied", "Pedido não pertence ao entregador.");
    assertTransition(order.status, status);

    const update: Record<string, any> = {
      status,
      statusHistory: admin.firestore.FieldValue.arrayUnion({
        status,
        at: admin.firestore.Timestamp.now(),
        by: uid,
      }),
    };
    if (status === "ARRIVING_PICKUP") update.arrivingPickupAt = admin.firestore.FieldValue.serverTimestamp();
    if (status === "COLLECTED") update.collectedAt = admin.firestore.FieldValue.serverTimestamp();
    if (status === "IN_DELIVERY") update.inDeliveryAt = admin.firestore.FieldValue.serverTimestamp();
    if (status === "ARRIVING_DESTINATION") update.arrivingDestinationAt = admin.firestore.FieldValue.serverTimestamp();
    transaction.update(orderRef, update);
  });

  await logAudit({ action: "ORDER_STATUS_UPDATED", actorId: uid, actorType: "driver", targetId: orderId, targetType: "order", details: { status } });
  return { success: true, orderId, status };
});

export const rejectOrder = onCall(async (request) => {
  const uid = requireAuth(request.auth);
  const { orderId } = request.data as { orderId: string };
  if (!orderId) throw new HttpsError("invalid-argument", "orderId obrigatório.");
  const orderRef = db.collection("orders").doc(orderId);
  await db.runTransaction(async (transaction) => {
    const orderDoc = await transaction.get(orderRef);
    if (!orderDoc.exists) throw new HttpsError("not-found", "Pedido não encontrado.");
    const order = orderDoc.data()!;
    if (order.status !== "OFFERED" || order.assignedDriverId !== uid) {
      throw new HttpsError("failed-precondition", "Esta oferta não está disponível para você.");
    }
    assertTransition(order.status, "SEARCHING_DRIVER");
    transaction.update(orderRef, {
      status: "SEARCHING_DRIVER",
      assignedDriverId: null,
      offerExpiresAt: null,
      rejectedDriverIds: admin.firestore.FieldValue.arrayUnion(uid),
      statusHistory: admin.firestore.FieldValue.arrayUnion({
        status: "SEARCHING_DRIVER",
        at: admin.firestore.Timestamp.now(),
        by: uid,
        reason: "DRIVER_REJECTED",
      }),
    });
  });
  await logAudit({ action: "ORDER_REJECTED", actorId: uid, actorType: "driver", targetId: orderId, targetType: "order" });
  return { success: true, orderId };
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
    if (
      !["COLLECTED", "IN_DELIVERY", "ARRIVING_DESTINATION"].includes(
        order.status
      )
    ) {
      throw new HttpsError(
        "failed-precondition",
        `Status inválido: ${order.status}`
      );
    }

    assertTransition(order.status, "DELIVERED");

    const codeHash = crypto.createHash("sha256").update(code).digest("hex");
    if (!order.deliveryCodeHash || order.deliveryCodeHash !== codeHash) {
      throw new HttpsError("invalid-argument", "PIN de confirmação inválido.");
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
      driverStatus: "ONLINE",
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

  await Promise.all(
    expired.docs.map(async (doc) => {
      await db.runTransaction(async (transaction) => {
        const current = await transaction.get(doc.ref);
        if (!current.exists) return;
        const data = current.data()!;
        if (data.status !== "OFFERED" || !data.offerExpiresAt || data.offerExpiresAt.toMillis() >= now.toMillis()) {
          return;
        }
        assertTransition(data.status, "SEARCHING_DRIVER");
        transaction.update(doc.ref, {
          status: "SEARCHING_DRIVER",
          assignedDriverId: null,
          offerExpiresAt: null,
          rejectedDriverIds: data.assignedDriverId
            ? admin.firestore.FieldValue.arrayUnion(data.assignedDriverId)
            : admin.firestore.FieldValue.arrayUnion(),
          statusHistory: admin.firestore.FieldValue.arrayUnion({
            status: "SEARCHING_DRIVER",
            at: now,
            by: "system",
            reason: "OFFER_EXPIRED",
          }),
        });
      });
    })
  );
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
    const stops = after.stops || [];

    if (stops.length === 0) {
      console.log(`[MATCHING] Pedido ${orderId}: sem paradas.`);
      return;
    }

    const pickup = stops[0];
    if (typeof pickup.lat !== "number" || typeof pickup.lng !== "number") {
      console.log(`[MATCHING] Pedido ${orderId}: coleta sem coordenadas.`);
      return;
    }

    const best = await findBestDriver(pickup.lat, pickup.lng, rejectedIds);

    if (!best) {
      console.log(`[MATCHING] Pedido ${orderId}: nenhum motoboy próximo.`);
      return;
    }

    const now = admin.firestore.Timestamp.now();
    const expiresAt = admin.firestore.Timestamp.fromMillis(
      now.toMillis() + 30000
    );

    await db.collection("orders").doc(orderId).update({
      status: "OFFERED",
      assignedDriverId: best.driverId,
      offerExpiresAt: expiresAt,
      statusHistory: admin.firestore.FieldValue.arrayUnion({
        status: "OFFERED",
        at: now,
        by: "system",
        driverId: best.driverId,
        distanceKm: best.distanceKm,
      }),
    });

    console.log(
      `[MATCHING] Pedido ${orderId} → ${best.driverId} (${best.distanceKm.toFixed(2)}km)`
    );
  }
);

// ============ 6. RETRY SEARCHING ORDERS ============
// Reprocessa pedidos que continuam procurando entregador. Isso evita que
// um pedido fique indefinidamente em SEARCHING_DRIVER quando não havia
// candidato disponível no primeiro disparo do matching.
export const retrySearchingOrders = onSchedule("every 1 minutes", async () => {
  const snapshot = await db
    .collection("orders")
    .where("status", "==", "SEARCHING_DRIVER")
    .limit(50)
    .get();

  let offered = 0;

  for (const orderDoc of snapshot.docs) {
    const order = orderDoc.data();
    const stops = order.stops || [];
    const pickup = stops[0];

    if (typeof pickup?.lat !== "number" || typeof pickup?.lng !== "number") {
      continue;
    }

    const rejectedIds: string[] = order.rejectedDriverIds || [];
    const best = await findBestDriver(pickup.lat, pickup.lng, rejectedIds);
    if (!best) continue;

    const now = admin.firestore.Timestamp.now();
    const expiresAt = admin.firestore.Timestamp.fromMillis(now.toMillis() + 30000);

    await db.runTransaction(async (transaction) => {
      const current = await transaction.get(orderDoc.ref);
      if (!current.exists || current.data()?.status !== "SEARCHING_DRIVER") return;

      transaction.update(orderDoc.ref, {
        status: "OFFERED",
        assignedDriverId: best.driverId,
        offerExpiresAt: expiresAt,
        statusHistory: admin.firestore.FieldValue.arrayUnion({
          status: "OFFERED",
          at: now,
          by: "system",
          driverId: best.driverId,
          distanceKm: best.distanceKm,
          reason: "SEARCH_RETRY",
        }),
      });
      offered += 1;
    });
  }

  console.log(`[MATCHING] Retry: ${snapshot.size} em busca, ${offered} novas ofertas.`);
});

// ============ 6. SET USER ROLE (ADMIN) ============
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

// ============ 7. AUTO-ASSIGN DRIVER CLAIM ============
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

// ============ 8. GEOCODING PROXY ============
export const geocode = onRequest(
  { cors: true, invoker: "public" },
  async (req, res) => {
    try {
      const address = req.query.address as string;
      if (!address) {
        res.status(400).json({ error: "address obrigatório" });
        return;
      }
      const result = await geocodeAddress(address);
      res.json(result);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
);

export const autocomplete = onRequest(
  { cors: true, invoker: "public" },
  async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.length < 3) {
        res.json([]);
        return;
      }
      const results = await autocompleteAddress(query);
      res.json(results);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
);

export const route = onRequest(
  { cors: true, invoker: "public" },
  async (req, res) => {
    try {
      const stopsParam = req.query.stops as string;
      if (!stopsParam) {
        res.status(400).json({ error: "stops obrigatório (lat,lng;lat,lng)" });
        return;
      }
      const stops = stopsParam.split(";").map((s) => {
        const [lat, lng] = s.split(",").map(Number);
        return { lat, lng };
      });
      const result = await calculateRoute(stops);
      res.json(result);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ============ 9. SEND PUSH NOTIFICATION (FCM) ============
export const sendPushNotification = onCall(async (request) => {
  requireAuth(request.auth);

  const { targetToken, title, body, data } = request.data as {
    targetToken: string;
    title: string;
    body: string;
    data?: Record<string, string>;
  };

  if (!targetToken || !title) {
    throw new HttpsError(
      "invalid-argument",
      "targetToken e title obrigatórios."
    );
  }

  try {
    await admin.messaging().send({
      token: targetToken,
      notification: { title, body },
      data: data || {},
      android: { priority: "high", notification: { sound: "default" } },
      apns: { payload: { aps: { sound: "default", badge: 1 } } },
    });
    return { success: true };
  } catch (err: any) {
    console.error("Erro FCM:", err);
    throw new HttpsError("internal", "Falha ao enviar notificação.");
  }
});

// ============ 10. GENERATE PIX CHARGE ============
export const generatePixCharge = onCall(async (request) => {
  const uid = requireAuth(request.auth);

  const { storeId, amount } = request.data as {
    storeId: string;
    amount: number;
  };

  if (!storeId || !amount || amount <= 0) {
    throw new HttpsError("invalid-argument", "storeId e amount obrigatórios.");
  }

  const storeRef = db.collection("stores").doc(storeId);
  const storeSnap = await storeRef.get();
  if (!storeSnap.exists) {
    throw new HttpsError("not-found", "Loja não encontrada.");
  }

  const storeData = storeSnap.data()!;
  if (storeData.uid && storeData.uid !== uid) {
    throw new HttpsError("permission-denied", "Loja não pertence a você.");
  }

  const chargeId = `PIX-${storeId.slice(0, 8)}-${Date.now()}`;

  const pixCode = `00020126580014BR.GOV.BCB.PIX0136${chargeId}5204000053039865406${amount.toFixed(
    2
  )}5802BR5913VaptVupt LTDA6009SAO PAULO62070503***6304ABCD`;

  await db.collection("pixCharges").doc(chargeId).set({
    chargeId,
    storeId,
    amount,
    status: "PENDING",
    pixCode,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true, chargeId, pixCode, amount };
});

// ============ 11. CONFIRM PIX CHARGE ============
export const confirmPixCharge = onCall(async (request) => {
  const uid = requireAuth(request.auth);
  const { chargeId } = request.data as { chargeId: string };

  if (!chargeId) throw new HttpsError("invalid-argument", "chargeId obrigatório.");

  const chargeRef = db.collection("pixCharges").doc(chargeId);

  const result = await db.runTransaction(async (transaction) => {
    const chargeDoc = await transaction.get(chargeRef);
    if (!chargeDoc.exists) {
      throw new HttpsError("not-found", "Cobrança não encontrada.");
    }

    const charge = chargeDoc.data()!;
    if (charge.status === "PAID") {
      throw new HttpsError("already-exists", "Cobrança já paga.");
    }

    const storeRef = db.collection("stores").doc(charge.storeId);
    const storeDoc = await transaction.get(storeRef);
    if (!storeDoc.exists) {
      throw new HttpsError("not-found", "Loja não encontrada.");
    }

    const storeData = storeDoc.data()!;
    const newBalance = (storeData.balance || 0) + charge.amount;

    transaction.update(storeRef, { balance: newBalance });
    transaction.update(chargeRef, {
      status: "PAID",
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      paidBy: uid,
    });

    const txRef = db.collection("transactions").doc();
    transaction.set(txRef, {
      storeId: charge.storeId,
      type: "CREDIT_PIX",
      amount: charge.amount,
      orderId: null,
      description: `Recarga PIX ${chargeId.slice(0, 12)}`,
      balanceAfter: newBalance,
      idempotencyKey: chargeId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, newBalance, amount: charge.amount };
  });

  await logAudit({
    action: "PIX_CONFIRMED",
    actorId: uid,
    actorType: "store",
    targetId: chargeId,
    targetType: "pixCharge",
    details: { amount: result.amount },
  });

  return result;
});

// ============ 12. CREATE COURIER (ADMIN) ============
export const createCourier = onCall(async (request) => {
  const uid = requireAuth(request.auth);

  if (request.auth!.token.role !== "admin") {
    throw new HttpsError("permission-denied", "Apenas administradores.");
  }

  const {
    email,
    password,
    fullName,
    cpf,
    phone,
    address,
    licenseCategory,
    licenseNumber,
    vehicle,
  } = request.data as {
    email: string;
    password: string;
    fullName: string;
    cpf: string;
    phone: string;
    address: {
      street: string;
      number: string;
      neighborhood: string;
      city: string;
    };
    licenseCategory: string;
    licenseNumber: string;
    vehicle: {
      type: "carro" | "moto";
      plate: string;
      color: string;
      year: string;
      brand: string;
      model: string;
    };
  };

  // Validações
  if (!email || !password || !fullName || !cpf || !phone) {
    throw new HttpsError("invalid-argument", "Campos obrigatórios faltando.");
  }
  if (!isValidEmail(email)) {
    throw new HttpsError("invalid-argument", "E-mail inválido.");
  }
  if (password.length < 6) {
    throw new HttpsError(
      "invalid-argument",
      "Senha deve ter ao menos 6 caracteres."
    );
  }
  if (!isValidCPF(cpf)) {
    throw new HttpsError("invalid-argument", "CPF inválido.");
  }
  if (!isValidPhone(phone)) {
    throw new HttpsError("invalid-argument", "Telefone inválido.");
  }
  if (!vehicle || !vehicle.type || !vehicle.plate) {
    throw new HttpsError("invalid-argument", "Dados do veículo incompletos.");
  }
  if (!["carro", "moto"].includes(vehicle.type)) {
    throw new HttpsError(
      "invalid-argument",
      "Tipo de veículo deve ser carro ou moto."
    );
  }
  if (!isValidPlate(vehicle.plate)) {
    throw new HttpsError("invalid-argument", "Placa inválida.");
  }

  // Verifica CPF duplicado
  const cpfClean = cpf.replace(/\D/g, "");
  const existingCpf = await db
    .collection("drivers")
    .where("cpfClean", "==", cpfClean)
    .limit(1)
    .get();
  if (!existingCpf.empty) {
    throw new HttpsError("already-exists", "CPF já cadastrado.");
  }

  // Cria usuário no Auth
  let userRecord;
  try {
    userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: fullName,
    });
  } catch (err: any) {
    if (err.code === "auth/email-already-exists") {
      throw new HttpsError("already-exists", "E-mail já cadastrado.");
    }
    throw new HttpsError("internal", err.message);
  }

  // Claim de driver
  await admin.auth().setCustomUserClaims(userRecord.uid, { role: "driver" });

  // Salva no Firestore
  await db.collection("drivers").doc(userRecord.uid).set({
    uid: userRecord.uid,
    fullName,
    email,
    cpf: cpf.replace(
      /(\d{3})(\d{3})(\d{3})(\d{2})/,
      "$1.$2.$3-$4"
    ),
    cpfClean,
    phone: phone.replace(/\D/g, ""),
    address,
    licenseCategory,
    licenseNumber,
    vehicle,
    status: "active",
    driverStatus: "OFFLINE",
    activeOrderId: null,
    fcmToken: "",
    currentGeohash: "",
    approved: true,
    blocked: false,
    totalDeliveries: 0,
    rating: 5.0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await logAudit({
    action: "COURIER_CREATED",
    actorId: uid,
    actorType: "admin",
    targetId: userRecord.uid,
    targetType: "driver",
    details: { email, fullName, vehicleType: vehicle.type },
  });

  return { success: true, courierId: userRecord.uid };
});

// ============ 13. CREATE STORE (ADMIN) ============
export const createStore = onCall(async (request) => {
  const uid = requireAuth(request.auth);

  if (request.auth!.token.role !== "admin") {
    throw new HttpsError("permission-denied", "Apenas administradores.");
  }

  const { name, slug, phone, managerName, email, password, address } =
    request.data as {
      name: string;
      slug: string;
      phone: string;
      managerName: string;
      email: string;
      password: string;
      address: {
        street: string;
        number: string;
        neighborhood: string;
        city: string;
        lat?: number;
        lng?: number;
        fullAddress?: string;
      };
    };

  // Validações
  if (!name || !slug || !email || !password || !managerName) {
    throw new HttpsError("invalid-argument", "Campos obrigatórios faltando.");
  }
  if (!isValidEmail(email)) {
    throw new HttpsError("invalid-argument", "E-mail inválido.");
  }
  if (password.length < 6) {
    throw new HttpsError(
      "invalid-argument",
      "Senha deve ter ao menos 6 caracteres."
    );
  }

  // Slug duplicado?
  const existingSlug = await db
    .collection("stores")
    .where("slug", "==", slug)
    .limit(1)
    .get();
  if (!existingSlug.empty) {
    throw new HttpsError("already-exists", "Slug já está em uso.");
  }

  // Cria usuário
  let userRecord;
  try {
    userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: managerName,
    });
  } catch (err: any) {
    if (err.code === "auth/email-already-exists") {
      throw new HttpsError("already-exists", "E-mail já cadastrado.");
    }
    throw new HttpsError("internal", err.message);
  }

  // Claim de store
  await admin.auth().setCustomUserClaims(userRecord.uid, { role: "store" });

  // Salva no Firestore
  const storeRef = await db.collection("stores").add({
    uid: userRecord.uid,
    name,
    slug,
    phone: phone || "",
    managerName,
    email,
    address: address || {},
    balance: 0,
    status: "active",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Atualiza claim com o storeId
  await admin.auth().setCustomUserClaims(userRecord.uid, {
    role: "store",
    storeId: storeRef.id,
  });

  await logAudit({
    action: "STORE_CREATED",
    actorId: uid,
    actorType: "admin",
    targetId: storeRef.id,
    targetType: "store",
    details: { name, slug, email },
  });

  return { success: true, storeId: storeRef.id };
});