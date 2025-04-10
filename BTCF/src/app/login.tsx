import { View, Text, TextInput, StyleSheet, Alert, Pressable } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Button } from "../components/buttons";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const router = useRouter();

  function handleLogin() {
    if (!email || !senha) {
      return Alert.alert("Erro", "Preencha todos os campos");
    }
    Alert.alert("Login feito!", `Email: ${email}`);
  }

  function handleCadastro() {
    router.push("/Cadastro");
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

      <Button title="Entrar" onPress={handleLogin} />

      <Pressable onPress={handleCadastro}>
        <Text style={styles.linkText}>Não tem conta? Cadastre-se</Text>
      </Pressable>
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
