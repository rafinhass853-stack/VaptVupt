import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useAuth } from "../context/AuthContext";

export default function LoginScreen() {
  const { login, signup } = useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [plate, setPlate] = useState("");
  const [vehicleType, setVehicleType] = useState("MOTO");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert("Atenção", "Preencha email e senha");
      return;
    }
    if (isSignup && (!name || !cpf || !phone || !plate)) {
      Alert.alert("Atenção", "Preencha todos os campos do cadastro");
      return;
    }
    setLoading(true);
    try {
      if (isSignup) {
        await signup(email, password, {
          name,
          cpf,
          phone,
          plate,
          vehicleType,
        });
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      Alert.alert("Erro", err.message || "Falha na autenticação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.logo}>🛵</Text>
          <Text style={styles.title}>VaptVupt Driver</Text>
          <Text style={styles.subtitle}>
            {isSignup ? "Crie sua conta" : "Entre para começar"}
          </Text>

          {isSignup && (
            <>
              <TextInput
                style={styles.input}
                placeholder="Nome completo"
                placeholderTextColor="#94a3b8"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
              <TextInput
                style={styles.input}
                placeholder="CPF"
                placeholderTextColor="#94a3b8"
                value={cpf}
                onChangeText={setCpf}
                keyboardType="numeric"
                maxLength={14}
              />
              <TextInput
                style={styles.input}
                placeholder="Telefone (com DDD)"
                placeholderTextColor="#94a3b8"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
              <TextInput
                style={styles.input}
                placeholder="Placa do veículo (ex: ABC1D23)"
                placeholderTextColor="#94a3b8"
                value={plate}
                onChangeText={(v) => setPlate(v.toUpperCase())}
                autoCapitalize="characters"
                maxLength={8}
              />

              <Text style={styles.label}>Tipo de veículo</Text>
              <View style={styles.vehicleRow}>
                {[
                  { key: "MOTO", icon: "🛵", label: "Moto" },
                  { key: "CARRO", icon: "🚗", label: "Carro" },
                  { key: "BIKE", icon: "🚴", label: "Bike" },
                ].map((v) => (
                  <TouchableOpacity
                    key={v.key}
                    onPress={() => setVehicleType(v.key)}
                    style={[
                      styles.vehicleButton,
                      vehicleType === v.key && styles.vehicleButtonActive,
                    ]}
                  >
                    <Text style={styles.vehicleIcon}>{v.icon}</Text>
                    <Text
                      style={[
                        styles.vehicleLabel,
                        vehicleType === v.key && styles.vehicleLabelActive,
                      ]}
                    >
                      {v.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <TextInput
            style={styles.input}
            placeholder="E-mail"
            placeholderTextColor="#94a3b8"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            style={styles.input}
            placeholder="Senha"
            placeholderTextColor="#94a3b8"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={styles.button}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {isSignup ? "Criar Conta" : "Entrar"}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setIsSignup(!isSignup)}>
            <Text style={styles.switchText}>
              {isSignup
                ? "Já tem conta? Fazer login"
                : "Não tem conta? Cadastre-se"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#1e293b",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
  },
  logo: {
    fontSize: 48,
    textAlign: "center",
    marginBottom: 8,
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
  },
  subtitle: {
    color: "#94a3b8",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
    marginTop: 4,
  },
  input: {
    backgroundColor: "#0f172a",
    color: "#fff",
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#334155",
  },
  label: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 4,
  },
  vehicleRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  vehicleButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#334155",
    alignItems: "center",
  },
  vehicleButtonActive: {
    backgroundColor: "#1d4ed8",
    borderColor: "#3b82f6",
  },
  vehicleIcon: {
    fontSize: 22,
    marginBottom: 2,
  },
  vehicleLabel: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "600",
  },
  vehicleLabelActive: {
    color: "#fff",
  },
  button: {
    backgroundColor: "#3b82f6",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  switchText: {
    color: "#60a5fa",
    textAlign: "center",
    marginTop: 16,
    fontSize: 14,
  },
});