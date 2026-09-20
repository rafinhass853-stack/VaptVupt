import * as geofire from "geofire-common";

export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  return geofire.distanceBetween([lat1, lng1], [lat2, lng2]);
}

export function geohashFor(lat: number, lng: number): string {
  return geofire.geohashForLocation([lat, lng]);
}

export function geohashQueryBounds(
  lat: number,
  lng: number,
  radiusKm: number
): string[][] {
  return geofire.geohashQueryBounds([lat, lng], radiusKm * 1000);
}