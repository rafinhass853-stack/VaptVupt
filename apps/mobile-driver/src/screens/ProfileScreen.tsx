import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { theme } from "../theme";

export default function ProfileScreen() {
  const { driver, user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert("Sair da conta", "Deseja encerrar sua sessão no VaptVupt?", [
      { text: "Continuar no app", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: logout },
    ]);
  };

  if (!driver) return null;
  const online = driver.status !== "OFFLINE";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.eyebrow}>SUA CONTA</Text>
      <Text style={styles.title}>Perfil</Text>
      <Text style={styles.subtitle}>Seus dados e informações de entregador.</Text>

      <View style={styles.profileCard}>
        <View style={styles.avatar}><Ionicons name="person" size={31} color="#fff" /></View>
        <View style={styles.profileIdentity}>
          <Text style={styles.name}>{driver.name || "Motoboy"}</Text>
          <Text style={styles.email} numberOfLines={1}>{user?.email || "E-mail não informado"}</Text>
          <View style={[styles.statusPill, online ? styles.onlinePill : styles.offlinePill]}>
            <View style={[styles.statusDot, { backgroundColor: online ? "#34d399" : "#94a3b8" }]} />
            <Text style={[styles.statusText, { color: online ? "#a7f3d0" : "#cbd5e1" }]}>{online ? "Disponível" : "Offline"}</Text>
          </View>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Ionicons name="bicycle-outline" size={20} color={theme.colors.brandLight} />
          <Text style={styles.summaryValue}>{driver.totalDeliveries ?? 0}</Text>
          <Text style={styles.summaryLabel}>Entregas</Text>
        </View>
        <View style={styles.summaryCard}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#93c5fd" />
          <Text style={styles.summaryValue}>VaptVupt</Text>
          <Text style={styles.summaryLabel}>Entregador</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Dados cadastrados</Text>
      <View style={styles.detailsCard}>
        <InfoRow icon="card-outline" label="CPF" value={driver.cpf || "Não informado"} />
        <InfoRow icon="call-outline" label="Telefone" value={driver.phone || "Não informado"} />
        <InfoRow icon="car-outline" label="Placa" value={driver.plate || "Não informada"} />
        <InfoRow icon="bicycle-outline" label="Veículo" value={driver.vehicleType || "Moto"} last />
      </View>

      <View style={styles.securityNote}>
        <Ionicons name="lock-closed-outline" size={19} color={theme.colors.brandLight} />
        <Text style={styles.securityText}>Seus dados são usados para identificar sua conta e organizar suas entregas. Para alterar informações cadastrais, procure o suporte da plataforma.</Text>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
        <View style={styles.logoutIcon}><Ionicons name="log-out-outline" size={20} color={theme.colors.danger} /></View>
        <View style={styles.logoutCopy}><Text style={styles.logoutTitle}>Sair da conta</Text><Text style={styles.logoutSubtitle}>Encerrar sua sessão neste aparelho</Text></View>
        <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
      </TouchableOpacity>

      <Text style={styles.version}>VaptVupt Entregador · versão 1.0.0</Text>
    </ScrollView>
  );
}

function InfoRow({ icon, label, value, last = false }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.infoRow, !last && styles.infoRowBorder]}>
      <View style={styles.infoIcon}><Ionicons name={icon} size={18} color={theme.colors.textSecondary} /></View>
      <View style={styles.infoCopy}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  content: { paddingHorizontal: 18, paddingTop: 24, paddingBottom: 32 },
  eyebrow: { color: theme.colors.brandLight, fontSize: 10, fontWeight: "800", letterSpacing: 1.3, marginBottom: 6 },
  title: { color: theme.colors.text, fontSize: 28, fontWeight: "800" },
  subtitle: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 5, marginBottom: 20 },
  profileCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: theme.colors.bgCard, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 20, padding: 17, marginBottom: 13 },
  avatar: { width: 64, height: 64, borderRadius: 20, backgroundColor: theme.colors.brand, alignItems: "center", justifyContent: "center" },
  profileIdentity: { flex: 1 },
  name: { color: theme.colors.text, fontSize: 17, fontWeight: "800" },
  email: { color: theme.colors.textMuted, fontSize: 11, marginTop: 4 },
  statusPill: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5, marginTop: 9 },
  onlinePill: { backgroundColor: "rgba(16,185,129,0.13)" },
  offlinePill: { backgroundColor: "rgba(148,163,184,0.12)" },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: "700" },
  summaryRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  summaryCard: { flex: 1, backgroundColor: theme.colors.bgCard, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 16, padding: 15, alignItems: "flex-start" },
  summaryValue: { color: theme.colors.text, fontSize: 18, fontWeight: "800", marginTop: 9 },
  summaryLabel: { color: theme.colors.textMuted, fontSize: 11, marginTop: 3 },
  sectionTitle: { color: theme.colors.text, fontSize: 17, fontWeight: "800", marginBottom: 11 },
  detailsCard: { backgroundColor: theme.colors.bgCard, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 17, paddingHorizontal: 14, marginBottom: 14 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  infoIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: theme.colors.bgTertiary, alignItems: "center", justifyContent: "center" },
  infoCopy: { flex: 1 },
  infoLabel: { color: theme.colors.textMuted, fontSize: 11 },
  infoValue: { color: theme.colors.text, fontSize: 14, fontWeight: "600", marginTop: 3 },
  securityNote: { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: "rgba(16,185,129,0.08)", borderWidth: 1, borderColor: "rgba(16,185,129,0.18)", borderRadius: 14, padding: 13, marginBottom: 18 },
  securityText: { flex: 1, color: theme.colors.textSecondary, fontSize: 11, lineHeight: 17 },
  logoutButton: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: theme.colors.bgCard, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 15, padding: 14 },
  logoutIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(239,68,68,0.12)", alignItems: "center", justifyContent: "center" },
  logoutCopy: { flex: 1 },
  logoutTitle: { color: theme.colors.danger, fontSize: 13, fontWeight: "800" },
  logoutSubtitle: { color: theme.colors.textMuted, fontSize: 10, marginTop: 3 },
  version: { color: theme.colors.textMuted, fontSize: 10, textAlign: "center", marginTop: 22 },
});