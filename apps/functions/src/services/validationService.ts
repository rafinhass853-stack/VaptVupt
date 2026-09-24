import { HttpsError } from "firebase-functions/v2/https";

// ============================================
// Autenticação
// ============================================
export function requireAuth(auth: any): string {
  if (!auth) throw new HttpsError("unauthenticated", "Não autenticado.");
  return auth.uid;
}

export function requireRole(auth: any, role: string): void {
  if (!auth || auth.token?.role !== role) {
    throw new HttpsError("permission-denied", `Requer role ${role}.`);
  }
}

// ============================================
// Validação de Pedidos
// ============================================
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
    if (!Array.isArray(s.items) || s.items.length === 0) {
      throw new HttpsError(
        "invalid-argument",
        `Parada ${i + 1}: adicione ao menos 1 item.`
      );
    }
    s.items.forEach((item: any, j: number) => {
      if (!item.nome || typeof item.nome !== "string") {
        throw new HttpsError(
          "invalid-argument",
          `Parada ${i + 1}, item ${j + 1}: nome obrigatório.`
        );
      }
      if (typeof item.quantidade !== "number" || item.quantidade < 1) {
        throw new HttpsError(
          "invalid-argument",
          `Parada ${i + 1}, item ${j + 1}: quantidade inválida.`
        );
      }
      if (typeof item.valorUnitario !== "number" || item.valorUnitario < 0) {
        throw new HttpsError(
          "invalid-argument",
          `Parada ${i + 1}, item ${j + 1}: valor inválido.`
        );
      }
    });
    if (!["DINHEIRO", "CARTAO", "PIX", "JA_PAGO"].includes(s.paymentMethod)) {
      throw new HttpsError(
        "invalid-argument",
        `Parada ${i + 1}: forma de pagamento inválida.`
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

// ============================================
// Validação de CPF (com dígitos verificadores)
// ============================================
export function isValidCPF(cpf: string): boolean {
  const clean = cpf.replace(/\D/g, "");
  if (clean.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(clean)) return false;

  let sum = 0;
  let remainder: number;

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(clean.substring(i - 1, i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(clean.substring(9, 10))) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(clean.substring(i - 1, i)) * (12 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(clean.substring(10, 11))) return false;

  return true;
}

// ============================================
// Validação de Placa (Brasil antiga ou Mercosul)
// ============================================
export function isValidPlate(plate: string): boolean {
  const clean = plate.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  // Padrão antigo: ABC1234
  if (/^[A-Z]{3}\d{4}$/.test(clean)) return true;
  // Padrão Mercosul: ABC1D23
  if (/^[A-Z]{3}\d[A-Z]\d{2}$/.test(clean)) return true;
  return false;
}

// ============================================
// Validação de Telefone (Brasil - 10 ou 11 dígitos)
// ============================================
export function isValidPhone(phone: string): boolean {
  const clean = phone.replace(/\D/g, "");
  return clean.length === 10 || clean.length === 11;
}

// ============================================
// Validação de Email
// ============================================
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ============================================
// Sanitização de Slug
// ============================================
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}