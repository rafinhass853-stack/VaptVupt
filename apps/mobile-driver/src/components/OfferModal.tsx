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
import { theme } from "../theme";

export interface OfferData {
  orderId: string;
  storeName: string;
  totalFee: number;
  distanceKm: number;
  pickupAddress: string;
  deliveryAddress: string;
  stopsCount: number;
  totalOrderValue?: number;
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

  const timerColor =
    timeLeft <= 5 ? "#ef4444" : timeLeft <= 15 ? "#f59e0b" : "#10b981";

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

          {/* Fee */}
          <View style={styles.feeContainer}>
            <Text style={styles.feeLabel}>Você vai receber</Text>
            <Text style={styles.feeValue}>R$ {offer.totalFee.toFixed(2)}</Text>
            {offer.totalOrderValue ? (
              <Text style={styles.feeSubtext}>
                + R$ {offer.totalOrderValue.toFixed(2)} em produtos
              </Text>
            ) : null}
          </View>

          {/* Stats */}
          <View style={styles.infoRow}>
            <View style={styles.infoCard}>
              <Ionicons name="navigate" size={22} color={theme.colors.info} />
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

          {/* Route */}
          <View style={styles.routeBox}>
            <View style={styles.routeItem}>
              <View style={[styles.routeDot, { backgroundColor: theme.colors.info }]} />
              <View style={styles.routeTextContainer}>
                <Text style={styles.routeLabel}>COLETA</Text>
                <Text style={styles.routeAddress} numberOfLines={2}>
                  {offer.pickupAddress}
                </Text>
              </View>
            </View>
            <View style={styles.routeLine} />
            <View style={styles.routeItem}>
              <View style={[styles.routeDot, { backgroundColor: theme.colors.brand }]} />
              <View style={styles.routeTextContainer}>
                <Text style={styles.routeLabel}>ENTREGA</Text>
                <Text style={styles.routeAddress} numberOfLines={2}>
                  {offer.deliveryAddress}
                </Text>
              </View>
            </View>
          </View>

          {/* Buttons */}
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
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.acceptText}>
                {accepting ? "Aceitando..." : "Aceitar"}
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
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  container: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: theme.colors.bgCard,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  header: {
    backgroundColor: theme.colors.bg,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  headerStore: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 4,
  },
  timerBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  timerText: { color: "#fff", fontWeight: "bold", fontSize: 18 },
  feeContainer: {
    padding: 24,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  feeLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  feeValue: {
    color: theme.colors.brand,
    fontSize: 44,
    fontWeight: "bold",
    marginTop: 4,
  },
  feeSubtext: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  infoRow: { flexDirection: "row", padding: 16, gap: 12 },
  infoCard: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  infoValue: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 6,
  },
  infoLabel: { color: theme.colors.textMuted, fontSize: 11, marginTop: 2 },
  routeBox: {
    margin: 16,
    marginTop: 0,
    backgroundColor: theme.colors.bg,
    borderRadius: 12,
    padding: 16,
  },
  routeItem: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  routeDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  routeTextContainer: { flex: 1 },
  routeLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  routeAddress: { color: theme.colors.text, fontSize: 13, marginTop: 2 },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: theme.colors.border,
    marginLeft: 5,
    marginVertical: 4,
  },
  footer: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  button: {
    flex: 1,
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  rejectButton: { backgroundColor: theme.colors.bg },
  acceptButton: { backgroundColor: theme.colors.brand },
  rejectText: {
    color: theme.colors.textSecondary,
    fontWeight: "bold",
    fontSize: 15,
  },
  acceptText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
});