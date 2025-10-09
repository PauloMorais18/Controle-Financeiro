import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  Pressable,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

async function ping(baseUrl: string, ms = 4000): Promise<boolean> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(`${baseUrl}/health`, { signal: ctrl.signal });
    clearTimeout(timer);
    return r.ok;
  } catch (err) {
    clearTimeout(timer);
    return false;
  }
}

export default function ServidorConfig() {
  const router = useRouter();
  const [ip, setIp] = useState("");
  const [testing, setTesting] = useState(false);
  const scaleSalvar = useRef(new Animated.Value(1)).current;
  const scaleTest = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    (async () => {
      try {
        const saved = (await AsyncStorage.getItem("ipServidor")) || "";
        setIp(saved);
      } catch (e) {
        console.warn("[ServidorConfig] erro ao carregar ip:", e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function animate(ref: Animated.Value) {
    Animated.sequence([
      Animated.timing(ref, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(ref, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  }

  async function handleSalvar() {
    animate(scaleSalvar);
    const trimmed = ip.trim().replace(/\/+$/, "");
    if (!trimmed) {
      return Alert.alert("Erro", "Informe o endereço do servidor (ex.: http://192.168.68.104:3000)");
    }
    try {
      await AsyncStorage.setItem("ipServidor", trimmed);
      Alert.alert("Salvo", `Endereço salvo: ${trimmed}`);
      router.back();
    } catch (e) {
      console.error("[ServidorConfig] erro ao salvar ip:", e);
      Alert.alert("Erro", "Falha ao salvar o endereço do servidor.");
    }
  }

  async function handleTestar() {
    animate(scaleTest);
    const trimmed = ip.trim().replace(/\/+$/, "");
    if (!trimmed) return Alert.alert("Erro", "Informe o endereço do servidor para testar.");
    setTesting(true);
    try {
      const ok = await ping(trimmed, 4000);
      setTesting(false);
      if (ok) {
        Alert.alert("Conexão bem sucedida", `Servidor respondeu em ${trimmed}`);
      } else {
        Alert.alert("Falha de conexão", `Não foi possível contatar ${trimmed}. Verifique IP, porta e firewall.`);
      }
    } catch (e) {
      setTesting(false);
      console.error("[ServidorConfig] erro no ping:", e);
      Alert.alert("Erro", "Erro ao testar a conexão.");
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.safe}
      behavior={Platform.select({ ios: "padding", android: undefined })}
    >
      <View style={styles.wrapper}>
        <Text style={styles.title}>Configurar servidor</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Endereço (ex.: http://192.168.68.104:3000)</Text>
          <TextInput
            style={styles.input}
            placeholder="http://192.168.68.104:3000"
            value={ip}
            onChangeText={setIp}
            autoCapitalize="none"
            keyboardType="url"
            placeholderTextColor="#999"
          />

          <Animated.View style={{ transform: [{ scale: scaleTest }], width: "100%", marginTop: 12 }}>
            <Pressable onPress={handleTestar} style={styles.button}>
              <Text style={styles.buttonText}>{testing ? "Testando..." : "Testar conexão"}</Text>
            </Pressable>
          </Animated.View>

          <Animated.View style={{ transform: [{ scale: scaleSalvar }], width: "100%", marginTop: 12 }}>
            <Pressable onPress={handleSalvar} style={styles.buttonSecondary}>
              <Text style={styles.buttonText}>Salvar</Text>
            </Pressable>
          </Animated.View>

          <Pressable onPress={() => router.back()} style={styles.backWrap}>
            <Text style={styles.backText}>Voltar</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#ffffff" },
  wrapper: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  form: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
  },
  label: {
    alignSelf: "flex-start",
    marginBottom: 8,
    color: "#333",
    fontSize: 14,
  },
  input: {
    width: "100%",
    height: 48,
    borderColor: "#ddd",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    fontSize: 14,
  },
  button: {
    width: "100%",
    backgroundColor: "#1976d2",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonSecondary: {
    width: "100%",
    backgroundColor: "#0b74da",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  backWrap: { marginTop: 18, alignItems: "center" },
  backText: { color: "#666", fontSize: 14 },
});
