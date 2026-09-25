export interface GeocodedAddress { displayName: string; lat: number; lng: number; }
export async function autocompleteAddress(query: string): Promise<GeocodedAddress[]> {
  const url = "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=br&q="+encodeURIComponent(query);
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) return [];
  const data = await response.json();
  return data.map((item: any) => ({ displayName: item.display_name, lat: Number(item.lat), lng: Number(item.lon) }));
}
