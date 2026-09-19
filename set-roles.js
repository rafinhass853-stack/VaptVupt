const admin = require("firebase-admin");
admin.initializeApp({ projectId: "vaptvupt-ebe00" });

async function setRoles() {
  console.log("Atribuindo roles...");
  const ADMIN_UID = "TyUn6J94I6auIZf3wGq0Ot2vUQE2";
  await admin.auth().setCustomUserClaims(ADMIN_UID, { role: "admin" });
  console.log("[OK] Admin atribuido: rafael@system.com");
  console.log("");
  console.log("Faca logout/login nos apps.");
  process.exit(0);
}

setRoles().catch((err) => {
  console.error("Erro:", err);
  process.exit(1);
});
