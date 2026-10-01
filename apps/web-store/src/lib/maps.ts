/**
 * Geocoding (Nominatim) + routing (OSRM) for the store portal.
 * Free public endpoints; respect rate limits in production.
 */

export interface GeocodedAddress {
  displayName: string;
  lat: number;
  lng: number;
}

export interface RouteResult {
  distanceKm: number;
  durationMinutes: number;
  geometry: [number, number][]; // [lng, lat] (OSRM GeoJSON order)
}

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const OSRM_BASE = "https://router.project-osrm.org";

export async function autocompleteAddress(query: string): Promise<GeocodedAddress[]> {
  if (!query || query.trim().length < 3) return [];
  const url =
    `${NOMINATIM_BASE}/search?format=jsonv2&limit=5&countrycodes=br&q=` +
    encodeURIComponent(query.trim());
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) return [];
  const data = (await response.json()) as any[];
  return (data || []).map((item) => ({
    displayName: item.display_name,
    lat: Number(item.lat),
    lng: Number(item.lon),
  }));
}

export async function calculateRoute(
  stops: Array<{ lat: number; lng: number }>
): Promise<RouteResult> {
  if (stops.length < 2) {
    return { distanceKm: 0, durationMinutes: 0, geometry: [] };
  }

  const coordinates = stops.map((s) => `${s.lng},${s.lat}`).join(";");
  const url = `${OSRM_BASE}/route/v1/driving/${coordinates}?overview=full&geometries=geojson`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`OSRM error: ${response.status}`);
  }

  const data = (await response.json()) as any;
  if (!data.routes || data.routes.length === 0) {
    throw new Error("Nenhuma rota encontrada");
  }

  const route = data.routes[0];
  return {
    distanceKm: route.distance / 1000,
    durationMinutes: Math.round(route.duration / 60),
    geometry: (route.geometry?.coordinates || []) as [number, number][],
  };
}
