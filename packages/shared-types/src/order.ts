// ============================================
// Order - Tipos e Estado do Pedido
// ============================================

export type OrderStatus =
  | "PENDING"
  | "SEARCHING_DRIVER"
  | "OFFERED"
  | "ACCEPTED"
  | "ARRIVING_PICKUP"
  | "COLLECTED"
  | "IN_DELIVERY"
  | "ARRIVING_DESTINATION"
  | "DELIVERED"
  | "CANCELLED"
  | "FAILED";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Pendente",
  SEARCHING_DRIVER: "Buscando motoboy",
  OFFERED: "Ofertado",
  ACCEPTED: "Aceito",
  ARRIVING_PICKUP: "A caminho da loja",
  COLLECTED: "Coletado",
  IN_DELIVERY: "Em rota de entrega",
  ARRIVING_DESTINATION: "Chegando ao destino",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
  FAILED: "Falhou",
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: "gray",
  SEARCHING_DRIVER: "yellow",
  OFFERED: "orange",
  ACCEPTED: "blue",
  ARRIVING_PICKUP: "blue",
  COLLECTED: "indigo",
  IN_DELIVERY: "indigo",
  ARRIVING_DESTINATION: "indigo",
  DELIVERED: "green",
  CANCELLED: "red",
  FAILED: "red",
};

// Transições permitidas (state machine)
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["SEARCHING_DRIVER", "CANCELLED"],
  SEARCHING_DRIVER: ["OFFERED", "CANCELLED", "FAILED"],
  OFFERED: ["ACCEPTED", "SEARCHING_DRIVER", "CANCELLED"],
  ACCEPTED: ["ARRIVING_PICKUP", "COLLECTED", "CANCELLED"],
  ARRIVING_PICKUP: ["COLLECTED", "CANCELLED"],
  COLLECTED: ["IN_DELIVERY", "ARRIVING_DESTINATION", "FAILED"],
  IN_DELIVERY: ["ARRIVING_DESTINATION", "DELIVERED", "FAILED"],
  ARRIVING_DESTINATION: ["DELIVERED", "FAILED"],
  DELIVERED: [],
  CANCELLED: [],
  FAILED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from]?.includes(to) ?? false;
}

// ============================================
// Stop - Parada da rota
// ============================================
export interface OrderStop {
  address: string;
  lat: number;
  lng: number;
  customerName: string;
  customerPhone: string;
  codValue?: number;
  notes?: string;
}

// ============================================
// Pricing - Valores do frete
// ============================================
export interface OrderPricing {
  totalFee: number;
  distanceKm: number;
  durationMinutes?: number;
  breakdown?: {
    baseFee: number;
    perKmFee: number;
    extraStopFee: number;
    total: number;
  };
}

// ============================================
// Order - Pedido completo
// ============================================
export interface Order {
  id: string;
  orderId: string;
  storeId: string;
  storeName: string;
  status: OrderStatus;
  assignedDriverId: string | null;
  rejectedDriverIds: string[];
  offerExpiresAt: any | null; // Firestore Timestamp
  deliveryCodeHash: string;
  pricing: OrderPricing;
  stops: OrderStop[];
  createdAt: any;
  acceptedAt?: any;
  collectedAt?: any;
  deliveredAt?: any;
  cancelledAt?: any;
  cancelReason?: string;
  // Comprovantes
  deliveryProofUrl?: string;
  deliverySignatureUrl?: string;
  // Audit
  statusHistory?: Array<{
    status: OrderStatus;
    at: any;
    by?: string;
  }>;
}