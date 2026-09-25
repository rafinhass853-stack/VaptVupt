export interface PricingSettings {
  baseFee:number;
  minimumFee:number;
  baseKm:number;
  perKmFee:number;
  extraStopFee:number;
  platformPercent:number;
  regionId?:string;
  surgeMultiplier?:number;
}

export function calculateOrderFee(settings:PricingSettings,distanceKm:number,stopsCount:number):number{
  const extraStops=Math.max(0,stopsCount-1);
  const billableKm=Math.max(0,distanceKm-settings.baseKm);
  const calculated=settings.baseFee+billableKm*settings.perKmFee+extraStops*settings.extraStopFee;
  return Math.max(settings.minimumFee,calculated);
}

export function splitOrderFee(totalFee:number,platformPercent:number){
  const platformFee=Math.max(0,totalFee)*Math.min(100,Math.max(0,platformPercent))/100;
  return {platformFee,driverPayout:Math.max(0,totalFee-platformFee)};
}
