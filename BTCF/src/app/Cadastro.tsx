import { View, Text, TextInput, StyleSheet, Alert, Animated } from "react-native";
import { useState, useRef } from "react";
import { useRouter } from "expo-router";
import { Button } from "../components/buttons";
import { Pressable } from "react-native";

export default function Cadastro() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const router = useRouter();

  const scaleBack = useRef(new Animated.Value(1)).current;

  function animateButton(scaleRef: Animated.Value) {
    Animated.sequence([
      Animated.timing(scaleRef, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleRef, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }

  function handleCadastro() {
    if (!nome || !email || !senha) {
      return Alert.alert("Erro", "Preencha todos os campos");
    }

    Alert.alert("Sucesso", `Usuário ${nome} cadastrado com sucesso!`);
    // Aqui você pode futuramente redirecionar pra principal direto ou fazer login automático
  }

  function voltarParaLogin() {
    animateButton(scaleBack);
    setTimeout(() => {
      router.replace("/");
    }, 200);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cadastro</Text>

      <TextInput
        style={styles.input}
        placeholder="Nome"
        value={nome}
        onChangeText={setNome}
      />
      <TextInput
        style={styles.input}
        placeholder="E-mail"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Senha"
        secureTextEntry
        value={senha}
        onChangeText={setSenha}
      />

      <Button title="Cadastrar" onPress={handleCadastro} />

      <Animated.View style={{ transform: [{ scale: scaleBack }], marginTop: 12 }}>
        <Pressable onPress={voltarParaLogin}>
          <Text style={styles.voltarText}>Voltar para o login</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 32,
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 24,
  },
  input: {
    height: 50,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  voltarText: {
    textAlign: "center",
    color: "#007bff",
    fontSize: 16,
  },
});
