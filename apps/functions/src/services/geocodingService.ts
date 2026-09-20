/**
 * Geocoding via Nominatim (OpenStreetMap) + Roteamento via OSRM.
 * Gratuito, sem chave. Uso apenas server-side (respeita rate limits).
 */

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const OSRM_BASE = "https://router.project-osrm.org";
const USER_AGENT = "VaptVupt/1.0 (logtech platform)";

export interface GeocodedAddress {
  lat: number;
  lng: number;
  displayName: string;
}

export interface RouteResult {
  distanceKm: number;
  durationMinutes: number;
  geometry: [number, number][]; // [lng, lat] (formato OSRM)
}

/**
 * Geocodifica um endereço em coordenadas.
 */
export async function geocodeAddress(address: string): Promise<GeocodedAddress | null> {
  const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(
    address
  )}&format=json&limit=1&countrycodes=br`;

  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!response.ok) {
    console.error(`Nominatim erro: ${response.status}`);
    return null;
  }

  const data = (await response.json()) as any[];
  if (!data || data.length === 0) return null;

  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    displayName: data[0].display_name,
  };
}

/**
 * Calcula rota entre múltiplos pontos usando OSRM.
 * @param stops Array de { lat, lng } na ordem desejada
 */
export async function calculateRoute(
  stops: Array<{ lat: number; lng: number }>
): Promise<RouteResult | null> {
  if (stops.length < 2) return null;

  // OSRM usa [lng, lat] e separa por ;
  const coordinates = stops.map((s) => `${s.lng},${s.lat}`).join(";");
  const url = `${OSRM_BASE}/route/v1/driving/${coordinates}?overview=full&geometries=geojson`;

  const response = await fetch(url);
  if (!response.ok) {
    console.error(`OSRM erro: ${response.status}`);
    return null;
  }

  const data = (await response.json()) as any;
  if (!data.routes || data.routes.length === 0) return null;

  const route = data.routes[0];
  const geometry = route.geometry.coordinates as [number, number][];

  return {
    distanceKm: route.distance / 1000,
    durationMinutes: Math.round(route.duration / 60),
    geometry,
  };
}

/**
 * Autocomplete via Nominatim.
 */
export async function autocompleteAddress(query: string): Promise<GeocodedAddress[]> {
  const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(
    query
  )}&format=json&limit=5&countrycodes=br`;

  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!response.ok) return [];

  const data = (await response.json()) as any[];
  return data.map((d) => ({
    lat: parseFloat(d.lat),
    lng: parseFloat(d.lon),
    displayName: d.display_name,
  }));
}