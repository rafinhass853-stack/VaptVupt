export type TransactionType =
  | "CREDIT_PIX"
  | "CREDIT_CARD"
  | "CREDIT_MANUAL"
  | "DEBIT_DELIVERY"
  | "DEBIT_MANUAL"
  | "REFUND";

export interface Transaction {
  id: string;
  storeId: string;
  type: TransactionType;
  amount: number; // positivo = crédito, negativo = débito
  orderId: string | null;
  description: string;
  idempotencyKey?: string;
  balanceAfter?: number;
  createdAt: any;
  createdBy?: string;
}

export const TRANSACTION_LABELS: Record<TransactionType, string> = {
  CREDIT_PIX: "Recarga PIX",
  CREDIT_CARD: "Recarga Cartão",
  CREDIT_MANUAL: "Crédito manual",
  DEBIT_DELIVERY: "Frete",
  DEBIT_MANUAL: "Débito manual",
  REFUND: "Estorno",
};