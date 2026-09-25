import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme";

export type Tab = "home" | "trip" | "earnings" | "profile";

interface BottomNavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
  hasActiveTrip?: boolean;
}

const tabs: { key: Tab; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { key: "home", icon: "map", label: "Início" },
  { key: "trip", icon: "bicycle", label: "Corridas" },
  { key: "earnings", icon: "wallet", label: "Ganhos" },
  { key: "profile", icon: "person-circle", label: "Perfil" },
];

export default function BottomNav({ active, onChange, hasActiveTrip }: BottomNavProps) {
  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const selected = active === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => onChange(tab.key)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={tab.label}
          >
            <View style={[styles.iconWrap, selected && styles.iconWrapSelected]}>
              <Ionicons
                name={selected ? tab.icon : (tab.key === "home" ? "map-outline" : tab.key === "trip" ? "bicycle-outline" : tab.key === "earnings" ? "wallet-outline" : "person-circle-outline")}
                size={21}
                color={selected ? theme.colors.brand : theme.colors.textMuted}
              />
              {tab.key === "trip" && hasActiveTrip ? <View style={styles.badge} /> : null}
            </View>
            <Text style={[styles.label, selected && styles.labelSelected]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: theme.colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 9,
    paddingBottom: 12,
    paddingHorizontal: 6,
  },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 4, gap: 4 },
  iconWrap: { width: 44, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", position: "relative" },
  iconWrapSelected: { backgroundColor: "rgba(16,185,129,0.12)" },
  badge: { position: "absolute", top: 2, right: 7, width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.warning, borderWidth: 1, borderColor: theme.colors.bgCard },
  label: { color: theme.colors.textMuted, fontSize: 10, fontWeight: "600" },
  labelSelected: { color: theme.colors.brandLight, fontWeight: "800" },
});