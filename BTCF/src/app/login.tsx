import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  Pressable,
  Animated,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  const scale = useRef(new Animated.Value(1)).current;
  const scaleCadastro = useRef(new Animated.Value(1)).current;
  const scaleServidor = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    async function carregarCredenciaisSalvas() {
      const emailSalvo = await AsyncStorage.getItem("usuarioEmail");
      const senhaSalva = await AsyncStorage.getItem("usuarioSenha");
      if (emailSalvo) setEmail(emailSalvo);
      if (senhaSalva) setSenha(senhaSalva);
    }
    carregarCredenciaisSalvas();
  }, []);

  function animateButton(scaleRef: Animated.Value) {
    Animated.sequence([
      Animated.timing(scaleRef, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleRef, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  }

  async function handleLogin() {
    if (!email || !senha) {
      return Alert.alert("Erro", "Preencha todos os campos");
    }

    try {
      setLoading(true);
      animateButton(scale);

      const ipServidor = await AsyncStorage.getItem("ipServidor");
      if (!ipServidor) throw new Error("IP do servidor não configurado");

      const apiUrl = `${ipServidor}/usuario/login`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("E-mail ou senha inválidos");
        }
        throw new Error("Erro ao tentar fazer login");
      }

      const usuario = await response.json();

      await AsyncStorage.setItem("usuarioEmail", email);
      await AsyncStorage.setItem("usuarioSenha", senha);
      await AsyncStorage.setItem("usuarioNome", usuario.nome);
      await AsyncStorage.setItem("usuarioId", usuario.chave.toString());

      setTimeout(() => {
        Alert.alert("✅ Login feito!", `Bem-vindo(a), ${usuario.nome}`);
        router.replace("/Principal");
      }, 300);
    } catch (error: any) {
      console.error(error);
      Alert.alert("Erro", error.message);
    } finally {
      setLoading(false);
    }
  }

  function handleCadastro() {
    animateButton(scaleCadastro);
    setTimeout(() => {
      router.push("/Cadastro");
    }, 200);
  }

  function handleServidor() {
    console.log("Botão de servidor clicado");
    animateButton(scaleServidor);
    setTimeout(() => {
      router.push("/Servidorconfig");
    }, 200);
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
          <Text style={styles.botaoTexto}>
            {loading ? "Entrando..." : "Entrar"}
          </Text>
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
