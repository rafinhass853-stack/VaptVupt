export interface GeocodedAddress {
  displayName: string;
  lat: number;
  lng: number;
}

export interface RouteResult {
  distanceKm: number;
  durationMinutes: number;
  geometry?: [number, number][];
}

export async function autocompleteAddress(query: string): Promise<GeocodedAddress[]> {
  const url =
    "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=br&q=" +
    encodeURIComponent(query);
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) return [];
  const data = await response.json();
  return data.map((item: any) => ({
    displayName: item.display_name,
    lat: Number(item.lat),
    lng: Number(item.lon),
  }));
}

export async function calculateRoute(
  points: Array<{ lat: number; lng: number }>
): Promise<RouteResult> {
  if (points.length < 2) throw new Error("São necessários pelo menos dois pontos.");

  const coordinates = points.map((p) => `${p.lng},${p.lat}`).join(";");
  const url =
    `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Não foi possível calcular a rota.");
  const data = await response.json();
  const route = data?.routes?.[0];
  if (!route) throw new Error("Rota não encontrada.");

  return {
    distanceKm: Number(route.distance) / 1000,
    durationMinutes: Math.max(1, Math.round(Number(route.duration) / 60)),
    geometry: route.geometry?.coordinates?.map(
      ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
    ),
  };
}
