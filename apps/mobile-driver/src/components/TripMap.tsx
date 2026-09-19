import { View, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";

interface TripMapProps {
  driverLat: number;
  driverLng: number;
  pickupLat: number;
  pickupLng: number;
  deliveryLat: number;
  deliveryLng: number;
}

export default function TripMap({
  driverLat,
  driverLng,
  pickupLat,
  pickupLng,
  deliveryLat,
  deliveryLng,
}: TripMapProps) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="initial-scale=1.0, maximum-scale=1.0">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        html, body, #map { margin: 0; padding: 0; height: 100%; width: 100%; }
        .marker-driver, .marker-pickup, .marker-delivery {
          width: 36px; height: 36px; border-radius: 50%; display: flex;
          align-items: center; justify-content: center; font-size: 18px;
          border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        .marker-driver { background: #3b82f6; }
        .marker-pickup { background: #f59e0b; }
        .marker-delivery { background: #10b981; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        const map = L.map('map').setView([${driverLat}, ${driverLng}], 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

        const driverIcon = L.divIcon({
          html: '<div class="marker-driver">🛵</div>',
          className: '', iconSize: [36, 36], iconAnchor: [18, 18]
        });
        const pickupIcon = L.divIcon({
          html: '<div class="marker-pickup">🏪</div>',
          className: '', iconSize: [36, 36], iconAnchor: [18, 18]
        });
        const deliveryIcon = L.divIcon({
          html: '<div class="marker-delivery">📍</div>',
          className: '', iconSize: [36, 36], iconAnchor: [18, 18]
        });

        L.marker([${driverLat}, ${driverLng}], { icon: driverIcon }).addTo(map);
        L.marker([${pickupLat}, ${pickupLng}], { icon: pickupIcon }).addTo(map);
        L.marker([${deliveryLat}, ${deliveryLng}], { icon: deliveryIcon }).addTo(map);

        // Linha poligonal entre os pontos
        const line = L.polyline([
          [${driverLat}, ${driverLng}],
          [${pickupLat}, ${pickupLng}],
          [${deliveryLat}, ${deliveryLng}]
        ], { color: '#3b82f6', weight: 4, opacity: 0.7, dashArray: '10, 10' }).addTo(map);

        map.fitBounds(line.getBounds(), { padding: [50, 50] });
      </script>
    </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <WebView
        originWhitelist={["*"]}
        source={{ html }}
        style={styles.webview}
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
    borderRadius: 16,
  },
  webview: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
});