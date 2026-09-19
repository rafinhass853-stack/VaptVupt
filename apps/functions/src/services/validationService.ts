import { HttpsError } from "firebase-functions/v2/https";

export function requireAuth(auth: any): string {
  if (!auth) throw new HttpsError("unauthenticated", "Não autenticado.");
  return auth.uid;
}

export function requireRole(auth: any, role: string): void {
  if (!auth || auth.token?.role !== role) {
    throw new HttpsError("permission-denied", `Requer role ${role}.`);
  }
}

export function validateStops(stops: any): void {
  if (!Array.isArray(stops) || stops.length === 0) {
    throw new HttpsError("invalid-argument", "Ao menos 1 parada é obrigatória.");
  }
  if (stops.length > 10) {
    throw new HttpsError("invalid-argument", "Máximo de 10 paradas.");
  }
  stops.forEach((s: any, i: number) => {
    if (!s.address || typeof s.address !== "string") {
      throw new HttpsError(
        "invalid-argument",
        `Parada ${i + 1}: endereço inválido.`
      );
    }
    if (!s.customerName) {
      throw new HttpsError(
        "invalid-argument",
        `Parada ${i + 1}: nome do cliente obrigatório.`
      );
    }
    if (!s.customerPhone) {
      throw new HttpsError(
        "invalid-argument",
        `Parada ${i + 1}: telefone obrigatório.`
      );
    }
    if (typeof s.lat !== "number" || typeof s.lng !== "number") {
      throw new HttpsError(
        "invalid-argument",
        `Parada ${i + 1}: coordenadas obrigatórias.`
      );
    }
  });
}

export function validateDistance(km: any): number {
  if (typeof km !== "number" || km <= 0 || km > 200) {
    throw new HttpsError("invalid-argument", "Distância inválida (0-200 km).");
  }
  return km;
}