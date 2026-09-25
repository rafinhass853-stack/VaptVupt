import { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { theme } from "../theme";

interface CompletedOrder {
  id: string;
  pricing: { totalFee?: number; driverPayout?: number; platformFee?: number };
  deliveredAt: any;
  storeName: string;
}

const brl = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export default function EarningsScreen() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<CompletedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, "orders"),
      where("assignedDriverId", "==", user.uid),
      where("status", "==", "DELIVERED"),
      orderBy("deliveredAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map((item) => {
        const data = item.data();
        return {
          id: item.id,
          pricing: data.pricing || {},
          deliveredAt: data.deliveredAt,
          storeName: data.storeName || "Entrega VaptVupt",
        };
      }));
      setError("");
      setLoading(false);
    }, () => {
      setError("Não foi possível carregar seus ganhos agora.");
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  const stats = useMemo(() => {
    const startToday = new Date();
    startToday.setHours(0, 0, 0, 0);
    const startWeek = new Date(startToday);
    const day = (startWeek.getDay() + 6) % 7;
    startWeek.setDate(startWeek.getDate() - day);
    const amount = (order: CompletedOrder) => Number(order.pricing.driverPayout ?? order.pricing.totalFee ?? 0);
    const deliveredAt = (order: CompletedOrder) => order.deliveredAt?.toDate?.()?.getTime?.() ?? 0;
    const todayOrders = orders.filter((order) => deliveredAt(order) >= startToday.getTime());
    const weekOrders = orders.filter((order) => deliveredAt(order) >= startWeek.getTime());
    return {
      today: todayOrders.reduce((sum, order) => sum + amount(order), 0),
      week: weekOrders.reduce((sum, order) => sum + amount(order), 0),
      total: orders.reduce((sum, order) => sum + amount(order), 0),
      todayCount: todayOrders.length,
      amount,
    };
  }, [orders]);

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color={theme.colors.brand} /></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.eyebrow}>RESUMO FINANCEIRO</Text>
      <Text style={styles.title}>Seus ganhos</Text>
      <Text style={styles.subtitle}>Acompanhe os valores das entregas concluídas.</Text>

      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.heroIcon}><Ionicons name="wallet" size={22} color="#fff" /></View>
          <View style={styles.todayBadge}><Text style={styles.todayBadgeText}>HOJE</Text></View>
        </View>
        <Text style={styles.heroLabel}>Total de hoje</Text>
        <Text style={styles.heroValue}>{brl(stats.today)}</Text>
        <View style={styles.heroFooter}>
          <Ionicons name="checkmark-circle" size={16} color="#a7f3d0" />
          <Text style={styles.heroFooterText}>{stats.todayCount} entrega(s) concluída(s)</Text>
        </View>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <View style={styles.metricIcon}><Ionicons name="calendar-outline" size={19} color={theme.colors.brandLight} /></View>
          <Text style={styles.metricLabel}>Esta semana</Text>
          <Text style={styles.metricValue}>{brl(stats.week)}</Text>
        </View>
        <View style={styles.metricCard}>
          <View style={[styles.metricIcon, styles.blueIcon]}><Ionicons name="trending-up-outline" size={19} color="#93c5fd" /></View>
          <Text style={styles.metricLabel}>Acumulado</Text>
          <Text style={styles.metricValue}>{brl(stats.total)}</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <View><Text style={styles.sectionTitle}>Últimas entregas</Text><Text style={styles.sectionSubtitle}>{orders.length} entrega(s) no histórico</Text></View>
        <Ionicons name="receipt-outline" size={22} color={theme.colors.textMuted} />
      </View>

      {error ? (
        <View style={styles.emptyCard}><Ionicons name="cloud-offline-outline" size={30} color={theme.colors.warning} /><Text style={styles.emptyTitle}>{error}</Text></View>
      ) : orders.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}><Ionicons name="bicycle-outline" size={28} color={theme.colors.brandLight} /></View>
          <Text style={styles.emptyTitle}>Seu histórico começa aqui</Text>
          <Text style={styles.emptyText}>Quando você concluir uma entrega, o valor e os detalhes aparecerão nesta lista.</Text>
        </View>
      ) : orders.slice(0, 40).map((order) => {
        const date = order.deliveredAt?.toDate?.();
        return (
          <View key={order.id} style={styles.orderRow}>
            <View style={styles.orderIcon}><Ionicons name="checkmark" size={19} color={theme.colors.brandLight} /></View>
            <View style={styles.orderInfo}>
              <Text style={styles.orderStore} numberOfLines={1}>{order.storeName}</Text>
              <Text style={styles.orderDate}>{date ? date.toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "Data indisponível"}</Text>
            </View>
            <Text style={styles.orderValue}>+ {brl(stats.amount(order))}</Text>
          </View>
        );
      })}
      <Text style={styles.disclaimer}>Os valores são calculados com base nos dados registrados para suas entregas concluídas.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  content: { paddingHorizontal: 18, paddingTop: 24, paddingBottom: 32 },
  loading: { flex: 1, backgroundColor: theme.colors.bg, alignItems: "center", justifyContent: "center" },
  eyebrow: { color: theme.colors.brandLight, fontSize: 10, fontWeight: "800", letterSpacing: 1.3, marginBottom: 6 },
  title: { color: theme.colors.text, fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { color: theme.colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 5, marginBottom: 20 },
  heroCard: { backgroundColor: "#064e3b", borderRadius: 22, padding: 20, marginBottom: 13, borderWidth: 1, borderColor: "#047857" },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  heroIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  todayBadge: { backgroundColor: "rgba(167,243,208,0.16)", borderRadius: 20, paddingHorizontal: 11, paddingVertical: 6 },
  todayBadgeText: { color: "#a7f3d0", fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  heroLabel: { color: "#a7f3d0", fontSize: 13, fontWeight: "600" },
  heroValue: { color: "#fff", fontSize: 36, fontWeight: "800", marginTop: 5, letterSpacing: -0.8 },
  heroFooter: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 12 },
  heroFooterText: { color: "#d1fae5", fontSize: 12, fontWeight: "600" },
  metricsRow: { flexDirection: "row", gap: 12, marginBottom: 26 },
  metricCard: { flex: 1, backgroundColor: theme.colors.bgCard, borderRadius: 17, borderWidth: 1, borderColor: theme.colors.border, padding: 15 },
  metricIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: "rgba(16,185,129,0.14)", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  blueIcon: { backgroundColor: "rgba(59,130,246,0.14)" },
  metricLabel: { color: theme.colors.textMuted, fontSize: 11, marginBottom: 5 },
  metricValue: { color: theme.colors.text, fontSize: 17, fontWeight: "800" },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sectionTitle: { color: theme.colors.text, fontSize: 18, fontWeight: "800" },
  sectionSubtitle: { color: theme.colors.textMuted, fontSize: 11, marginTop: 3 },
  emptyCard: { alignItems: "center", backgroundColor: theme.colors.bgCard, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 18, padding: 25 },
  emptyIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: "rgba(16,185,129,0.12)", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  emptyTitle: { color: theme.colors.text, fontSize: 15, fontWeight: "700", textAlign: "center" },
  emptyText: { color: theme.colors.textMuted, fontSize: 12, textAlign: "center", lineHeight: 18, marginTop: 7 },
  orderRow: { flexDirection: "row", alignItems: "center", gap: 11, backgroundColor: theme.colors.bgCard, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 15, padding: 13, marginBottom: 9 },
  orderIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(16,185,129,0.14)", alignItems: "center", justifyContent: "center" },
  orderInfo: { flex: 1 },
  orderStore: { color: theme.colors.text, fontSize: 13, fontWeight: "700" },
  orderDate: { color: theme.colors.textMuted, fontSize: 11, marginTop: 4 },
  orderValue: { color: theme.colors.brandLight, fontSize: 13, fontWeight: "800" },
  disclaimer: { color: theme.colors.textMuted, fontSize: 10, lineHeight: 15, marginTop: 10, textAlign: "center" },
});