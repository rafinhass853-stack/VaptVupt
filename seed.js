const admin = require("firebase-admin");
admin.initializeApp({
  projectId: "vaptvupt-ebe00",
});
const db = admin.firestore();

async function seed() {
  console.log("Populando Firestore...");

  // 1. Configurações de preço
  await db.collection("settings").doc("pricing").set({
    baseFee: 8.0,
    baseKm: 3.0,
    perKmFee: 1.5,
    extraStopFee: 2.0,
  });
  console.log("[OK] settings/pricing criado");

  // 2. Loja de teste
  const storeId = "loja-teste-001";
  await db.collection("stores").doc(storeId).set({
    uid: "demo-store-uid",
    name: "Pizzaria do Ze (Teste)",
    slug: "pizzaria-do-ze",
    balance: 100.0,
    address: {
      street: "Av. Paulista",
      number: "1000",
      lat: -23.5613,
      lng: -46.6565,
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log("[OK] Loja de teste criada:", storeId);

  // 3. Motorista de teste
  const driverId = "driver-teste-001";
  await db.collection("drivers").doc(driverId).set({
    uid: "demo-driver-uid",
    name: "Joao Motoboy (Teste)",
    status: "OFFLINE",
    activeOrderId: null,
    fcmToken: "",
    currentGeohash: "",
    vehicleType: "MOTO",
  });
  console.log("[OK] Motorista de teste criado:", driverId);

  console.log("Seed completo!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Erro:", err);
  process.exit(1);
});