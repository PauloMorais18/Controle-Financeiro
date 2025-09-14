import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  Pressable,
  Animated,
  TouchableOpacity,
} from "react-native";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

/** === CONFIGURÁVEL PARA SEU AMBIENTE === */
const FALLBACK_BASE_URL = "http://192.168.68.104:3000"; // seu IPv4 LAN + :3000 (sem barra)

async function readSanitizedBaseUrl(): Promise<string | null> {
  let url = (await AsyncStorage.getItem("ipServidor"))?.trim() || "";
  if (!url) return null;
  if (url.endsWith("/")) url = url.slice(0, -1);
  return url;
}

async function ping(baseUrl: string, ms = 4000): Promise<boolean> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(`${baseUrl}/health`, { signal: ctrl.signal });
    clearTimeout(t);
    return r.ok;
  } catch {
    clearTimeout(t);
    return false;
  }
}

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  const scale = useRef(new Animated.Value(1)).current;
  const scaleCadastro = useRef(new Animated.Value(1)).current;
  const scaleServidor = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    (async () => {
      const emailSalvo = await AsyncStorage.getItem("usuarioEmail");
      const senhaSalva = await AsyncStorage.getItem("usuarioSenha");
      if (emailSalvo) setEmail(emailSalvo);
      if (senhaSalva) setSenha(senhaSalva);
    })();
  }, []);

  function animateButton(scaleRef: Animated.Value) {
    Animated.sequence([
      Animated.timing(scaleRef, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleRef, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  }

  async function resolveBaseUrlComFallback(): Promise<string | null> {
    // 1) tenta URL salva
    const saved = await readSanitizedBaseUrl();
    if (saved) {
      // Mostra para você conferir rapidamente qual URL está sendo usada
      Alert.alert("Base URL (salva)", saved);
      if (await ping(saved)) return saved;
    }

    // 2) tenta fallback
    Alert.alert("Tentando fallback", FALLBACK_BASE_URL);
    if (await ping(FALLBACK_BASE_URL)) {
      await AsyncStorage.setItem("ipServidor", FALLBACK_BASE_URL);
      return FALLBACK_BASE_URL;
    }

    return null;
  }

  async function handleLogin() {
    if (!email || !senha) {
      return Alert.alert("Erro", "Preencha todos os campos.");
    }

    try {
      setLoading(true);
      animateButton(scale);

      const baseUrl = await resolveBaseUrlComFallback();
      if (!baseUrl) {
        return Alert.alert(
          "Servidor inacessível",
          "Não foi possível alcançar o servidor configurado nem o fallback. Verifique o IP/porta (ex.: http://192.168.68.104:3000), o firewall e se o servidor está em execução."
        );
      }

      const response = await fetch(`${baseUrl}/usuario/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });

      if (!response.ok) {
        if (response.status === 401) throw new Error("E-mail ou senha inválidos.");
        let msg = "Erro ao tentar fazer login.";
        try {
          const j = await response.json();
          if (j?.erro) msg = j.erro;
        } catch {}
        throw new Error(msg);
      }

      const usuario = await response.json();

      await AsyncStorage.setItem("usuarioEmail", email);
      await AsyncStorage.setItem("usuarioSenha", senha);
      await AsyncStorage.setItem("usuarioNome", usuario.nome);
      await AsyncStorage.setItem("usuarioId", String(usuario.chave));

      Alert.alert("✅ Login realizado", `Bem-vindo(a), ${usuario.nome}`);
      router.replace("/Principal");
    } catch (e: any) {
      const msg =
        e?.name === "AbortError"
          ? "Tempo esgotado ao contatar o servidor."
          : e?.message === "Network request failed"
          ? "Falha de rede. Confirme o IP/porta, a conexão do aparelho ao mesmo Wi-Fi do servidor e o firewall."
          : e?.message || "Erro desconhecido.";
      Alert.alert("Erro", msg);
      console.error("Login error:", e);
    } finally {
      setLoading(false);
    }
  }

  function handleCadastro() {
    animateButton(scaleCadastro);
    setTimeout(() => router.push("/Cadastro"), 200);
  }

  function handleServidor() {
    animateButton(scaleServidor);
    setTimeout(() => router.push("/Servidorconfig"), 200); // minúsculo
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>

      <TextInput
        style={styles.input}
        placeholder="E-mail"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Senha"
        secureTextEntry
        value={senha}
        onChangeText={setSenha}
      />

      <Animated.View style={{ transform: [{ scale }], alignItems: "center" }}>
        <TouchableOpacity
          style={[styles.botao, (!email || !senha || loading) && { backgroundColor: "#999" }]}
          onPress={handleLogin}
          disabled={!email || !senha || loading}
        >
          <Text style={styles.botaoTexto}>{loading ? "Entrando..." : "Entrar"}</Text>
        </TouchableOpacity>
      </Animated.View>

      <Animated.View style={{ transform: [{ scale: scaleCadastro }], marginTop: 16 }}>
        <Pressable onPress={handleCadastro}>
          <Text style={styles.linkText}>Não tem conta? Cadastre-se</Text>
        </Pressable>
      </Animated.View>

      <Animated.View style={{ transform: [{ scale: scaleServidor }], marginTop: 8 }}>
        <Pressable onPress={handleServidor}>
          <Text style={[styles.linkText, { fontSize: 14 }]}>🌐 Configurar servidor</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 32, justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 24, textAlign: "center" },
  input: {
    height: 50,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  linkText: {
    marginTop: 16,
    color: "#007bff",
    textAlign: "center",
    fontSize: 16,
  },
  botao: {
    backgroundColor: "#4CAF50",
    paddingVertical: 14,
    paddingHorizontal: 50,
    borderRadius: 8,
    alignItems: "center",
  },
  botaoTexto: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
