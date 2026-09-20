import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { theme } from "../theme";

interface CompletedOrder {
  id: string;
  pricing: { totalFee: number };
  deliveredAt: any;
  storeName: string;
}

export default function EarningsScreen() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<CompletedOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "orders"),
      where("assignedDriverId", "==", user.uid),
      where("status", "==", "DELIVERED"),
      orderBy("deliveredAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const list: CompletedOrder[] = [];
      snap.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          pricing: data.pricing || { totalFee: 0 },
          deliveredAt: data.deliveredAt,
          storeName: data.storeName,
        });
      });
      setOrders(list);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayOrders = orders.filter((o) => o.deliveredAt?.toDate?.()?.getTime() >= today.getTime());
  const todayEarnings = todayOrders.reduce((sum, o) => sum + o.pricing.totalFee, 0);
  const totalEarnings = orders.reduce((sum, o) => sum + o.pricing.totalFee, 0);

  if (loading) return (
    <View style={styles.loadingContainer}><ActivityIndicator size="large" color={theme.colors.brand} /></View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Meus Ganhos</Text>

      <View style={styles.mainCard}>
        <Text style={styles.mainLabel}>Ganhos hoje</Text>
        <Text style={styles.mainValue}>R$ {todayEarnings.toFixed(2)}</Text>
        <Text style={styles.mainSubtext}>{todayOrders.length} entrega(s) realizada(s)</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Ionicons name="trophy" size={24} color="#f59e0b" />
          <Text style={styles.statValue}>R$ {totalEarnings.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Total acumulado</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="bicycle" size={24} color={theme.colors.info} />
          <Text style={styles.statValue}>{orders.length}</Text>
          <Text style={styles.statLabel}>Total de entregas</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>HISTÓRICO</Text>
      {orders.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="time-outline" size={48} color={theme.colors.textMuted} />
          <Text style={styles.emptyText}>Nenhuma entrega finalizada</Text>
        </View>
      ) : (
        orders.slice(0, 30).map((o) => {
          const date = o.deliveredAt?.toDate?.();
          return (
            <View key={o.id} style={styles.orderRow}>
              <View style={styles.orderIcon}>
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.brand} />
              </View>
              <View style={styles.orderInfo}>
                <Text style={styles.orderStore}>{o.storeName}</Text>
                <Text style={styles.orderDate}>
                  {date ? date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
                </Text>
              </View>
              <Text style={styles.orderValue}>+ R$ {o.pricing.totalFee.toFixed(2)}</Text>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: 20, paddingTop: 50, paddingBottom: 40 },
  loadingContainer: { flex: 1, backgroundColor: theme.colors.bg, justifyContent: "center", alignItems: "center" },
  title: { color: theme.colors.text, fontSize: 28, fontWeight: "bold", marginBottom: 20 },
  mainCard: { backgroundColor: "#064e3b", borderRadius: 20, padding: 24, marginBottom: 16, borderWidth: 1, borderColor: theme.colors.brand },
  mainLabel: { color: theme.colors.brandLight, fontSize: 13, fontWeight: "600" },
  mainValue: { color: "#fff", fontSize: 44, fontWeight: "bold", marginTop: 8 },
  mainSubtext: { color: theme.colors.brandLight, fontSize: 12, marginTop: 6 },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: theme.colors.bgCard, borderRadius: 16, padding: 16, alignItems: "center", borderWidth: 1, borderColor: theme.colors.border },
  statValue: { color: theme.colors.text, fontSize: 18, fontWeight: "bold", marginTop: 8 },
  statLabel: { color: theme.colors.textMuted, fontSize: 11, marginTop: 2, textAlign: "center" },
  sectionLabel: { color: theme.colors.textMuted, fontSize: 11, fontWeight: "700", letterSpacing: 1, marginBottom: 12 },
  emptyBox: { alignItems: "center", padding: 40, backgroundColor: theme.colors.bgCard, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border },
  emptyText: { color: theme.colors.textMuted, fontSize: 14, marginTop: 12 },
  orderRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: theme.colors.bgCard, padding: 14, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: theme.colors.border },
  orderIcon: { backgroundColor: "rgba(16,185,129,0.2)", padding: 8, borderRadius: 10 },
  orderInfo: { flex: 1 },
  orderStore: { color: theme.colors.text, fontSize: 14, fontWeight: "600" },
  orderDate: { color: theme.colors.textMuted, fontSize: 11, marginTop: 2 },
  orderValue: { color: theme.colors.brand, fontSize: 15, fontWeight: "bold" },
});