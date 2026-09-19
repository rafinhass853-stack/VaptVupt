import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { doc, updateDoc, onSnapshot, collection, query, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { startLocationTracking, stopLocationTracking } from "../lib/location";
import OfferModal, { OfferData } from "../components/OfferModal";

export default function HomeScreen() {
  const { user, driver, logout } = useAuth();
  const [isOnline, setIsOnline] = useState(driver?.status !== "OFFLINE");
  const [loading, setLoading] = useState(false);
  const [offer, setOffer] = useState<OfferData | null>(null);
  const [showOffer, setShowOffer] = useState(false);

  useEffect(() => {
    setIsOnline(driver?.status !== "OFFLINE");
  }, [driver?.status]);

  // Escuta por ofertas: busca pedidos com status OFFERED e assignedDriverId == driver.id
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
          pickupAddress: data.storeName || "Loja",
          deliveryAddress: stops[stops.length - 1]?.address || "Destino",
          stopsCount: stops.length,
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
        // Ficar online
        await updateDoc(doc(db, "drivers", user.uid), {
          status: "ONLINE",
        });
        try {
          await startLocationTracking(user.uid);
        } catch (locErr: any) {
          Alert.alert(
            "Aviso",
            "Não foi possível ativar a localização: " + locErr.message
          );
        }
        setIsOnline(true);
      } else {
        // Ficar offline
        if (driver?.activeOrderId) {
          Alert.alert(
            "Atenção",
            "Você tem um pedido em andamento. Finalize antes de ficar offline."
          );
          return;
        }
        await updateDoc(doc(db, "drivers", user.uid), {
          status: "OFFLINE",
        });
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
      Alert.alert("Sucesso", "Rota aceita! Vá até a loja para coletar o pedido.");
    } catch (err: any) {
      Alert.alert("Erro ao aceitar", err.message);
      setShowOffer(false);
      setOffer(null);
    }
  };

  const handleRejectOffer = async () => {
    if (!offer || !user) return;

    try {
      // Marca como rejeitado
      await updateDoc(doc(db, "orders", offer.orderId), {
        status: "SEARCHING_DRIVER",
        assignedDriverId: null,
        offerExpiresAt: null,
        rejectedDriverIds: [...(offer as any).rejectedDriverIds || [], user.uid],
      });
    } catch (err) {
      console.error(err);
    }

    setShowOffer(false);
    setOffer(null);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Olá,</Text>
          <Text style={styles.name}>{driver?.name || "Motoboy"}</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      {/* Status card */}
      <View style={[styles.statusCard, isOnline && styles.statusCardOnline]}>
        <View style={styles.statusRow}>
          <View>
            <Text style={styles.statusLabel}>Status atual</Text>
            <Text style={styles.statusValue}>
              {isOnline ? "🟢 Online" : "⚫ Offline"}
            </Text>
          </View>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Switch
              value={isOnline}
              onValueChange={toggleOnline}
              trackColor={{ false: "#475569", true: "#10b981" }}
              thumbColor="#fff"
            />
          )}
        </View>
        <Text style={styles.statusHint}>
          {isOnline
            ? "Você está visível para receber ofertas"
            : "Fique online para receber ofertas"}
        </Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Ionicons name="bicycle" size={24} color="#3b82f6" />
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.statLabel}>Hoje</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="cash" size={24} color="#10b981" />
          <Text style={styles.statValue}>R$ 0,00</Text>
          <Text style={styles.statLabel}>Ganhos hoje</Text>
        </View>
      </View>

      {/* Info box */}
      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={22} color="#3b82f6" />
        <Text style={styles.infoText}>
          Quando você estiver online, os pedidos aparecerão automaticamente aqui.
        </Text>
      </View>

      {/* Offer Modal */}
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
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 40,
    marginBottom: 24,
  },
  greeting: {
    color: "#94a3b8",
    fontSize: 14,
  },
  name: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
  },
  logoutBtn: {
    padding: 8,
  },
  statusCard: {
    backgroundColor: "#1e293b",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  statusCardOnline: {
    backgroundColor: "#065f46",
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusLabel: {
    color: "#cbd5e1",
    fontSize: 13,
  },
  statusValue: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 4,
  },
  statusHint: {
    color: "#cbd5e1",
    fontSize: 12,
    marginTop: 12,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#1e293b",
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
  },
  statValue: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 8,
  },
  statLabel: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 2,
  },
  infoBox: {
    backgroundColor: "#1e3a8a",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoText: {
    color: "#bfdbfe",
    fontSize: 13,
    flex: 1,
  },
});