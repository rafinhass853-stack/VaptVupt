import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { theme } from "../theme";

export default function ProfileScreen() {
  const { driver, user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert("Sair", "Deseja sair da conta?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: logout },
    ]);
  };

  if (!driver) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Perfil</Text>

      <View style={styles.avatarCard}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={36} color="#fff" />
        </View>
        <Text style={styles.name}>{driver.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <Text style={styles.sectionLabel}>DADOS PESSOAIS</Text>
      <View style={styles.infoCard}>
        <InfoRow icon="card-outline" label="CPF" value={driver.cpf || "—"} />
        <InfoRow icon="call-outline" label="Telefone" value={driver.phone || "—"} />
        <InfoRow icon="car-outline" label="Placa" value={driver.plate || "—"} />
        <InfoRow icon="bicycle-outline" label="Veículo" value={driver.vehicleType} />
      </View>

      <Text style={styles.sectionLabel}>ESTATÍSTICAS</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{driver.totalDeliveries || 0}</Text>
          <Text style={styles.statLabel}>Entregas</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>5.0 ⭐</Text>
          <Text style={styles.statLabel}>Avaliação</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color={theme.colors.danger} />
        <Text style={styles.logoutText}>Sair da conta</Text>
      </TouchableOpacity>

      <Text style={styles.version}>VaptVupt Driver • v1.0.0</Text>
    </ScrollView>
  );
}

function InfoRow({ icon, label, value }: any) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={theme.colors.textMuted} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: 20, paddingTop: 50, paddingBottom: 40 },
  title: { color: theme.colors.text, fontSize: 28, fontWeight: "bold", marginBottom: 20 },
  avatarCard: { backgroundColor: theme.colors.bgCard, borderRadius: 20, padding: 24, alignItems: "center", marginBottom: 20, borderWidth: 1, borderColor: theme.colors.border },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.colors.brand, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  name: { color: theme.colors.text, fontSize: 20, fontWeight: "bold" },
  email: { color: theme.colors.textMuted, fontSize: 13, marginTop: 4 },
  sectionLabel: { color: theme.colors.textMuted, fontSize: 11, fontWeight: "700", letterSpacing: 1, marginBottom: 10, marginTop: 8 },
  infoCard: { backgroundColor: theme.colors.bgCard, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: theme.colors.border },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  infoLabel: { color: theme.colors.textSecondary, fontSize: 13, flex: 1 },
  infoValue: { color: theme.colors.text, fontSize: 13, fontWeight: "600" },
  statsGrid: { flexDirection: "row", gap: 12, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: theme.colors.bgCard, borderRadius: 16, padding: 20, alignItems: "center", borderWidth: 1, borderColor: theme.colors.border },
  statValue: { color: theme.colors.brand, fontSize: 24, fontWeight: "bold" },
  statLabel: { color: theme.colors.textMuted, fontSize: 12, marginTop: 4 },
  logoutButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: theme.colors.bgCard, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.danger },
  logoutText: { color: theme.colors.danger, fontSize: 15, fontWeight: "600" },
  version: { color: theme.colors.textMuted, fontSize: 11, textAlign: "center", marginTop: 24 },
});