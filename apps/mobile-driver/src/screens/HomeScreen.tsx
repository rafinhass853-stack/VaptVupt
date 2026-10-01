import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { WebView } from "react-native-webview";
import {
  doc,
  updateDoc,
  onSnapshot,
  collection,
  query,
  where,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { startLocationTracking, stopLocationTracking } from "../lib/location";
import OfferModal, { OfferData } from "../components/OfferModal";
import { theme } from "../theme";

const MAP_HTML = `<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>html,body,#map{height:100%;width:100%;margin:0;background:#e8eef1} .leaflet-control-attribution{font-size:8px!important}</style></head>
<body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
const map=L.map('map',{zoomControl:false}).setView([-14.2,-51.9],4);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
let marker=null, circle=null;
window.updateDriverLocation=(lat,lng)=>{
 if(!Number.isFinite(lat)||!Number.isFinite(lng)) return;
 const point=[lat,lng];
 if(!marker){
   marker=L.marker(point,{icon:L.divIcon({className:'driver-marker',html:'<div style="width:22px;height:22px;border-radius:50%;background:#10b981;border:4px solid white;box-shadow:0 2px 8px #334155"></div>',iconSize:[30,30],iconAnchor:[15,15]})}).addTo(map);
   circle=L.circle(point,{radius:70,color:'#10b981',fillColor:'#10b981',fillOpacity:.12,weight:1}).addTo(map);
 }else{marker.setLatLng(point);circle.setLatLng(point);}
 map.setView(point,16,{animate:true});
};
</script></body></html>`;

export default function HomeScreen() {
  const { user, driver } = useAuth();
  const mapRef = useRef<WebView>(null);
  const [isOnline, setIsOnline] = useState(driver?.status !== "OFFLINE");
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(true);
  const [location, setLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [locationMessage, setLocationMessage] = useState("");
  const [offer, setOffer] = useState<OfferData | null>(null);
  const [showOffer, setShowOffer] = useState(false);

  useEffect(() => setIsOnline(driver?.status !== "OFFLINE"), [driver?.status]);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let mounted = true;

    const loadLocation = async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== "granted") {
          if (mounted) setLocationMessage("Permita o acesso à localização para mostrar sua posição no mapa.");
          return;
        }
        const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (mounted) {
          setLocation(current.coords);
          setLocationMessage("");
        }
        subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 8000, distanceInterval: 15 },
          (position) => mounted && setLocation(position.coords)
        );
      } catch {
        if (mounted) setLocationMessage("Não foi possível obter sua localização. Verifique o GPS do celular.");
      } finally {
        if (mounted) setLocationLoading(false);
      }
    };

    loadLocation();
    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, []);

  useEffect(() => {
    if (!location) return;
    mapRef.current?.injectJavaScript(
      `window.updateDriverLocation && window.updateDriverLocation(${location.latitude},${location.longitude}); true;`
    );
  }, [location]);

  useEffect(() => {
    if (!user || !isOnline) return;
    const interval = setInterval(async () => {
      try {
        await updateDoc(doc(db, "drivers", user.uid), { lastHeartbeat: new Date() });
      } catch (err) {
        console.warn("Heartbeat error:", err);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [user, isOnline]);

  useEffect(() => {
    if (!user || !driver) return;
    const q = query(
      collection(db, "orders"),
      where("status", "==", "OFFERED"),
      where("assignedDriverId", "==", user.uid)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const stops = data.stops || [];
        setOffer({
          orderId: docSnap.id,
          storeName: data.storeName || "Loja",
          totalFee: data.pricing?.driverPayout ?? data.pricing?.totalFee ?? 0,
          distanceKm: data.pricing?.distanceKm || 0,
          pickupAddress: stops[0]?.address || data.storeName || "Loja",
          deliveryAddress: stops[stops.length - 1]?.address || "Destino",
          stopsCount: stops.length,
          totalOrderValue: data.totalOrderValue || 0,
        });
        setShowOffer(true);
      });
    });
    return () => unsub();
  }, [user, driver]);

  const toggleOnline = async (value: boolean) => {
    if (!user) return;
    if (!value && driver?.activeOrderId) {
      Alert.alert("Corrida em andamento", "Finalize a entrega antes de ficar offline.");
      return;
    }

    setLoading(true);
    try {
      if (value) {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== "granted") {
          Alert.alert("Localização necessária", "Permita o acesso à localização para ficar online e receber corridas.");
          return;
        }
        await startLocationTracking(user.uid);
        await updateDoc(doc(db, "drivers", user.uid), { status: "ONLINE" });
        setIsOnline(true);
      } else {
        await updateDoc(doc(db, "drivers", user.uid), { status: "OFFLINE" });
        await stopLocationTracking();
        setIsOnline(false);
      }
    } catch (err: any) {
      Alert.alert("Não foi possível alterar o status", err?.message || "Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOffer = async () => {
    if (!offer) return;
    try {
      await httpsCallable(functions, "acceptOrder")({ orderId: offer.orderId });
      setShowOffer(false);
      setOffer(null);
    } catch (err: any) {
      Alert.alert("Erro ao aceitar corrida", err.message);
      setShowOffer(false);
      setOffer(null);
    }
  };

  const handleRejectOffer = async () => {
    if (!offer || !user) return;
    try {
      await httpsCallable(functions, "rejectOrder")({ orderId: offer.orderId });
    } catch (err) {
      console.warn("Erro ao recusar oferta:", err);
    }
    setShowOffer(false);
    setOffer(null);
  };

  const firstName = driver?.name?.trim().split(" ")[0] || "Motoboy";

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>VAPT VUPT • ENTREGADOR</Text>
            <Text style={styles.title}>Olá, {firstName}!</Text>
            <Text style={styles.subtitle}>Pronto para a próxima entrega?</Text>
          </View>
          <View style={styles.avatar}><Ionicons name="bicycle" size={25} color="#fff" /></View>
        </View>

        <View style={[styles.statusCard, isOnline && styles.statusCardOnline]}>
          <View style={styles.statusCopy}>
            <View style={styles.statusLine}>
              <View style={[styles.dot, { backgroundColor: isOnline ? "#34d399" : "#94a3b8" }]} />
              <Text style={styles.statusTitle}>{isOnline ? "Você está online" : "Você está offline"}</Text>
            </View>
            <Text style={styles.statusHint}>
              {isOnline ? "Você pode receber novas ofertas." : "Fique online para receber corridas."}
            </Text>
          </View>
          {loading ? <ActivityIndicator color="#fff" /> : (
            <Switch
              value={isOnline}
              onValueChange={toggleOnline}
              trackColor={{ false: "#64748b", true: "#6ee7b7" }}
              thumbColor="#fff"
              accessibilityLabel="Alternar disponibilidade"
            />
          )}
        </View>

        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionTitle}>Sua localização</Text>
            <Text style={styles.sectionSubtitle}>Posição atual no mapa</Text>
          </View>
          <TouchableOpacity
            style={styles.locateButton}
            onPress={async () => {
              try {
                const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
                setLocation(current.coords);
                setLocationMessage("");
              } catch {
                Alert.alert("Localização indisponível", "Confira se o GPS está ativado e tente novamente.");
              }
            }}
            accessibilityLabel="Atualizar localização no mapa"
          >
            <Ionicons name="locate" size={19} color={theme.colors.brand} />
          </TouchableOpacity>
        </View>

        <View style={styles.mapCard}>
          <WebView
            ref={mapRef}
            source={{ html: MAP_HTML }}
            originWhitelist={["*"]}
            javaScriptEnabled
            domStorageEnabled
            onLoadEnd={() => {
              if (location) mapRef.current?.injectJavaScript(
                `window.updateDriverLocation && window.updateDriverLocation(${location.latitude},${location.longitude}); true;`
              );
            }}
            style={styles.map}
          />
          <View style={styles.mapStatus}>
            <View style={[styles.mapStatusDot, { backgroundColor: location ? "#10b981" : "#f59e0b" }]} />
            <Text style={styles.mapStatusText}>
              {locationLoading ? "Localizando..." : location ? "Localização atualizada" : "Aguardando localização"}
            </Text>
          </View>
          {!location && !locationLoading && (
            <View style={styles.locationNotice}>
              <Ionicons name="location-outline" size={20} color="#fff" />
              <Text style={styles.locationNoticeText}>{locationMessage || "Ative a localização para visualizar sua posição."}</Text>
            </View>
          )}
        </View>

        <View style={styles.quickStats}>
          <View style={styles.quickStat}>
            <View style={styles.statIcon}><Ionicons name="bicycle-outline" size={19} color={theme.colors.brand} /></View>
            <View><Text style={styles.statValue}>{driver?.totalDeliveries ?? 0}</Text><Text style={styles.statLabel}>Entregas concluídas</Text></View>
          </View>
          <View style={styles.quickStat}>
            <View style={[styles.statIcon, styles.moneyIcon]}><Ionicons name="wallet-outline" size={19} color="#60a5fa" /></View>
            <View><Text style={styles.statValue}>Acompanhe</Text><Text style={styles.statLabel}>seus ganhos na aba Ganhos</Text></View>
          </View>
        </View>

        <View style={styles.tipCard}>
          <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.brand} />
          <Text style={styles.tipText}>Mantenha sua localização ativada durante as corridas para que a loja e o cliente acompanhem a entrega.</Text>
        </View>
      </ScrollView>

      <OfferModal visible={showOffer} offer={offer} onAccept={handleAcceptOffer} onReject={handleRejectOffer} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  content: { paddingHorizontal: 18, paddingTop: 22, paddingBottom: 28 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  eyebrow: { color: theme.colors.brandLight, fontSize: 10, fontWeight: "800", letterSpacing: 1.2, marginBottom: 6 },
  title: { color: theme.colors.text, fontSize: 27, fontWeight: "800", letterSpacing: -0.6 },
  subtitle: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 4 },
  avatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: theme.colors.brand, alignItems: "center", justifyContent: "center" },
  statusCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 17, borderRadius: 18, backgroundColor: theme.colors.bgCard, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 22 },
  statusCardOnline: { borderColor: "#059669", backgroundColor: "#073b32" },
  statusCopy: { flex: 1, paddingRight: 10 },
  statusLine: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  statusTitle: { color: theme.colors.text, fontSize: 16, fontWeight: "700" },
  statusHint: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 5 },
  sectionHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { color: theme.colors.text, fontSize: 18, fontWeight: "700" },
  sectionSubtitle: { color: theme.colors.textMuted, fontSize: 12, marginTop: 3 },
  locateButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: theme.colors.bgCard, borderWidth: 1, borderColor: theme.colors.border, alignItems: "center", justifyContent: "center" },
  mapCard: { height: 330, borderRadius: 20, overflow: "hidden", backgroundColor: "#e8eef1", borderWidth: 1, borderColor: theme.colors.border, marginBottom: 16 },
  map: { flex: 1, backgroundColor: "#e8eef1" },
  mapStatus: { position: "absolute", top: 12, left: 12, flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "#fff", borderRadius: 20, paddingHorizontal: 11, paddingVertical: 8, elevation: 3 },
  mapStatusDot: { width: 7, height: 7, borderRadius: 4 },
  mapStatusText: { color: "#334155", fontSize: 11, fontWeight: "700" },
  locationNotice: { position: "absolute", left: 16, right: 16, bottom: 16, flexDirection: "row", gap: 9, alignItems: "center", padding: 12, borderRadius: 12, backgroundColor: "rgba(15,23,42,0.88)" },
  locationNoticeText: { color: "#fff", flex: 1, fontSize: 12, lineHeight: 17 },
  quickStats: { flexDirection: "row", gap: 12, marginBottom: 14 },
  quickStat: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: theme.colors.bgCard, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 16, padding: 13 },
  statIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(16,185,129,0.15)", alignItems: "center", justifyContent: "center" },
  moneyIcon: { backgroundColor: "rgba(59,130,246,0.15)" },
  statValue: { color: theme.colors.text, fontSize: 15, fontWeight: "800" },
  statLabel: { color: theme.colors.textMuted, fontSize: 10, marginTop: 2, flexShrink: 1 },
  tipCard: { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: "rgba(16,185,129,0.08)", borderWidth: 1, borderColor: "rgba(16,185,129,0.2)", borderRadius: 14, padding: 14 },
  tipText: { color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18, flex: 1 },
});
