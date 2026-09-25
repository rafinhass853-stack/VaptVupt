import { useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet, Text } from "react-native";
import { WebView } from "react-native-webview";
import { theme } from "../theme";

interface TripMapProps {
  driverLat: number;
  driverLng: number;
  pickupLat: number;
  pickupLng: number;
  deliveryLat: number;
  deliveryLng: number;
  activeLeg?: "TO_STORE" | "TO_CUSTOMER";
}

export default function TripMap({
  driverLat,
  driverLng,
  pickupLat,
  pickupLng,
  deliveryLat,
  deliveryLng,
  activeLeg = "TO_STORE",
}: TripMapProps) {
  const webRef = useRef<WebView>(null);
  const [routing, setRouting] = useState(true);

  const target = useMemo(
    () => activeLeg === "TO_CUSTOMER"
      ? { lat: deliveryLat, lng: deliveryLng, label: "Destino" }
      : { lat: pickupLat, lng: pickupLng, label: "Coleta" },
    [activeLeg, deliveryLat, deliveryLng, pickupLat, pickupLng]
  );

  useEffect(() => {
    setRouting(true);
    webRef.current?.injectJavaScript(`
      if (window.updateRoute) {
        window.updateRoute(${driverLat}, ${driverLng}, ${target.lat}, ${target.lng}, "${target.label}");
      }
      true;
    `);
  }, [driverLat, driverLng, target.lat, target.lng, target.label]);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        html, body, #map { margin: 0; padding: 0; height: 100%; width: 100%; background: #0f172a; }
        .marker { width: 34px; height: 34px; border-radius: 50%; display:flex; align-items:center; justify-content:center;
          border:3px solid white; box-shadow:0 2px 8px rgba(0,0,0,.35); font-size:17px; }
        .driver { background:#2563eb; }
        .pickup { background:#f59e0b; }
        .delivery { background:#10b981; }
        .route-badge { background:white; color:#111827; border-radius:10px; padding:7px 10px; font:600 12px Arial; box-shadow:0 2px 8px rgba(0,0,0,.25); }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        const map = L.map('map', { zoomControl: false }).setView([${driverLat}, ${driverLng}], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        const icon = (cls, emoji) => L.divIcon({
          html: '<div class="marker ' + cls + '">' + emoji + '</div>',
          className: '', iconSize:[34,34], iconAnchor:[17,17]
        });

        const driverMarker = L.marker([${driverLat}, ${driverLng}], {icon:icon('driver','🛵')}).addTo(map);
        const pickupMarker = L.marker([${pickupLat}, ${pickupLng}], {icon:icon('pickup','🏪')}).addTo(map);
        const deliveryMarker = L.marker([${deliveryLat}, ${deliveryLng}], {icon:icon('delivery','📍')}).addTo(map);

        let routeLine = null;
        let routeLabel = null;
        let lastRequest = 0;

        async function requestRoute(fromLat, fromLng, toLat, toLng, label) {
          const now = Date.now();
          if (now - lastRequest < 2500) return;
          lastRequest = now;
          const url = 'https://router.project-osrm.org/route/v1/driving/' +
            fromLng + ',' + fromLat + ';' + toLng + ',' + toLat +
            '?overview=full&geometries=geojson&steps=true';
          try {
            const response = await fetch(url);
            const json = await response.json();
            if (!json.routes || !json.routes.length) return;

            const route = json.routes[0];
            const coords = route.geometry.coordinates.map(p => [p[1], p[0]]);

            if (routeLine) map.removeLayer(routeLine);
            routeLine = L.polyline(coords, { color:'#2563eb', weight:6, opacity:.9 }).addTo(map);

            if (routeLabel) map.removeLayer(routeLabel);
            routeLabel = L.marker(coords[Math.min(2, coords.length - 1)], {
              icon: L.divIcon({
                html:'<div class="route-badge">🛵 ' + (route.distance / 1000).toFixed(1) +
                  ' km • ' + Math.ceil(route.duration / 60) + ' min</div>',
                className:'', iconAnchor:[0,0]
              })
            }).addTo(map);

            driverMarker.setLatLng([fromLat, fromLng]);
            map.fitBounds(routeLine.getBounds(), {padding:[55,55], maxZoom:16});
          } catch (e) {
            console.warn('route error', e);
          }
        }

        window.updateRoute = function(fromLat, fromLng, toLat, toLng, label) {
          driverMarker.setLatLng([fromLat, fromLng]);
          requestRoute(fromLat, fromLng, toLat, toLng, label);
        };

        requestRoute(${driverLat}, ${driverLng}, ${target.lat}, ${target.lng}, "${target.label}");
      </script>
    </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <WebView
        ref={webRef}
        originWhitelist={["*"]}
        source={{ html }}
        style={styles.webview}
        scrollEnabled={false}
        onLoadEnd={() => setRouting(false)}
      />
      {routing && (
        <View style={styles.routingBadge}>
          <Text style={styles.routingText}>Recalculando rota...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: "hidden", borderRadius: 16 },
  webview: { flex: 1, backgroundColor: theme.colors.bg },
  routingBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(15,23,42,.92)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  routingText: { color: "#fff", fontSize: 12, fontWeight: "700" },
});
