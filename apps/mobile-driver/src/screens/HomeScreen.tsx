import { useEffect, useState } from "react";
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

export default function HomeScreen() {
  const { user, driver, logout } = useAuth();
  const [isOnline, setIsOnline] = useState(driver?.status !== "OFFLINE");
  const [loading, setLoading] = useState(false);
  const [offer, setOffer] = useState<OfferData | null>(null);
  const [showOffer, setShowOffer] = useState(false);

  useEffect(() => {
    setIsOnline(driver?.status !== "OFFLINE");
  }, [driver?.status]);

  // Heartbeat
  useEffect(() => {
    if (!user || !isOnline) return;
    const interval = setInterval(async () => {
      try {
        await updateDoc(doc(db, "drivers", user.uid), {
          lastHeartbeat: new Date(),
        });
      } catch (err) {
        console.error("Heartbeat error:", err);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [user, isOnline]);

  // Escuta ofertas
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
          totalFee: data.pricing?.totalFee || 0,
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
    setLoading(true);
    try {
      if (value) {
        await updateDoc(doc(db, "drivers", user.uid), { status: "ONLINE" });
        try {
          await startLocationTracking(user.uid);
        } catch (locErr: any) {
          Alert.alert("Aviso", "Não foi possível ativar a localização: " + locErr.message);
        }
        setIsOnline(true);
      } else {
        if (driver?.activeOrderId) {
          Alert.alert(
            "Atenção",
            "Você tem um pedido em andamento. Finalize antes de ficar offline."
          );
          return;
        }
        await updateDoc(doc(db, "drivers", user.uid), { status: "OFFLINE" });
        await stopLocationTracking();
        setIsOnline(false);
      }
    } catch (err: any) {
      Alert.alert("Erro", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOffer = async () => {
    if (!offer) return;
    try {
      const acceptFn = httpsCallable(functions, "acceptOrder");
      await acceptFn({ orderId: offer.orderId });
      setShowOffer(false);
      setOffer(null);
    } catch (err: any) {
      Alert.alert("Erro ao aceitar", err.message);
      setShowOffer(false);
      setOffer(null);
    }
  };

  const handleRejectOffer = async () => {
    if (!offer || !user) return;
    try {
      await updateDoc(doc(db, "orders", offer.orderId), {
        status: "SEARCHING_DRIVER",
        assignedDriverId: null,
        offerExpiresAt: null,
      });
    } catch (err) {
      console.error(err);
    }
    setShowOffer(false);
    setOffer(null);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.greetingContainer}>
            <Text style={styles.greeting}>Olá,</Text>
            <Text style={styles.name}>{driver?.name?.split(" ")[0] || "Motoboy"}</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={22} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Status Card */}
        <View
          style={[
            styles.statusCard,
            isOnline && styles.statusCardOnline,
          ]}
        >
          <View style={styles.statusHeader}>
            <View>
              <Text style={styles.statusLabel}>Status atual</Text>
              <View style={styles.statusValueRow}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: isOnline ? theme.colors.brand : theme.colors.textMuted },
                  ]}
                />
                <Text style={styles.statusValue}>
                  {isOnline ? "Online" : "Offline"}
                </Text>
              </View>
            </View>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Switch
                value={isOnline}
                onValueChange={toggleOnline}
                trackColor={{
                  false: theme.colors.bgTertiary,
                  true: theme.colors.brandLight,
                }}
                thumbColor="#fff"
              />
            )}
          </View>
          <Text style={styles.statusHint}>
            {isOnline
              ? "🟢 Você está visível para receber ofertas"
              : "Toque no switch para ficar online"}
          </Text>
        </View>

        {/* KPIs */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: "rgba(59,130,246,0.2)" }]}>
              <Ionicons name="bicycle" size={22} color="#3b82f6" />
            </View>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Entregas hoje</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: "rgba(16,185,129,0.2)" }]}>
              <Ionicons name="cash" size={22} color={theme.colors.brand} />
            </View>
            <Text style={styles.statValue}>R$ 0,00</Text>
            <Text style={styles.statLabel}>Ganhos hoje</Text>
          </View>
        </View>

        {/* Info */}
        <View style={styles.infoBox}>
          <View style={styles.infoIcon}>
            <Ionicons name="information-circle" size={20} color="#60a5fa" />
          </View>
          <Text style={styles.infoText}>
            Quando você estiver online, as ofertas aparecerão automaticamente. Mantenha o app aberto.
          </Text>
        </View>

        {/* Driver info */}
        {driver && (
          <View style={styles.profileCard}>
            <Text style={styles.profileLabel}>SEU PERFIL</Text>
            <View style={styles.profileRow}>
              <Ionicons name="card-outline" size={16} color={theme.colors.textMuted} />
              <Text style={styles.profileText}>
                CPF: {driver.cpf || "—"}
              </Text>
            </View>
            <View style={styles.profileRow}>
              <Ionicons name="car-outline" size={16} color={theme.colors.textMuted} />
              <Text style={styles.profileText}>
                Placa: {driver.plate || "—"} • {driver.vehicleType}
              </Text>
            </View>
            <View style={styles.profileRow}>
              <Ionicons name="call-outline" size={16} color={theme.colors.textMuted} />
              <Text style={styles.profileText}>
                {driver.phone || "—"}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      <OfferModal
        visible={showOffer}
        offer={offer}
        onAccept={handleAcceptOffer}
        onReject={handleRejectOffer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  scrollContent: { padding: 20, paddingTop: 50, paddingBottom: 40 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  greetingContainer: {},
  greeting: { color: theme.colors.textSecondary, fontSize: 14 },
  name: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: "bold",
    letterSpacing: -0.5,
  },
  logoutBtn: { padding: 8 },
  statusCard: {
    backgroundColor: theme.colors.bgCard,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statusCardOnline: {
    backgroundColor: "#064e3b",
    borderColor: theme.colors.brand,
  },
  statusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusLabel: { color: theme.colors.textSecondary, fontSize: 13 },
  statusValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusValue: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: "bold",
  },
  statusHint: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    marginTop: 12,
  },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  statValue: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: "bold",
  },
  statLabel: { color: theme.colors.textMuted, fontSize: 11, marginTop: 2 },
  infoBox: {
    backgroundColor: "rgba(59,130,246,0.15)",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.3)",
  },
  infoIcon: { paddingTop: 2 },
  infoText: { color: "#93c5fd", fontSize: 13, flex: 1, lineHeight: 18 },
  profileCard: {
    backgroundColor: theme.colors.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  profileLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 12,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  profileText: { color: theme.colors.textSecondary, fontSize: 13 },
});