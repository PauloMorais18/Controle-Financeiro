import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useTheme } from "./ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

export const screenOptions = {
  headerShown: true,
  title: "Perfil",
};

export default function Perfil() {
  const { tema } = useTheme();
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [usuarioId, setUsuarioId] = useState<string | null>(null);

  useEffect(() => {
    async function carregarDados() {
      const nomeArmazenado = await AsyncStorage.getItem("usuarioNome");
      const emailArmazenado = await AsyncStorage.getItem("usuarioEmail");
      const senhaArmazenada = await AsyncStorage.getItem("usuarioSenha");
      const idArmazenado = await AsyncStorage.getItem("usuarioId");

      if (nomeArmazenado) setNome(nomeArmazenado);
      if (emailArmazenado) setEmail(emailArmazenado);
      if (senhaArmazenada) setSenha(senhaArmazenada);
      if (idArmazenado) setUsuarioId(idArmazenado);
    }

    carregarDados();
  }, []);

  async function handleSalvar() {
    if (!usuarioId) {
      Alert.alert("Erro", "ID do usuário não encontrado.");
      return;
    }

    try {
      const ip = await AsyncStorage.getItem("ipServidor");
      if (!ip) {
        Alert.alert("Erro", "IP do servidor não configurado.");
        return;
      }

      const response = await fetch(`${ip}/usuario/${usuarioId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, senha }),
      });

      if (!response.ok) {
        throw new Error("Erro ao atualizar no servidor.");
      }

      const atualizado = await response.json();

      await AsyncStorage.setItem("usuarioNome", atualizado.nome);
      await AsyncStorage.setItem("usuarioSenha", senha);

      Alert.alert("✅ Sucesso", "Dados atualizados com sucesso!");
    } catch (error) {
      console.error(error);
      Alert.alert("Erro", "Não foi possível salvar as alterações.");
    }
  }

  async function handleLogout() {
    Alert.alert("Sair da Conta", "Você realmente deseja sair?", [
      {
        text: "Cancelar",
        style: "cancel",
      },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          try {
            await AsyncStorage.multiRemove([
              "usuarioEmail",
              "usuarioSenha",
              "usuarioNome",
              "usuarioId",
            ]);
            router.replace("/"); // Volta para o login
          } catch (error) {
            console.error("Erro ao sair:", error);
            Alert.alert("Erro", "Não foi possível sair da conta.");
          }
        },
      },
    ]);
  }

  return (
    <View style={[styles.container, { backgroundColor: tema.backgroundColor }]}>
      <Image
        source={{ uri: "https://www.w3schools.com/howto/img_avatar.png" }}
        style={styles.avatar}
      />

      <Text style={[styles.label, { color: tema.textColor }]}>Nome</Text>
      <TextInput
        style={[styles.input, { borderColor: tema.inputBorderColor, color: tema.textColor }]}
        value={nome}
        onChangeText={setNome}
        placeholder="Digite seu nome"
        placeholderTextColor={tema.itemColor}
      />

      <Text style={[styles.label, { color: tema.textColor }]}>E-mail</Text>
      <TextInput
        style={[
          styles.input,
          { borderColor: tema.inputBorderColor, color: tema.itemColor, backgroundColor: "#eee" },
        ]}
        value={email}
        editable={false}
      />

      <Text style={[styles.label, { color: tema.textColor }]}>Senha</Text>
      <TextInput
        style={[styles.input, { borderColor: tema.inputBorderColor, color: tema.textColor }]}
        secureTextEntry
        value={senha}
        onChangeText={setSenha}
        placeholder="Digite sua nova senha"
        placeholderTextColor={tema.itemColor}
      />

      <TouchableOpacity
        style={[styles.botao, { backgroundColor: tema.linkColor }]}
        onPress={handleSalvar}
      >
        <Text style={styles.botaoTexto}>💾 Salvar Alterações</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.botao, styles.logout]} onPress={handleLogout}>
        <Text style={styles.botaoTexto}>🚪 Sair da Conta</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    alignItems: "center",
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 24,
    marginTop: 40,
  },
  label: {
    alignSelf: "flex-start",
    marginLeft: 20,
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 16,
  },
  input: {
    width: "90%",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    marginBottom: 8,
  },
  botao: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
    alignItems: "center",
    width: "80%",
  },
  logout: {
    backgroundColor: "#f44336",
  },
  botaoTexto: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
