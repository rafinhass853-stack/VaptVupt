import { HttpsError } from "firebase-functions/v2/https";

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

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["SEARCHING_DRIVER", "CANCELLED"],
  SEARCHING_DRIVER: ["OFFERED", "CANCELLED", "FAILED"],
  OFFERED: ["ACCEPTED", "SEARCHING_DRIVER", "CANCELLED"],
  ACCEPTED: ["ARRIVING_PICKUP", "COLLECTED", "CANCELLED"],
  ARRIVING_PICKUP: ["COLLECTED", "CANCELLED"],
  COLLECTED: ["IN_DELIVERY", "ARRIVING_DESTINATION", "DELIVERED"],
  IN_DELIVERY: ["ARRIVING_DESTINATION", "DELIVERED", "FAILED"],
  ARRIVING_DESTINATION: ["DELIVERED", "FAILED"],
  DELIVERED: [],
  CANCELLED: [],
  FAILED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) {
    throw new HttpsError(
      "failed-precondition",
      `Transição inválida: ${from} → ${to}`
    );
  }
}