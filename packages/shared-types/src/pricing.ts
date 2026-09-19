export interface PricingSettings {
  baseFee: number;
  baseKm: number;
  perKmFee: number;
  extraStopFee: number;
  // Futuro (multi-cidade)
  regionId?: string;
  surgeMultiplier?: number;
}

export function calculateOrderFee(
  settings: PricingSettings,
  distanceKm: number,
  stopsCount: number
): number {
  const extraStops = Math.max(0, stopsCount - 1);
  const billableKm = Math.max(0, distanceKm - settings.baseKm);
  return (
    settings.baseFee +
    billableKm * settings.perKmFee +
    extraStops * settings.extraStopFee
  );
}