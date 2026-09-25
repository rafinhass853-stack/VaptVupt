import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView,
  ActivityIndicator, Modal, TextInput, Linking, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { doc, onSnapshot } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import TripMap from "../components/TripMap";
import { theme } from "../theme";

interface Order {
  id: string;
  status: string;
  storeName: string;
  storePhone?: string;
  pricing: { totalFee: number; distanceKm: number };
  stops: any[];
  totalOrderValue?: number;
}

type TripStep = "TO_STORE" | "AT_STORE" | "TO_CUSTOMER" | "ARRIVED";

export default function ActiveTripScreen() {
  const { user, driver } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<TripStep>("TO_STORE");
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [expandedStop, setExpandedStop] = useState<number | null>(0);

  useEffect(() => {
    if (!user || !driver?.activeOrderId) { setLoading(false); return; }
    const unsub = onSnapshot(doc(db, "orders", driver.activeOrderId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setOrder({
          id: snap.id,
          status: data.status,
          storeName: data.storeName,
          storePhone: data.storePhone,
          pricing: data.pricing || { totalFee: 0, distanceKm: 0 },
          stops: data.stops || [],
          totalOrderValue: data.totalOrderValue,
        });
        if (data.status === "COLLECTED" || data.status === "IN_DELIVERY") setStep("TO_CUSTOMER");
      }
      setLoading(false);
    });
    return () => unsub();
  }, [user, driver?.activeOrderId]);

  const handleCollect = async () => {
    if (!order) return;
    try {
      const updateFn = httpsCallable(functions, "updateOrderStatus");
      await updateFn({ orderId: order.id, status: "COLLECTED" });
      setStep("TO_CUSTOMER");
    } catch (err: any) { Alert.alert("Erro", err.message); }
  };

  const handleArrived = async () => {
    if (!order) return;
    try {
      const updateFn = httpsCallable(functions, "updateOrderStatus");
      await updateFn({ orderId: order.id, status: "ARRIVING_DESTINATION" });
      setStep("ARRIVED");
      setShowCodeModal(true);
    } catch (err: any) { Alert.alert("Erro", err.message || "Não foi possível atualizar o status."); }
  };

  const handleVerifyCode = async () => {
    if (!order || code.length !== 4) { Alert.alert("Atenção", "Digite o PIN de 4 dígitos"); return; }
    setVerifying(true);
    try {
      const verifyFn = httpsCallable(functions, "verifyDeliveryCode");
      await verifyFn({ orderId: order.id, code });
      setShowCodeModal(false);
      setCode("");
      Alert.alert("🎉 Entrega concluída!", "Obrigado!");
    } catch (err: any) {
      Alert.alert("Erro", err.message || "PIN inválido");
    } finally { setVerifying(false); }
  };

  const openMaps = (lat: number, lng: number, label: string) => {
    const scheme = Platform.select({ ios: "maps:0,0?q=", android: "geo:0,0?q=" });
    const url = `${scheme}${lat},${lng}(${encodeURIComponent(label)})`;
    Linking.openURL(url);
  };

  if (loading) return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={theme.colors.brand} />
    </View>
  );

  if (!order) return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Ionicons name="bicycle-outline" size={34} color={theme.colors.brandLight} />
      </View>
      <Text style={styles.emptyTitle}>Nenhuma corrida em andamento</Text>
      <Text style={styles.emptyText}>Quando você aceitar uma corrida, os detalhes, a rota e as próximas etapas aparecerão aqui.</Text>
      <View style={styles.emptyHint}>
        <Ionicons name="information-circle-outline" size={18} color={theme.colors.info} />
        <Text style={styles.emptyHintText}>As novas ofertas aparecem na tela Início.</Text>
      </View>
    </View>
  );

  const pickup = order.stops[0] || {};
  const delivery = order.stops[order.stops.length - 1] || {};

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <TripMap
          driverLat={driver?.lat || -23.5613}
          driverLng={driver?.lng || -46.6565}
          pickupLat={pickup.lat || -23.5613}
          pickupLng={pickup.lng || -46.6565}
          deliveryLat={delivery.lat || -23.5613}
          deliveryLng={delivery.lng || -46.6565}
          activeLeg={step === "TO_CUSTOMER" || step === "ARRIVED" ? "TO_CUSTOMER" : "TO_STORE"}
        />
      </View>

      <ScrollView style={styles.infoContainer} contentContainerStyle={styles.infoContent}>
        <View style={styles.tripHeader}>
          <View>
            <Text style={styles.tripEyebrow}>CORRIDA EM ANDAMENTO</Text>
            <Text style={styles.tripHeading}>Acompanhe sua entrega</Text>
          </View>
          <View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveText}>ATIVA</Text></View>
        </View>
        {/* Fee */}
        <View style={styles.feeBanner}>
          <View>
            <Text style={styles.feeLabel}>Ganho desta corrida</Text>
            <Text style={styles.feeValue}>R$ {order.pricing.totalFee.toFixed(2)}</Text>
          </View>
          {order.totalOrderValue ? (
            <View style={styles.codContainer}>
              <Text style={styles.codLabel}>Cobrar do cliente</Text>
              <Text style={styles.codValue}>R$ {order.totalOrderValue.toFixed(2)}</Text>
            </View>
          ) : null}
        </View>

        {/* Stepper */}
        <View style={styles.stepper}>
          <Step number={1} icon="storefront" title="A caminho da loja" subtitle={order.storeName}
            active={step === "TO_STORE"} done={["AT_STORE","TO_CUSTOMER","ARRIVED"].includes(step)} />
          <Step number={2} icon="cube" title="Coletar pedido" subtitle="Confirmar retirada"
            active={step === "AT_STORE"} done={["TO_CUSTOMER","ARRIVED"].includes(step)} />
          <Step number={3} icon="navigate" title="A caminho do cliente" subtitle={delivery.customerName}
            active={step === "TO_CUSTOMER"} done={["ARRIVED"].includes(step)} />
          <Step number={4} icon="checkmark-circle" title="Entregar" subtitle="Pedir PIN ao cliente"
            active={step === "ARRIVED"} done={false} />
        </View>

        {/* Stops details */}
        <View style={styles.navigationHint}><Ionicons name="navigate" size={18} color={theme.colors.info} /><Text style={styles.navigationHintText}>{step === "TO_CUSTOMER" || step === "ARRIVED" ? "Rota ativa: destino do cliente" : "Rota ativa: coleta na loja"} · se sair da rota, o trajeto é recalculado automaticamente.</Text></View>

        <Text style={styles.sectionLabel}>PARADAS ({order.stops.length})</Text>
        {order.stops.map((stop: any, i: number) => (
          <TouchableOpacity key={i} style={styles.stopCard} onPress={() => setExpandedStop(expandedStop === i ? null : i)}>
            <View style={styles.stopHeader}>
              <View style={styles.stopNumber}><Text style={styles.stopNumberText}>{i + 1}</Text></View>
              <View style={styles.stopHeaderText}>
                <Text style={styles.stopName}>{stop.customerName}</Text>
                <Text style={styles.stopAddress} numberOfLines={1}>{stop.address}</Text>
              </View>
              <TouchableOpacity style={styles.navigateBtn} onPress={() => openMaps(stop.lat, stop.lng, stop.customerName)}>
                <Ionicons name="navigate" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
            {expandedStop === i && (
              <View style={styles.stopDetails}>
                <Text style={styles.stopDetailText}>📞 {stop.customerPhone}</Text>
                {stop.items && stop.items.map((item: any, j: number) => (
                  <Text key={j} style={styles.stopItemText}>{item.quantidade}× {item.nome} — R$ {(item.quantidade * item.valorUnitario).toFixed(2)}</Text>
                ))}
                {stop.totalValue && (
                  <Text style={styles.stopTotal}>Total: R$ {stop.totalValue.toFixed(2)}</Text>
                )}
                {stop.paymentMethod === "DINHEIRO" && stop.trocoPara && (
                  <Text style={styles.stopDetailText}>💵 Troco para R$ {stop.trocoPara.toFixed(2)}</Text>
                )}
              </View>
            )}
          </TouchableOpacity>
        ))}

        {/* Action button */}
        {step === "TO_STORE" && (
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: "#f59e0b" }]} onPress={async () => { try { const updateFn = httpsCallable(functions, "updateOrderStatus"); await updateFn({ orderId: order.id, status: "ARRIVING_PICKUP" }); setStep("AT_STORE"); } catch (err: any) { Alert.alert("Erro", err.message || "Não foi possível atualizar o status."); } }}>
            <Ionicons name="checkmark" size={22} color="#fff" />
            <Text style={styles.actionButtonText}>Cheguei na Loja</Text>
          </TouchableOpacity>
        )}
        {step === "AT_STORE" && (
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.colors.info }]} onPress={handleCollect}>
            <Ionicons name="cube" size={22} color="#fff" />
            <Text style={styles.actionButtonText}>Coletei o Pedido</Text>
          </TouchableOpacity>
        )}
        {step === "TO_CUSTOMER" && (
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.colors.brand }]} onPress={handleArrived}>
            <Ionicons name="location" size={22} color="#fff" />
            <Text style={styles.actionButtonText}>Cheguei ao Destino</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Code Modal */}
      <Modal visible={showCodeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIcon}><Ionicons name="key" size={28} color={theme.colors.brand} /></View>
            <Text style={styles.modalTitle}>PIN de Entrega</Text>
            <Text style={styles.modalSubtitle}>Peça ao cliente o código de 4 dígitos</Text>
            <TextInput style={styles.codeInput} value={code} onChangeText={setCode} keyboardType="numeric"
              maxLength={4} placeholder="0000" placeholderTextColor={theme.colors.textMuted} autoFocus />
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.colors.brand }]} onPress={handleVerifyCode} disabled={verifying}>
              {verifying ? <ActivityIndicator color="#fff" /> : (
                <><Ionicons name="checkmark-circle" size={22} color="#fff" />
                <Text style={styles.actionButtonText}>Confirmar Entrega</Text></>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowCodeModal(false)}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Step({ number, icon, title, subtitle, active, done }: any) {
  return (
    <View style={styles.stepRow}>
      <View style={[styles.stepCircle, done && styles.stepCircleDone, active && styles.stepCircleActive]}>
        <Ionicons name={done ? "checkmark" : icon} size={16} color={done || active ? "#fff" : theme.colors.textMuted} />
      </View>
      <View style={styles.stepTextContainer}>
        <Text style={[styles.stepTitle, active && styles.stepTitleActive]}>{title}</Text>
        <Text style={styles.stepSubtitle} numberOfLines={1}>{subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  loadingContainer: { flex: 1, backgroundColor: theme.colors.bg, justifyContent: "center", alignItems: "center" },
  emptyContainer: { flex: 1, backgroundColor: theme.colors.bg, justifyContent: "center", alignItems: "center", padding: 28 },
  emptyIcon: { width: 76, height: 76, borderRadius: 24, backgroundColor: "rgba(16,185,129,0.13)", alignItems: "center", justifyContent: "center", marginBottom: 18 },
  emptyTitle: { color: theme.colors.text, fontSize: 20, fontWeight: "800", textAlign: "center" },
  emptyText: { color: theme.colors.textSecondary, fontSize: 13, lineHeight: 20, marginTop: 9, textAlign: "center", maxWidth: 300 }, 
  emptyHint: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(59,130,246,0.1)", borderRadius: 12, padding: 12, marginTop: 20 },
  emptyHintText: { color: theme.colors.textSecondary, fontSize: 11, flexShrink: 1 },
  mapContainer: { height: "38%", padding: 12 },
  infoContainer: { flex: 1, backgroundColor: theme.colors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -16 },
  infoContent: { padding: 18, paddingBottom: 40 },
  tripHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  tripEyebrow: { color: theme.colors.brandLight, fontSize: 9, fontWeight: "800", letterSpacing: 1.1, marginBottom: 4 },
  tripHeading: { color: theme.colors.text, fontSize: 18, fontWeight: "800" },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(16,185,129,0.14)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 7 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.brandLight },
  liveText: { color: theme.colors.brandLight, fontSize: 9, fontWeight: "800" },
  feeBanner: { backgroundColor: "#064e3b", padding: 16, borderRadius: 16, marginBottom: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  feeLabel: { color: theme.colors.brandLight, fontSize: 12, fontWeight: "600" },
  feeValue: { color: "#fff", fontSize: 28, fontWeight: "bold", marginTop: 4 },
  codContainer: { alignItems: "flex-end" },
  codLabel: { color: theme.colors.brandLight, fontSize: 10, fontWeight: "600" },
  codValue: { color: "#fff", fontSize: 18, fontWeight: "bold", marginTop: 2 },
  stepper: { marginBottom: 20 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 16, gap: 12 },
  stepCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.bgTertiary, alignItems: "center", justifyContent: "center" },
  stepCircleActive: { backgroundColor: theme.colors.info },
  stepCircleDone: { backgroundColor: theme.colors.brand },
  stepTextContainer: { flex: 1, paddingTop: 5 },
  stepTitle: { color: theme.colors.textMuted, fontSize: 14, fontWeight: "600" },
  stepTitleActive: { color: theme.colors.text },
  stepSubtitle: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2 },
  navigationHint: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(59,130,246,0.12)", borderWidth: 1, borderColor: "rgba(59,130,246,0.25)", borderRadius: 12, padding: 12, marginBottom: 16 },
  navigationHintText: { flex: 1, color: "#93c5fd", fontSize: 12, lineHeight: 17 },
  sectionLabel: { color: theme.colors.textMuted, fontSize: 11, fontWeight: "700", letterSpacing: 1, marginBottom: 10, marginTop: 8 },
  stopCard: { backgroundColor: theme.colors.bgCard, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: theme.colors.border },
  stopHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  stopNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.colors.brand, alignItems: "center", justifyContent: "center" },
  stopNumberText: { color: "#fff", fontWeight: "bold", fontSize: 13 },
  stopHeaderText: { flex: 1 },
  stopName: { color: theme.colors.text, fontSize: 14, fontWeight: "600" },
  stopAddress: { color: theme.colors.textMuted, fontSize: 11, marginTop: 2 },
  navigateBtn: { backgroundColor: theme.colors.info, padding: 8, borderRadius: 8 },
  stopDetails: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.border },
  stopDetailText: { color: theme.colors.textSecondary, fontSize: 12, marginBottom: 4 },
  stopItemText: { color: theme.colors.text, fontSize: 12, marginBottom: 2 },
  stopTotal: { color: theme.colors.brand, fontSize: 13, fontWeight: "bold", marginTop: 6 },
  actionButton: { flexDirection: "row", padding: 18, borderRadius: 12, alignItems: "center", justifyContent: "center", gap: 10, marginTop: 12 },
  actionButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalContent: { backgroundColor: theme.colors.bgCard, padding: 24, borderRadius: 20, width: "100%", maxWidth: 400, borderWidth: 1, borderColor: theme.colors.border },
  modalIcon: { alignSelf: "center", backgroundColor: "rgba(16,185,129,0.2)", padding: 12, borderRadius: 16, marginBottom: 12 },
  modalTitle: { color: theme.colors.text, fontSize: 22, fontWeight: "bold", textAlign: "center" },
  modalSubtitle: { color: theme.colors.textSecondary, fontSize: 13, textAlign: "center", marginTop: 4, marginBottom: 20 },
  codeInput: { backgroundColor: theme.colors.bg, color: theme.colors.text, fontSize: 32, fontWeight: "bold", textAlign: "center", padding: 16, borderRadius: 12, letterSpacing: 12, marginBottom: 20, borderWidth: 1, borderColor: theme.colors.border },
  cancelButton: { marginTop: 12, alignItems: "center", padding: 12 },
  cancelText: { color: theme.colors.textSecondary, fontSize: 14 },
});