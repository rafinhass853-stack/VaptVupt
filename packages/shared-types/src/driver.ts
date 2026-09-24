export type DriverStatus = "ONLINE" | "OFFLINE" | "IN_TRIP";

export type VehicleType = "MOTO" | "CARRO" | "BIKE" | "A_PE";

export const VEHICLE_LABELS: Record<VehicleType, string> = {
  MOTO: "Moto",
  CARRO: "Carro",
  BIKE: "Bicicleta",
  A_PE: "A pé",
};

export const VEHICLE_ICONS: Record<VehicleType, string> = {
  MOTO: "🛵",
  CARRO: "🚗",
  BIKE: "🚴",
  A_PE: "🚶",
};

export interface VehicleInfo {
  type: VehicleType;
  plate?: string;      // obrigatório para MOTO/CARRO
  brand?: string;      // marca (Honda, Yamaha, Fiat...)
  model?: string;      // modelo (CG 160, Uno...)
  color?: string;      // cor (Vermelha, Preta...)
  year?: number;       // ano
}

export interface DriverAddress {
  street: string;
  number: string;
  complement?: string;
  neighborhood?: string;
  city: string;
  state: string;
  zipCode?: string;
}

export interface Driver {
  id: string;
  uid: string;
  name: string;
  cpf?: string;
  phone?: string;
  email?: string;
  // Documentos
  cnhNumber?: string;       // número da CNH
  cnhCategory?: string;     // A, B, AB
  cnhExpiresAt?: string;    // data de validade (ISO)
  // Endereço
  address?: DriverAddress;
  // Veículo
  vehicleType: VehicleType;
  plate?: string;
  brand?: string;
  model?: string;
  color?: string;
  vehicleYear?: number;
  // Status
  status: DriverStatus;
  activeOrderId: string | null;
  fcmToken?: string;
  currentGeohash?: string;
  lat?: number;
  lng?: number;
  lastLocationUpdate?: any;
  lastHeartbeat?: any;
  approved?: boolean;
  blocked?: boolean;
  blockReason?: string;
  // Métricas
  totalDeliveries?: number;
  acceptanceRate?: number;
  cancellationRate?: number;
  rating?: number;
  createdAt: any;
  updatedAt?: any;
}

export const DRIVER_STATUS_LABELS: Record<DriverStatus, string> = {
  ONLINE: "Online",
  OFFLINE: "Offline",
  IN_TRIP: "Em rota",
};