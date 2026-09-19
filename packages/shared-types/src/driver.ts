export type DriverStatus = "ONLINE" | "OFFLINE" | "IN_TRIP";

export type VehicleType = "MOTO" | "CARRO" | "BIKE";

export interface Driver {
  id: string;
  uid: string;
  name: string;
  cpf?: string;
  phone?: string;
  email?: string;
  plate?: string;
  vehicleType: VehicleType;
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
  // Métricas (para matching futuro)
  totalDeliveries?: number;
  acceptanceRate?: number;
  cancellationRate?: number;
  rating?: number;
  // Audit
  createdAt: any;
  updatedAt?: any;
}

export const VEHICLE_LABELS: Record<VehicleType, string> = {
  MOTO: "Moto",
  CARRO: "Carro",
  BIKE: "Bicicleta",
};

export const DRIVER_STATUS_LABELS: Record<DriverStatus, string> = {
  ONLINE: "Online",
  OFFLINE: "Offline",
  IN_TRIP: "Em rota",
};