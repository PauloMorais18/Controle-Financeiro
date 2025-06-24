import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
} from "react-native";
import { useTheme } from "./ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface Grupo {
  chave: number;
  nome: string;
  descricao: string;
  criado_em: string;
}

export default function Grupo() {
  const { tema } = useTheme();
  const [nomeGrupo, setNomeGrupo] = useState("");
  const [descricaoGrupo, setDescricaoGrupo] = useState("");
  const [grupos, setGrupos] = useState<Grupo[]>([]);

  useEffect(() => {
    listarGrupos();
  }, []);

  async function listarGrupos() {
    try {
      const ip = await AsyncStorage.getItem("ipServidor");
      const usuarioId = await AsyncStorage.getItem("usuarioId");

      if (!ip || !usuarioId) {
        throw new Error("IP ou ID do usuário não encontrados.");
      }

      const response = await fetch(`${ip}/grupo/usuario/${usuarioId}`);
      if (!response.ok) {
        const erroTexto = await response.text();
        throw new Error(`Erro ao buscar grupos do usuário: ${erroTexto}`);
      }

      const data = await response.json();
      setGrupos(data);
    } catch (error: any) {
      console.error("Erro ao listar grupos:", error);
      Alert.alert("Erro ao carregar grupos", error.message);
    }
  }

  async function criarGrupo() {
    if (nomeGrupo.trim().length === 0) {
      return Alert.alert("Erro", "Digite um nome para o grupo.");
    }

    try {
      const ip = await AsyncStorage.getItem("ipServidor");
      const usuarioId = await AsyncStorage.getItem("usuarioId");

      if (!ip) throw new Error("IP do servidor não configurado.");
      if (!usuarioId) throw new Error("Usuário não autenticado.");

      const response = await fetch(`${ip}/grupo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nomeGrupo,
          descricao: descricaoGrupo,
          chaveusuario: Number(usuarioId),
        }),
      });

      if (!response.ok) {
        const texto = await response.text();
        throw new Error(`Erro ao criar grupo: ${texto}`);
      }

      setNomeGrupo("");
      setDescricaoGrupo("");
      await listarGrupos();
      Alert.alert("✅ Sucesso", "Grupo criado com sucesso!");
    } catch (error: any) {
      console.error(error);
      Alert.alert("Erro", error.message);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: tema.backgroundColor }]}>
      <Text style={[styles.title, { color: tema.textColor }]}>Criar Novo Grupo</Text>

      <TextInput
        placeholder="Nome do grupo"
        placeholderTextColor={tema.itemColor}
        value={nomeGrupo}
        onChangeText={setNomeGrupo}
        style={[styles.input, {
          borderColor: tema.inputBorderColor,
          backgroundColor: tema.inputBackground,
          color: tema.textColor
        }]}
      />
      <TextInput
        placeholder="Descrição (opcional)"
        placeholderTextColor={tema.itemColor}
        value={descricaoGrupo}
        onChangeText={setDescricaoGrupo}
        style={[styles.input, {
          borderColor: tema.inputBorderColor,
          backgroundColor: tema.inputBackground,
          color: tema.textColor
        }]}
      />
      <TouchableOpacity
        style={[styles.button, { backgroundColor: tema.linkColor }]}
        onPress={criarGrupo}
      >
        <Text style={styles.buttonText}>Salvar Grupo</Text>
      </TouchableOpacity>

      <Text style={[styles.subtitle, { color: tema.textColor }]}>Grupos Criados</Text>
      <FlatList
        data={grupos}
        keyExtractor={(item) => item.chave.toString()}
        renderItem={({ item }) => (
          <View style={[styles.groupItem, { borderBottomColor: tema.inputBorderColor }]}>
            <Text style={[styles.groupName, { color: tema.textColor }]}>{item.nome}</Text>
            <Text style={{ color: tema.itemColor, fontSize: 13 }}>{item.descricao}</Text>
            <Text style={{ color: tema.itemColor, fontSize: 11, marginTop: 4 }}>
              Criado em: {new Date(item.criado_em).toLocaleString("pt-BR")}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={{ color: tema.itemColor, fontStyle: "italic" }}>
            Nenhum grupo ainda.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 16 },
  subtitle: { fontSize: 18, fontWeight: "600", marginVertical: 16 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  button: {
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  groupItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    marginBottom: 10,
  },
  groupName: { fontSize: 16, fontWeight: "600" },
});
