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
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { theme } from "../theme";

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
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert("Atenção", "Preencha email e senha");
      return;
    }
    if (isSignup && (!name || !cpf || !phone || !plate)) {
      Alert.alert("Atenção", "Preencha todos os campos");
      return;
    }
    setLoading(true);
    try {
      if (isSignup) {
        await signup(email, password, { name, cpf, phone, plate, vehicleType });
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
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="bicycle" size={42} color="#fff" />
          </View>
          <Text style={styles.title}>VaptVupt</Text>
          <Text style={styles.subtitle}>
            {isSignup ? "Crie sua conta de entregador" : "Entre para começar"}
          </Text>
        </View>

        <View style={styles.card}>
          {isSignup && (
            <>
              <Text style={styles.sectionLabel}>DADOS PESSOAIS</Text>

              <View style={styles.inputContainer}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={theme.colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Nome completo"
                  placeholderTextColor={theme.colors.textMuted}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons
                  name="card-outline"
                  size={20}
                  color={theme.colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="CPF"
                  placeholderTextColor={theme.colors.textMuted}
                  value={cpf}
                  onChangeText={setCpf}
                  keyboardType="numeric"
                  maxLength={14}
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons
                  name="call-outline"
                  size={20}
                  color={theme.colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Telefone com DDD"
                  placeholderTextColor={theme.colors.textMuted}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>

              <Text style={[styles.sectionLabel, { marginTop: 20 }]}>
                VEÍCULO
              </Text>

              <View style={styles.inputContainer}>
                <Ionicons
                  name="car-outline"
                  size={20}
                  color={theme.colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Placa (ex: ABC1D23)"
                  placeholderTextColor={theme.colors.textMuted}
                  value={plate}
                  onChangeText={(v) => setPlate(v.toUpperCase())}
                  autoCapitalize="characters"
                  maxLength={8}
                />
              </View>

              <View style={styles.vehicleRow}>
                {[
                  { key: "MOTO", icon: "bicycle", label: "Moto" },
                  { key: "CARRO", icon: "car", label: "Carro" },
                  { key: "BIKE", icon: "walk", label: "Bike" },
                ].map((v) => (
                  <TouchableOpacity
                    key={v.key}
                    onPress={() => setVehicleType(v.key)}
                    style={[
                      styles.vehicleButton,
                      vehicleType === v.key && styles.vehicleButtonActive,
                    ]}
                  >
                    <Ionicons
                      name={v.icon as any}
                      size={22}
                      color={
                        vehicleType === v.key ? "#fff" : theme.colors.textMuted
                      }
                    />
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

          <Text style={[styles.sectionLabel, isSignup && { marginTop: 20 }]}>
            ACESSO
          </Text>

          <View style={styles.inputContainer}>
            <Ionicons
              name="mail-outline"
              size={20}
              color={theme.colors.textMuted}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="E-mail"
              placeholderTextColor={theme.colors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={theme.colors.textMuted}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Senha"
              placeholderTextColor={theme.colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? "eye-outline" : "eye-off-outline"}
                size={20}
                color={theme.colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.buttonText}>
                  {isSignup ? "Criar Conta" : "Entrar"}
                </Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setIsSignup(!isSignup)}
            style={styles.switchButton}
          >
            <Text style={styles.switchText}>
              {isSignup
                ? "Já tem conta? "
                : "Não tem conta? "}
              <Text style={styles.switchTextBold}>
                {isSignup ? "Fazer login" : "Cadastre-se"}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerText}>
          Ao continuar, você aceita os Termos de Uso
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 60,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: theme.colors.brand,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: theme.colors.brand,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  title: {
    color: theme.colors.text,
    fontSize: 32,
    fontWeight: "bold",
    letterSpacing: -0.5,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  card: {
    backgroundColor: theme.colors.bgCard,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sectionLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.bg,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 15,
    paddingVertical: 14,
  },
  vehicleRow: {
    flexDirection: "row",
    gap: 8,
  },
  vehicleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.bg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  vehicleButtonActive: {
    backgroundColor: theme.colors.brand,
    borderColor: theme.colors.brand,
  },
  vehicleLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  vehicleLabelActive: {
    color: "#fff",
  },
  button: {
    backgroundColor: theme.colors.brand,
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  switchButton: {
    marginTop: 16,
    alignItems: "center",
  },
  switchText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  switchTextBold: {
    color: theme.colors.brandLight,
    fontWeight: "600",
  },
  footerText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    textAlign: "center",
    marginTop: 20,
  },
});