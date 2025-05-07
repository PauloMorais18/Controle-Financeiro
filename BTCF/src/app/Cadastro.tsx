import { View, Text, TextInput, StyleSheet, Alert, Animated, Pressable, TouchableOpacity } from "react-native";
import { useState, useRef } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Cadastro() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailInvalido, setEmailInvalido] = useState(false);

  const router = useRouter();
  const scaleBack = useRef(new Animated.Value(1)).current;
  const scaleServidor = useRef(new Animated.Value(1)).current;

  function animateButton(scaleRef: Animated.Value) {
    Animated.sequence([
      Animated.timing(scaleRef, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleRef, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  }

  function voltarParaLogin() {
    animateButton(scaleBack);
    setTimeout(() => {
      router.replace("/");
    }, 200);
  }

  function irParaServidor() {
    animateButton(scaleServidor);
    setTimeout(() => {
      router.push("/Servidor");
    }, 200);
  }

  function validarEmail(email: string) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email.toLowerCase());
  }

  const handleCadastro = async () => {
    if (!nome || !email || !senha || !confirmarSenha) {
      return Alert.alert("Erro", "Preencha todos os campos!");
    }

    if (!validarEmail(email)) {
      return Alert.alert("Erro", "Digite um e-mail válido!");
    }

    if (senha !== confirmarSenha) {
      return Alert.alert("Erro", "As senhas não coincidem!");
    }

    try {
      setLoading(true);
      let ipServidor = await AsyncStorage.getItem("ipServidor");

      // fallback se não houver ip salvo
      if (!ipServidor) ipServidor = "http://192.168.68.108:3000";

      const response = await fetch(`${ipServidor}/usuario`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, email, senha }),
      });

      if (!response.ok) {
        const erro = await response.json();
        throw new Error(erro.erro || "Erro ao cadastrar usuário.");
      }

      Alert.alert("✅ Sucesso", `Usuário ${nome} cadastrado com sucesso!`);
      router.replace("/");
    } catch (error: any) {
      console.error("Erro no cadastro:", error);
      Alert.alert("Erro", error.message || "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  const camposIncompletos = !nome || !email || !senha || !confirmarSenha || senha !== confirmarSenha || !validarEmail(email);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cadastro</Text>

      <TextInput style={styles.input} placeholder="Nome" value={nome} onChangeText={setNome} />

      <TextInput
        style={styles.input}
        placeholder="E-mail"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          if (text.length > 0) setEmailInvalido(!validarEmail(text));
          else setEmailInvalido(false);
        }}
      />
      {emailInvalido && <Text style={styles.erroTexto}>E-mail inválido</Text>}

      <View style={styles.senhaContainer}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Senha"
          secureTextEntry={!mostrarSenha}
          value={senha}
          onChangeText={setSenha}
        />
        <Pressable onPress={() => setMostrarSenha(!mostrarSenha)} style={styles.olho}>
          <Ionicons name={mostrarSenha ? "eye" : "eye-off"} size={24} color="#333" />
        </Pressable>
      </View>

      <View style={styles.senhaContainer}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Confirmar Senha"
          secureTextEntry={!mostrarConfirmarSenha}
          value={confirmarSenha}
          onChangeText={setConfirmarSenha}
        />
        <Pressable onPress={() => setMostrarConfirmarSenha(!mostrarConfirmarSenha)} style={styles.olho}>
          <Ionicons name={mostrarConfirmarSenha ? "eye" : "eye-off"} size={24} color="#333" />
        </Pressable>
      </View>

      <TouchableOpacity
        style={[styles.botao, (loading || camposIncompletos) && { backgroundColor: "#999" }]}
        onPress={handleCadastro}
        disabled={loading || camposIncompletos}
      >
        <Text style={styles.botaoTexto}>{loading ? "Salvando..." : "Cadastrar"}</Text>
      </TouchableOpacity>

      <Animated.View style={{ transform: [{ scale: scaleBack }], marginTop: 12 }}>
        <Pressable onPress={voltarParaLogin}>
          <Text style={styles.voltarText}>Voltar para o login</Text>
        </Pressable>
      </Animated.View>

      <Animated.View style={{ transform: [{ scale: scaleServidor }], marginTop: 12 }}>
        <Pressable onPress={irParaServidor}>
          <Text style={styles.voltarText}>Configurar servidor</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 32, justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 24, textAlign: "center" },
  input: { height: 50, borderColor: "#ccc", borderWidth: 1, borderRadius: 8, paddingHorizontal: 16, marginBottom: 8 },
  erroTexto: { color: "red", marginBottom: 8, marginLeft: 4 },
  senhaContainer: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  olho: { position: "absolute", right: 16 },
  botao: { backgroundColor: "#4CAF50", paddingVertical: 14, borderRadius: 8, alignItems: "center", marginTop: 10 },
  botaoTexto: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  voltarText: { textAlign: "center", color: "#007bff", fontSize: 16 },
});
