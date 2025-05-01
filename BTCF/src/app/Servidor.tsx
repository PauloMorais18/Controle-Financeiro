import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Pressable,
  Animated,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useTheme } from "./ThemeContext";

export default function Servidor() {
  const { tema } = useTheme();
  const [ipServidor, setIpServidor] = useState("");
  const router = useRouter();

  const scaleCadastro = useRef(new Animated.Value(1)).current;
  const scaleLogin = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    async function carregarIPSalvo() {
      const ipSalvo = await AsyncStorage.getItem("ipServidor");
      if (ipSalvo) setIpServidor(ipSalvo);
    }
    carregarIPSalvo();
  }, []);

  function animateButton(scaleRef: Animated.Value) {
    Animated.sequence([
      Animated.timing(scaleRef, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleRef, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  }

  const handleSalvar = async () => {
    if (!ipServidor.startsWith("http://") && !ipServidor.startsWith("https://")) {
      Alert.alert("Erro", "O IP deve começar com http:// ou https://");
      return;
    }

    try {
      await AsyncStorage.setItem("ipServidor", ipServidor);
      Alert.alert("✅ Sucesso", "IP do servidor atualizado!");
    } catch (error) {
      console.error(error);
      Alert.alert("Erro", "Não foi possível salvar o IP.");
    }
  };

  function irParaCadastro() {
    animateButton(scaleCadastro);
    setTimeout(() => {
      router.push("/Cadastro");
    }, 200);
  }

  function voltarParaLogin() {
    animateButton(scaleLogin);
    setTimeout(() => {
      router.replace("/");
    }, 200);
  }

  return (
    <View style={[styles.container, { backgroundColor: tema.backgroundColor }]}>
      <Text style={[styles.title, { color: tema.textColor }]}>Configurar Servidor</Text>

      <Text style={[styles.label, { color: tema.textColor }]}>Endereço IP do servidor:</Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: tema.sectionBoxBackground,
            borderColor: tema.inputBorderColor,
            color: tema.textColor,
          },
        ]}
        placeholder="http://192.168.0.100:3000"
        placeholderTextColor={tema.itemColor}
        value={ipServidor}
        onChangeText={setIpServidor}
        autoCapitalize="none"
      />

      <TouchableOpacity style={styles.button} onPress={handleSalvar}>
        <Text style={styles.buttonText}>Salvar</Text>
      </TouchableOpacity>

      <Animated.View style={{ transform: [{ scale: scaleCadastro }], marginTop: 20 }}>
        <Pressable onPress={irParaCadastro}>
          <Text style={styles.linkText}>Não tem conta? Cadastre-se</Text>
        </Pressable>
      </Animated.View>

      <Animated.View style={{ transform: [{ scale: scaleLogin }], marginTop: 12 }}>
        <Pressable onPress={voltarParaLogin}>
          <Text style={styles.linkText}>Voltar para o login</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 24, textAlign: "center" },
  label: { fontSize: 16, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#1976D2",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  linkText: {
    textAlign: "center",
    color: "#007bff",
    fontSize: 16,
  },
});
