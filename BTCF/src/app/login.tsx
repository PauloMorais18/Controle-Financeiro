import { View, Text, TextInput, StyleSheet, Alert, Pressable, Animated } from "react-native";
import { useState, useRef } from "react";
import { useRouter } from "expo-router";
import { Button } from "../components/buttons";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  // Animação
  const scale = useRef(new Animated.Value(1)).current;
  const scaleCadastro = useRef(new Animated.Value(1)).current;

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

  function handleLogin() {
    if (!email || !senha) {
      return Alert.alert("Erro", "Preencha todos os campos");
    }

    animateButton(scale); // animação do botão de login

    setTimeout(() => {
      Alert.alert("Login feito!", `Email: ${email}`);
      router.push("/Principal");
    }, 200); // pequena pausa pra deixar a animação rolar antes de redirecionar
  }

  function handleCadastro() {
    animateButton(scaleCadastro); // animação no texto de cadastro
    setTimeout(() => {
      router.push("/Cadastro");
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
      />
      <TextInput
        style={styles.input}
        placeholder="Senha"
        secureTextEntry
        value={senha}
        onChangeText={setSenha}
      />

      <Animated.View style={{ transform: [{ scale }] }}>
        <Button title="Entrar" onPress={handleLogin} />
      </Animated.View>

      <Animated.View style={{ transform: [{ scale: scaleCadastro }] }}>
        <Pressable onPress={handleCadastro}>
          <Text style={styles.linkText}>Não tem conta? Cadastre-se</Text>
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
  linkText: {
    marginTop: 16,
    color: "#007bff",
    textAlign: "center",
    fontSize: 16,
  },
});
