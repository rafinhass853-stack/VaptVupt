import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix dos ícones do Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Ícones customizados
const createIcon = (emoji: string, bgColor: string) =>
  L.divIcon({
    html: `<div style="background:${bgColor};width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);">${emoji}</div>`,
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });

export const driverOnlineIcon = createIcon("🛵", "#10b981");
export const driverBusyIcon = createIcon("🛵", "#3b82f6");
export const driverOfflineIcon = createIcon("🛵", "#94a3b8");
export const storeIcon = createIcon("🏪", "#f59e0b");
export const customerIcon = createIcon("📍", "#ef4444");

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  name: string;
  status: string;
  type: "driver" | "store" | "customer";
}

interface LiveMapProps {
  markers: MapMarker[];
  center?: [number, number];
  zoom?: number;
  polyline?: [number, number][];
  followMarker?: boolean;
}

// Componente que centraliza o mapa dinamicamente
function MapController({
  center,
  followMarker,
}: {
  center: [number, number];
  followMarker?: boolean;
}) {
  const map = useMap();
  const lastCenter = useRef<[number, number] | null>(null);

  useEffect(() => {
    if (followMarker && (!lastCenter.current || lastCenter.current[0] !== center[0] || lastCenter.current[1] !== center[1])) {
      map.flyTo(center, map.getZoom(), { duration: 1 });
      lastCenter.current = center;
    }
  }, [center, followMarker, map]);

  return null;
}

export default function LiveMap({
  markers,
  center = [-23.5613, -46.6565],
  zoom = 13,
  polyline,
  followMarker = false,
}: LiveMapProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: "100%", width: "100%" }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {polyline && polyline.length > 1 && (
        <Polyline
          positions={polyline}
          color="#3b82f6"
          weight={4}
          opacity={0.7}
          dashArray="10, 10"
        />
      )}
      {markers.map((marker) => {
        let icon = storeIcon;
        if (marker.type === "driver") {
          icon =
            marker.status === "ONLINE"
              ? driverOnlineIcon
              : marker.status === "IN_TRIP"
              ? driverBusyIcon
              : driverOfflineIcon;
        } else if (marker.type === "customer") {
          icon = customerIcon;
        }
        return (
          <Marker key={marker.id} position={[marker.lat, marker.lng]} icon={icon}>
            <Popup>
              <div className="font-sans">
                <strong>{marker.name}</strong>
                <br />
                <span className="text-sm">{marker.status}</span>
              </div>
            </Popup>
          </Marker>
        );
      })}
      <MapController center={center} followMarker={followMarker} />
    </MapContainer>
  );
}