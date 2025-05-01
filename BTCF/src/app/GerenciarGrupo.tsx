import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "./ThemeContext";

export default function GerenciarGrupo() {
  const { tema } = useTheme();
  const [grupos, setGrupos] = useState<any[]>([]);
  const [emailParaAdicionar, setEmailParaAdicionar] = useState("");
  const [grupoSelecionado, setGrupoSelecionado] = useState<number | null>(null);

  useEffect(() => {
    carregarGruposDoUsuario();
  }, []);

  async function carregarGruposDoUsuario() {
    try {
      const email = await AsyncStorage.getItem("usuarioEmail");
      const ip = await AsyncStorage.getItem("ipServidor");
      if (!email || !ip) throw new Error("Dados de autenticação ausentes.");

      const usuarioRes = await fetch(`${ip}/usuario/por-email/${email}`);
      if (!usuarioRes.ok) throw new Error("Usuário não encontrado.");
      const usuarioData = await usuarioRes.json();
      const chaveUsuario = usuarioData.chave;

      const gruposRes = await fetch(`${ip}/grupo/usuario/${chaveUsuario}`);
      if (!gruposRes.ok) throw new Error("Erro ao buscar grupos.");
      const gruposData = await gruposRes.json();
      setGrupos(gruposData);
    } catch (error: any) {
      console.error(error);
      Alert.alert("Erro", error.message);
    }
  }

  async function adicionarPessoaAoGrupo(grupoId: number) {
    try {
      if (!emailParaAdicionar.trim()) {
        Alert.alert("Erro", "Digite um e-mail para adicionar.");
        return;
      }

      const ip = await AsyncStorage.getItem("ipServidor");
      if (!ip) throw new Error("IP do servidor não configurado.");

      const res = await fetch(`${ip}/grupo/adicionar-pessoa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailParaAdicionar.trim(), chavegrupo: grupoId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.erro || "Erro desconhecido");
      }

      Alert.alert("✅ Sucesso", data.mensagem);
      setEmailParaAdicionar("");
      setGrupoSelecionado(null);
    } catch (error: any) {
      Alert.alert("Erro ao adicionar pessoa ao grupo", error.message);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: tema.backgroundColor }]}>
      <Text style={[styles.title, { color: tema.textColor }]}>Meus Grupos</Text>

      <FlatList
        data={grupos}
        keyExtractor={(item) => item.chave.toString()}
        renderItem={({ item }) => (
          <View style={[styles.grupoBox, { borderColor: tema.inputBorderColor }]}>
            <Text style={[styles.grupoNome, { color: tema.textColor }]}>{item.nome}</Text>
            <Text style={[styles.descricao, { color: tema.itemColor }]}>
              {item.descricao || "Sem descrição"}
            </Text>

            {grupoSelecionado === item.chave ? (
              <>
                <TextInput
                  placeholder="E-mail da pessoa"
                  placeholderTextColor={tema.itemColor}
                  value={emailParaAdicionar}
                  onChangeText={setEmailParaAdicionar}
                  style={[styles.input, {
                    borderColor: tema.inputBorderColor,
                    backgroundColor: tema.inputBackground,
                    color: tema.textColor,
                  }]}
                />
                <TouchableOpacity
                  onPress={() => adicionarPessoaAoGrupo(item.chave)}
                  style={[styles.botaoAdicionar, { backgroundColor: tema.linkColor }]}
                >
                  <Text style={styles.botaoTexto}>Confirmar</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity onPress={() => setGrupoSelecionado(item.chave)}>
                <Text style={{ color: tema.linkColor }}>➕ Adicionar pessoa</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        ListEmptyComponent={
          <Text style={{ color: tema.itemColor, fontStyle: "italic", marginTop: 20 }}>
            Nenhum grupo encontrado.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 16 },
  grupoBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  grupoNome: { fontSize: 18, fontWeight: "bold" },
  descricao: { marginTop: 4 },
  input: { marginTop: 10, borderWidth: 1, borderRadius: 6, padding: 10, fontSize: 15 },
  botaoAdicionar: {
    marginTop: 10,
    padding: 10,
    borderRadius: 6,
    alignItems: "center",
  },
  botaoTexto: {
    color: "#fff",
    fontWeight: "bold",
  },
});
