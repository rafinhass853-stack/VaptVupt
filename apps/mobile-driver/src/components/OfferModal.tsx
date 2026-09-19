import { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Vibration,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface OfferData {
  orderId: string;
  storeName: string;
  totalFee: number;
  distanceKm: number;
  pickupAddress: string;
  deliveryAddress: string;
  stopsCount: number;
}

interface OfferModalProps {
  visible: boolean;
  offer: OfferData | null;
  onAccept: () => void;
  onReject: () => void;
}

export default function OfferModal({
  visible,
  offer,
  onAccept,
  onReject,
}: OfferModalProps) {
  const [timeLeft, setTimeLeft] = useState(30);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    if (visible && offer) {
      setTimeLeft(30);
      setAccepting(false);

      // Vibração de alerta (3 pulsos)
      Vibration.vibrate([0, 500, 200, 500, 200, 500]);

      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (timer) clearInterval(timer);
            onReject();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [visible, offer]);

  if (!offer) return null;

  const timerColor = timeLeft <= 5 ? "#ef4444" : timeLeft <= 15 ? "#f59e0b" : "#10b981";

  const handleAccept = () => {
    setAccepting(true);
    onAccept();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onReject}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerLabel}>NOVA OFERTA</Text>
              <Text style={styles.headerStore}>{offer.storeName}</Text>
            </View>
            <View style={[styles.timerBadge, { backgroundColor: timerColor }]}>
              <Text style={styles.timerText}>{timeLeft}s</Text>
            </View>
          </View>

          {/* Valor */}
          <View style={styles.feeContainer}>
            <Text style={styles.feeLabel}>Valor do frete</Text>
            <Text style={styles.feeValue}>R$ {offer.totalFee.toFixed(2)}</Text>
          </View>

          {/* Info cards */}
          <View style={styles.infoRow}>
            <View style={styles.infoCard}>
              <Ionicons name="navigate" size={22} color="#3b82f6" />
              <Text style={styles.infoValue}>{offer.distanceKm.toFixed(1)} km</Text>
              <Text style={styles.infoLabel}>Distância</Text>
            </View>
            <View style={styles.infoCard}>
              <Ionicons name="location" size={22} color="#8b5cf6" />
              <Text style={styles.infoValue}>{offer.stopsCount}</Text>
              <Text style={styles.infoLabel}>
                {offer.stopsCount === 1 ? "Parada" : "Paradas"}
              </Text>
            </View>
          </View>

          {/* Rota */}
          <View style={styles.routeBox}>
            <View style={styles.routeItem}>
              <View style={[styles.routeDot, { backgroundColor: "#3b82f6" }]} />
              <View style={styles.routeTextContainer}>
                <Text style={styles.routeLabel}>COLETA</Text>
                <Text style={styles.routeAddress} numberOfLines={2}>
                  {offer.pickupAddress}
                </Text>
              </View>
            </View>
            <View style={styles.routeLine} />
            <View style={styles.routeItem}>
              <View style={[styles.routeDot, { backgroundColor: "#10b981" }]} />
              <View style={styles.routeTextContainer}>
                <Text style={styles.routeLabel}>ENTREGA</Text>
                <Text style={styles.routeAddress} numberOfLines={2}>
                  {offer.deliveryAddress}
                </Text>
              </View>
            </View>
          </View>

          {/* Botões */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.rejectButton]}
              onPress={onReject}
              disabled={accepting}
            >
              <Text style={styles.rejectText}>Recusar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.acceptButton]}
              onPress={handleAccept}
              disabled={accepting}
            >
              <Text style={styles.acceptText}>
                {accepting ? "Aceitando..." : "Aceitar Rota"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  container: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#fff",
    borderRadius: 24,
    overflow: "hidden",
  },
  header: {
    backgroundColor: "#0f172a",
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  headerStore: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 4,
  },
  timerBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  timerText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
  },
  feeContainer: {
    padding: 20,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  feeLabel: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "600",
  },
  feeValue: {
    color: "#10b981",
    fontSize: 42,
    fontWeight: "bold",
    marginTop: 4,
  },
  infoRow: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
  },
  infoCard: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  infoValue: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 6,
  },
  infoLabel: {
    color: "#64748b",
    fontSize: 11,
    marginTop: 2,
  },
  routeBox: {
    margin: 16,
    marginTop: 0,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 16,
  },
  routeItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  routeTextContainer: {
    flex: 1,
  },
  routeLabel: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  routeAddress: {
    color: "#0f172a",
    fontSize: 13,
    marginTop: 2,
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: "#cbd5e1",
    marginLeft: 5,
    marginVertical: 4,
  },
  footer: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  button: {
    flex: 1,
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
  },
  rejectButton: {
    backgroundColor: "#f1f5f9",
  },
  acceptButton: {
    backgroundColor: "#10b981",
  },
  rejectText: {
    color: "#64748b",
    fontWeight: "bold",
    fontSize: 15,
  },
  acceptText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
});