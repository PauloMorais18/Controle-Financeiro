import React, { useState, useEffect, useCallback } from "react";
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
import { useFocusEffect } from "@react-navigation/native";

export default function GerenciarGrupo() {
  const { tema } = useTheme();
  const [grupos, setGrupos] = useState<any[]>([]);
  const [emailParaAdicionar, setEmailParaAdicionar] = useState("");
  const [grupoSelecionado, setGrupoSelecionado] = useState<number | null>(null);
  const [membrosGrupo, setMembrosGrupo] = useState<{ [grupoId: number]: any[] }>({});
  const [usuarioId, setUsuarioId] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      carregarGruposDoUsuario();
    }, [])
  );

  async function carregarGruposDoUsuario() {
    try {
      const email = await AsyncStorage.getItem("usuarioEmail");
      const ip = await AsyncStorage.getItem("ipServidor");
      if (!email || !ip) throw new Error("Dados de autenticação ausentes.");

      const usuarioRes = await fetch(`${ip}/usuario/por-email/${email}`);
      if (!usuarioRes.ok) throw new Error("Usuário não encontrado.");
      const usuarioData = await usuarioRes.json();
      setUsuarioId(usuarioData.chave);

      const gruposRes = await fetch(`${ip}/grupo/usuario/${usuarioData.chave}`);
      if (!gruposRes.ok) throw new Error("Erro ao buscar grupos.");
      const grupos = await gruposRes.json();
      setGrupos(grupos);

    } catch (error: any) {
      console.error(error);
      Alert.alert("Erro", error.message);
    }
  }

  async function buscarMembrosDoGrupo(grupoId: number) {
    try {
      const ip = await AsyncStorage.getItem("ipServidor");
      if (!ip) throw new Error("IP do servidor não configurado.");

      const res = await fetch(`${ip}/grupo/${grupoId}/membros`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.erro || "Erro ao buscar membros");

      setMembrosGrupo((prev) => ({ ...prev, [grupoId]: data }));
    } catch (error: any) {
      console.error(error);
      Alert.alert("Erro ao buscar membros", error.message);
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

      if (!res.ok) throw new Error(data.erro || "Erro desconhecido");

      Alert.alert("✅ Sucesso", data.mensagem);
      setEmailParaAdicionar("");
      await buscarMembrosDoGrupo(grupoId);
    } catch (error: any) {
      Alert.alert("Erro ao adicionar pessoa ao grupo", error.message);
    }
  }

  function obterPapel(grupo: any): "Administrador" | "Participante" {
    if (grupo.chaveusuariocriou === usuarioId) return "Administrador";
    return "Participante";
  }

  return (
    <View style={[styles.container, { backgroundColor: tema.backgroundColor }]}>
      <Text style={[styles.title, { color: tema.textColor }]}>Meus Grupos</Text>

      <TouchableOpacity
        onPress={carregarGruposDoUsuario}
        style={[styles.botaoAtualizar, { backgroundColor: tema.linkColor }]}
      >
        <Text style={styles.botaoTexto}>🔄 Atualizar</Text>
      </TouchableOpacity>

      <FlatList
        data={grupos}
        keyExtractor={(item) => item.chave.toString()}
        renderItem={({ item }) => (
          <View style={[styles.grupoBox, { borderColor: tema.inputBorderColor }]}>
            <Text style={[styles.grupoNome, { color: tema.textColor }]}>{item.nome}</Text>
            <Text style={[styles.descricao, { color: tema.itemColor }]}>
              {item.descricao || "Sem descrição"}
            </Text>
            <Text style={[styles.papel, { color: tema.linkColor }]}>Papel: {obterPapel(item)}</Text>

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

                {membrosGrupo[item.chave] && (
                  <View style={{ marginTop: 10 }}>
                    <Text style={{ color: tema.itemColor, fontWeight: "bold" }}>Membros:</Text>
                    {membrosGrupo[item.chave].map((membro, i) => (
                      <Text key={i} style={{ color: tema.textColor, marginLeft: 10 }}>
                        {membro.lider ? "👑 " : "👤 "}
                        {membro.nome} ({membro.email})
                      </Text>
                    ))}
                  </View>
                )}
              </>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  setGrupoSelecionado(item.chave);
                  buscarMembrosDoGrupo(item.chave);
                }}
              >
                <Text style={{ color: tema.linkColor }}>👥 Adicionar pessoa</Text>
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
  papel: { marginTop: 6, fontWeight: "600" },
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
  botaoAtualizar: {
    alignSelf: "flex-end",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
});
