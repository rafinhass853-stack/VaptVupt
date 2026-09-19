import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import TripMap from "../components/TripMap";

interface Order {
  id: string;
  status: string;
  storeName: string;
  pricing: { totalFee: number; distanceKm: number };
  stops: any[];
  deliveryCodeHash?: string;
}

type TripStatus = "TO_STORE" | "AT_STORE" | "COLLECTED" | "TO_CUSTOMER" | "ARRIVED";

export default function ActiveTripScreen() {
  const { user, driver } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [tripStatus, setTripStatus] = useState<TripStatus>("TO_STORE");
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (!user || !driver?.activeOrderId) {
      setLoading(false);
      return;
    }
    const unsub = onSnapshot(
      doc(db, "orders", driver.activeOrderId),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setOrder({
            id: snap.id,
            status: data.status,
            storeName: data.storeName,
            pricing: data.pricing || { totalFee: 0, distanceKm: 0 },
            stops: data.stops || [],
          });
          if (data.status === "COLLECTED") setTripStatus("TO_CUSTOMER");
        }
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user, driver?.activeOrderId]);

  const handleCollect = async () => {
    if (!order) return;
    try {
      await updateDoc(doc(db, "orders", order.id), { status: "COLLECTED" });
      setTripStatus("TO_CUSTOMER");
    } catch (err: any) {
      Alert.alert("Erro", err.message);
    }
  };

  const handleArrived = () => {
    setTripStatus("ARRIVED");
    setShowCodeModal(true);
  };

  const handleVerifyCode = async () => {
    if (!order || code.length !== 4) {
      Alert.alert("Atenção", "Digite o código de 4 dígitos");
      return;
    }
    setVerifying(true);
    try {
      const verifyFn = httpsCallable(functions, "verifyDeliveryCode");
      await verifyFn({ orderId: order.id, code });
      setShowCodeModal(false);
      Alert.alert("Sucesso", "Entrega confirmada! 🎉");
    } catch (err: any) {
      Alert.alert("Erro", err.message || "Código inválido");
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="receipt-outline" size={64} color="#475569" />
        <Text style={styles.emptyText}>Nenhum pedido ativo</Text>
        <Text style={styles.emptySubtext}>
          Fique online para receber ofertas
        </Text>
      </View>
    );
  }

  const pickup = order.stops[0] || {};
  const delivery = order.stops[order.stops.length - 1] || {};

  return (
    <View style={styles.container}>
      {/* Mapa */}
      <View style={styles.mapContainer}>
        <TripMap
          driverLat={driver?.lat || -23.5613}
          driverLng={driver?.lng || -46.6565}
          pickupLat={pickup.lat || -23.5613}
          pickupLng={pickup.lng || -46.6565}
          deliveryLat={delivery.lat || -23.5613}
          deliveryLng={delivery.lng || -46.6565}
        />
      </View>

      {/* Info + Stepper */}
      <ScrollView style={styles.infoContainer} contentContainerStyle={styles.infoContent}>
        <View style={styles.feeBanner}>
          <Text style={styles.feeLabel}>Ganho desta corrida</Text>
          <Text style={styles.feeValue}>
            R$ {order.pricing.totalFee.toFixed(2)}
          </Text>
        </View>

        {/* Stepper */}
        <View style={styles.stepper}>
          <Step
            number={1}
            icon="storefront"
            title="A caminho da loja"
            subtitle={order.storeName}
            active={tripStatus === "TO_STORE"}
            done={["AT_STORE", "COLLECTED", "TO_CUSTOMER", "ARRIVED"].includes(tripStatus)}
          />
          <Step
            number={2}
            icon="cube"
            title="Coletei o pedido"
            subtitle="Confirmar coleta na loja"
            active={tripStatus === "AT_STORE"}
            done={["COLLECTED", "TO_CUSTOMER", "ARRIVED"].includes(tripStatus)}
          />
          <Step
            number={3}
            icon="navigate"
            title="A caminho do cliente"
            subtitle={delivery.address}
            active={tripStatus === "TO_CUSTOMER"}
            done={["ARRIVED"].includes(tripStatus)}
          />
          <Step
            number={4}
            icon="checkmark-circle"
            title="Cheguei ao destino"
            subtitle="Pedir código de confirmação"
            active={tripStatus === "ARRIVED"}
            done={false}
          />
        </View>

        {/* Botão de ação */}
        {tripStatus === "TO_STORE" && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: "#f59e0b" }]}
            onPress={() => setTripStatus("AT_STORE")}
          >
            <Ionicons name="checkmark" size={22} color="#fff" />
            <Text style={styles.actionButtonText}>Cheguei na Loja</Text>
          </TouchableOpacity>
        )}

        {tripStatus === "AT_STORE" && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: "#3b82f6" }]}
            onPress={handleCollect}
          >
            <Ionicons name="cube" size={22} color="#fff" />
            <Text style={styles.actionButtonText}>Coletei o Pedido</Text>
          </TouchableOpacity>
        )}

        {tripStatus === "TO_CUSTOMER" && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: "#10b981" }]}
            onPress={handleArrived}
          >
            <Ionicons name="location" size={22} color="#fff" />
            <Text style={styles.actionButtonText}>Cheguei ao Destino</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Modal do Código */}
      <Modal visible={showCodeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Código de Confirmação</Text>
            <Text style={styles.modalSubtitle}>
              Peça ao cliente o código de 4 dígitos
            </Text>
            <TextInput
              style={styles.codeInput}
              value={code}
              onChangeText={setCode}
              keyboardType="numeric"
              maxLength={4}
              placeholder="0000"
              placeholderTextColor="#475569"
            />
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: "#10b981" }]}
              onPress={handleVerifyCode}
              disabled={verifying}
            >
              {verifying ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={22} color="#fff" />
                  <Text style={styles.actionButtonText}>Confirmar Entrega</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowCodeModal(false)}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Step({
  number,
  icon,
  title,
  subtitle,
  active,
  done,
}: {
  number: number;
  icon: any;
  title: string;
  subtitle: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <View style={styles.stepRow}>
      <View
        style={[
          styles.stepCircle,
          done && styles.stepCircleDone,
          active && styles.stepCircleActive,
        ]}
      >
        <Ionicons
          name={done ? "checkmark" : icon}
          size={16}
          color={done || active ? "#fff" : "#64748b"}
        />
      </View>
      <View style={styles.stepTextContainer}>
        <Text style={[styles.stepTitle, active && styles.stepTitleActive]}>
          {title}
        </Text>
        <Text style={styles.stepSubtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  emptyText: { color: "#fff", fontSize: 20, fontWeight: "bold", marginTop: 16 },
  emptySubtext: { color: "#94a3b8", fontSize: 14, marginTop: 8 },
  mapContainer: { height: "40%", padding: 12 },
  infoContainer: {
    flex: 1,
    backgroundColor: "#1e293b",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
  },
  infoContent: { padding: 20, paddingBottom: 40 },
  feeBanner: {
    backgroundColor: "#065f46",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: "center",
  },
  feeLabel: { color: "#6ee7b7", fontSize: 12, fontWeight: "600" },
  feeValue: { color: "#fff", fontSize: 32, fontWeight: "bold", marginTop: 4 },
  stepper: { marginBottom: 20 },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 12,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#334155",
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircleActive: { backgroundColor: "#3b82f6" },
  stepCircleDone: { backgroundColor: "#10b981" },
  stepTextContainer: { flex: 1, paddingTop: 4 },
  stepTitle: { color: "#94a3b8", fontSize: 14, fontWeight: "600" },
  stepTitleActive: { color: "#fff" },
  stepSubtitle: { color: "#64748b", fontSize: 12, marginTop: 2 },
  actionButton: {
    flexDirection: "row",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 8,
  },
  actionButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#1e293b",
    padding: 24,
    borderRadius: 20,
    width: "100%",
    maxWidth: 400,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
  },
  modalSubtitle: {
    color: "#94a3b8",
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 20,
  },
  codeInput: {
    backgroundColor: "#0f172a",
    color: "#fff",
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    padding: 16,
    borderRadius: 12,
    letterSpacing: 12,
    marginBottom: 20,
  },
  cancelButton: { marginTop: 12, alignItems: "center", padding: 12 },
  cancelText: { color: "#94a3b8", fontSize: 14 },
});