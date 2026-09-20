import { useState, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator,
  View,
  StyleSheet,
  SafeAreaView,
  Platform,
} from "react-native";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import LoginScreen from "./src/screens/LoginScreen";
import HomeScreen from "./src/screens/HomeScreen";
import ActiveTripScreen from "./src/screens/ActiveTripScreen";
import EarningsScreen from "./src/screens/EarningsScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import BottomNav, { Tab } from "./src/components/BottomNav";
import { registerForPushNotifications } from "./src/lib/notifications";
import { theme } from "./src/theme";

function Root() {
  const { user, driver, loading } = useAuth();
  const [tab, setTab] = useState<Tab>("home");

  // Auto-navega para "trip" quando aceita uma corrida
  useEffect(() => {
    if (driver?.activeOrderId && driver.status === "IN_TRIP") {
      setTab("trip");
    } else if (tab === "trip" && !driver?.activeOrderId) {
      setTab("home");
    }
  }, [driver?.activeOrderId, driver?.status]);

  // Registra token FCM quando o usuário logar
  useEffect(() => {
    if (user && driver) {
      registerForPushNotifications(user.uid).catch((err) => {
        console.warn("FCM registration failed:", err);
      });
    }
  }, [user?.uid, driver?.id]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.colors.brand} />
      </View>
    );
  }

  if (!user) {
    return (
      <>
        <LoginScreen />
        <StatusBar style="light" />
      </>
    );
  }

  const hasActiveTrip = !!driver?.activeOrderId;

  const renderScreen = () => {
    if (tab === "trip") return <ActiveTripScreen />;
    if (tab === "earnings") return <EarningsScreen />;
    if (tab === "profile") return <ProfileScreen />;
    return <HomeScreen />;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.screen}>{renderScreen()}</View>
        <BottomNav
          active={tab}
          onChange={setTab}
          hasActiveTrip={hasActiveTrip}
        />
      </View>
      <StatusBar style="light" />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    paddingTop: Platform.OS === "android" ? 24 : 0,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  screen: {
    flex: 1,
  },
  loading: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
});