import * as admin from "firebase-admin";

export interface AuditEntry {
  action: string;
  actorId: string;
  actorType: "admin" | "store" | "driver" | "system";
  targetId?: string;
  targetType?: string;
  details?: Record<string, any>;
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    // Acessa o Firestore de forma lazy (após initializeApp)
    const db = admin.firestore();
    await db.collection("audit").add({
      ...entry,
      at: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.error("Falha ao registrar auditoria:", err);
  }
}