import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as crypto from "crypto";

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
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Usuário não autenticado.");
  }

  const { storeId, stops, totalDistanceKm } = request.data as {
    storeId: string;
    stops: Stop[];
    totalDistanceKm: number;
  };

  if (!storeId || !stops || stops.length === 0) {
    throw new HttpsError("invalid-argument", "Dados incompletos.");
  }

  const pricing = await getPricing();
  const storeRef = db.collection("stores").doc(storeId);

  const extraStops = stops.length - 1;
  const billableKm = Math.max(0, totalDistanceKm - pricing.baseKm);
  const totalFee =
    pricing.baseFee + billableKm * pricing.perKmFee + extraStops * pricing.extraStopFee;

  return await db.runTransaction(async (transaction) => {
    const storeDoc = await transaction.get(storeRef);
    if (!storeDoc.exists) {
      throw new HttpsError("not-found", "Loja não encontrada.");
    }

    const storeData = storeDoc.data()!;
    const currentBalance = storeData.balance || 0;

    if (currentBalance < totalFee) {
      throw new HttpsError(
        "failed-precondition",
        `Saldo insuficiente. Necessário: R$ ${totalFee.toFixed(2)}`
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
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const orderRef = db.collection("orders").doc();
    transaction.set(orderRef, {
      orderId: orderRef.id,
      storeId,
      storeName: storeData.name || "Loja",
      status: "SEARCHING_DRIVER",
      assignedDriverId: null,
      rejectedDriverIds: [],
      offerExpiresAt: null,
      deliveryCodeHash: "",
      pricing: { totalFee, distanceKm: totalDistanceKm },
      stops: stops,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    transaction.update(transactionRef, { orderId: orderRef.id });

    return { success: true, orderId: orderRef.id, totalFee };
  });
});

// ============ 2. ACCEPT ORDER ============
export const acceptOrder = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Usuário não autenticado.");
  }

  const { orderId } = request.data as { orderId: string };
  const driverId = request.auth.uid;
  const orderRef = db.collection("orders").doc(orderId);
  const driverRef = db.collection("drivers").doc(driverId);

  return await db.runTransaction(async (transaction) => {
    const orderDoc = await transaction.get(orderRef);
    const driverDoc = await transaction.get(driverRef);

    if (!orderDoc.exists || !driverDoc.exists) {
      throw new HttpsError("not-found", "Pedido ou motorista não encontrado.");
    }

    const order = orderDoc.data()!;
    const driver = driverDoc.data()!;

    if (order.status !== "OFFERED" || order.assignedDriverId !== driverId) {
      throw new HttpsError(
        "failed-precondition",
        "Oferta inválida ou já aceita por outro."
      );
    }
    if (order.offerExpiresAt && order.offerExpiresAt.toDate() < new Date()) {
      throw new HttpsError("deadline-exceeded", "Tempo expirou.");
    }
    if (driver.status !== "ONLINE") {
      throw new HttpsError("failed-precondition", "Motorista não disponível.");
    }

    transaction.update(orderRef, {
      status: "ACCEPTED",
      assignedDriverId: driverId,
      offerExpiresAt: null,
    });

    transaction.update(driverRef, {
      status: "IN_TRIP",
      activeOrderId: orderId,
    });

    return { success: true, orderId };
  });
});

// ============ 3. VERIFY DELIVERY CODE ============
export const verifyDeliveryCode = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Usuário não autenticado.");
  }

  const { orderId, code } = request.data as { orderId: string; code: string };
  const driverId = request.auth.uid;
  const orderRef = db.collection("orders").doc(orderId);
  const driverRef = db.collection("drivers").doc(driverId);

  return await db.runTransaction(async (transaction) => {
    const orderDoc = await transaction.get(orderRef);
    if (!orderDoc.exists) {
      throw new HttpsError("not-found", "Pedido não encontrado.");
    }

    const order = orderDoc.data()!;
    if (order.assignedDriverId !== driverId) {
      throw new HttpsError("permission-denied", "Pedido não pertence a você.");
    }
    if (order.status !== "COLLECTED") {
      throw new HttpsError(
        "failed-precondition",
        "Pedido não está em rota de entrega."
      );
    }

    const codeHash = crypto.createHash("sha256").update(code).digest("hex");
    if (order.deliveryCodeHash && order.deliveryCodeHash !== codeHash) {
      throw new HttpsError("invalid-argument", "Código inválido.");
    }

    transaction.update(orderRef, {
      status: "DELIVERED",
      deliveredAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    transaction.update(driverRef, {
      status: "ONLINE",
      activeOrderId: null,
    });

    return { success: true };
  });
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
import { onDocumentUpdated } from "firebase-functions/v2/firestore";

export const matchingDriver = onDocumentUpdated(
  "orders/{orderId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (!before || !after) return;

    // Só dispara quando muda de PENDING/outros → SEARCHING_DRIVER
    if (before.status === after.status || after.status !== "SEARCHING_DRIVER") {
      return;
    }

    const orderId = event.params.orderId;
    const rejectedIds: string[] = after.rejectedDriverIds || [];

    // Busca motoboys online, não bloqueados, que não rejeitaram este pedido
    const driversSnap = await db
      .collection("drivers")
      .where("status", "==", "ONLINE")
      .get();

    if (driversSnap.empty) {
      console.log(`Pedido ${orderId}: nenhum motoboy online`);
      return;
    }

    // Filtra os que rejeitaram
    const candidates = driversSnap.docs.filter(
      (d) => !rejectedIds.includes(d.id)
    );

    if (candidates.length === 0) {
      console.log(`Pedido ${orderId}: todos os motoboys rejeitaram`);
      return;
    }

    // Escolhe o primeiro (você pode melhorar depois com base em proximidade/geohash)
    const chosen = candidates[0];
    const now = admin.firestore.Timestamp.now();
    const expiresAt = admin.firestore.Timestamp.fromMillis(
      now.toMillis() + 30 * 1000
    );

    await db.collection("orders").doc(orderId).update({
      status: "OFFERED",
      assignedDriverId: chosen.id,
      offerExpiresAt: expiresAt,
    });

    console.log(
      `Pedido ${orderId} ofertado para motorista ${chosen.id} (expira em 30s)`
    );
  }
);