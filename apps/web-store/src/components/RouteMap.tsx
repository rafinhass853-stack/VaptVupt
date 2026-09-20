import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const createIcon = (emoji: string, bgColor: string) =>
  L.divIcon({
    html: `<div style="background:${bgColor};width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);">${emoji}</div>`,
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

const pickupIcon = createIcon("🏪", "#f59e0b");
const stopIcon = createIcon("📍", "#3b82f6");
const finalIcon = createIcon("🏁", "#ef4444");

function MapController({ bounds }: { bounds: L.LatLngBounds | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [bounds, map]);
  return null;
}

export interface RouteMapProps {
  stops: Array<{ lat: number; lng: number; name?: string }>;
  geometry?: [number, number][];
  height?: string;
}

export default function RouteMap({ stops, geometry, height = "400px" }: RouteMapProps) {
  if (stops.length === 0) {
    return (
      <div
        style={{ height }}
        className="bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 text-sm"
      >
        Digite endereços válidos para ver a rota
      </div>
    );
  }

  const center: [number, number] = [stops[0].lat, stops[0].lng];
  const polylinePositions: [number, number][] = geometry
    ? geometry.map(([lng, lat]) => [lat, lng])
    : stops.map((s) => [s.lat, s.lng]);

  const bounds = L.latLngBounds(polylinePositions);

  return (
    <div style={{ height }} className="rounded-xl overflow-hidden border border-slate-200">
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {stops.map((stop, i) => {
          const icon =
            i === 0 ? pickupIcon : i === stops.length - 1 ? finalIcon : stopIcon;
          return (
            <Marker key={i} position={[stop.lat, stop.lng]} icon={icon} />
          );
        })}
        {polylinePositions.length > 1 && (
          <Polyline
            positions={polylinePositions}
            color="#10b981"
            weight={5}
            opacity={0.8}
          />
        )}
        <MapController bounds={bounds} />
      </MapContainer>
    </div>
  );
}