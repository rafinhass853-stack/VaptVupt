import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme";

export type Tab = "home" | "trip" | "earnings" | "profile";

interface BottomNavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
  hasActiveTrip?: boolean;
}

export default function BottomNav({ active, onChange, hasActiveTrip }: BottomNavProps) {
  const tabs = [
    { key: "home", icon: "home", label: "Início" },
    { key: "trip", icon: "bicycle", label: "Corrida", badge: hasActiveTrip },
    { key: "earnings", icon: "cash", label: "Ganhos" },
    { key: "profile", icon: "person", label: "Perfil" },
  ];
  return (
    <View style={styles.container}>
      {tabs.map((t) => {
        const isActive = active === t.key;
        return (
          <TouchableOpacity key={t.key} style={styles.tab} onPress={() => onChange(t.key as Tab)}>
            <View style={styles.iconWrapper}>
              <Ionicons name={isActive ? (t.icon as any) : (`${t.icon}-outline` as any)}
                size={24} color={isActive ? theme.colors.brand : theme.colors.textMuted} />
              {t.badge && <View style={styles.badge} />}
            </View>
            <Text style={[styles.label, isActive && styles.labelActive]}>{t.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: "row", backgroundColor: theme.colors.bgCard, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingBottom: 20, paddingTop: 10 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 6 },
  iconWrapper: { position: "relative" },
  badge: { position: "absolute", top: -2, right: -4, width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.danger, borderWidth: 2, borderColor: theme.colors.bgCard },
  label: { color: theme.colors.textMuted, fontSize: 10, marginTop: 4, fontWeight: "600" },
  labelActive: { color: theme.colors.brand },
});