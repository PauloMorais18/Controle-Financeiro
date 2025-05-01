import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Modal,
  Pressable,
  FlatList,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useTheme } from "./ThemeContext";

const screenWidth = Dimensions.get("window").width;

export default function Principal() {
  const router = useRouter();
  const { tema, temaEscuro } = useTheme();

  const [grupos, setGrupos] = useState<any[]>([]);
  const [grupoSelecionado, setGrupoSelecionado] = useState<any>(null);
  const [dataAtual, setDataAtual] = useState(new Date());
  const [modalGrupoVisivel, setModalGrupoVisivel] = useState(false);
  const [modalDataVisivel, setModalDataVisivel] = useState(false);
  const [totais, setTotais] = useState({ entradas: 0, saidas: 0 });

  useEffect(() => {
    carregarGrupos();
  }, []);

  useEffect(() => {
    if (grupoSelecionado) {
      carregarTotais();
    }
  }, [grupoSelecionado, dataAtual]);

  async function carregarGrupos() {
    try {
      const email = await AsyncStorage.getItem("usuarioEmail");
      const ip = await AsyncStorage.getItem("ipServidor");
      if (!email || !ip) throw new Error("Dados de autenticação ausentes.");

      const usuarioRes = await fetch(`${ip}/usuario/por-email/${email}`);
      if (!usuarioRes.ok) throw new Error("Usuário não encontrado.");
      const usuario = await usuarioRes.json();

      const gruposRes = await fetch(`${ip}/grupo/usuario/${usuario.chave}`);
      if (!gruposRes.ok) throw new Error("Erro ao buscar grupos.");
      const gruposData = await gruposRes.json();
      setGrupos(gruposData);
      if (gruposData.length > 0) setGrupoSelecionado(gruposData[0]);
    } catch (err: any) {
      Alert.alert("Erro", err.message);
    }
  }

  async function carregarTotais() {
    try {
      const ip = await AsyncStorage.getItem("ipServidor");
      const anoMes = dataAtual.toISOString().slice(0, 7); // yyyy-mm

      const res = await fetch(`${ip}/grafico/gastos/${grupoSelecionado.chave}/${anoMes}`);
      if (!res.ok) throw new Error("Erro ao buscar totais.");
      const data = await res.json();

      let entradas = 0, saidas = 0;
      data.forEach((item: any) => {
        if (item.tipo === "entrada") entradas += Number(item.total);
        else if (item.tipo === "saida") saidas += Number(item.total);
      });
      setTotais({ entradas, saidas });
    } catch (err: any) {
      Alert.alert("Erro ao carregar totais", err.message);
    }
  }

  function mudarMes(direcao: number) {
    const nova = new Date(dataAtual);
    nova.setMonth(nova.getMonth() + direcao);
    setDataAtual(nova);
  }

  return (
    <View style={[styles.container, { backgroundColor: tema.backgroundColor }]}>

      {/* Header com filtro de grupo e data */}
      <View style={styles.filtroContainer}>
        <TouchableOpacity onPress={() => setModalGrupoVisivel(true)} style={styles.filtroBotao}>
          <Text style={{ color: tema.textColor }}>👥 {grupoSelecionado?.nome || "Grupo"}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setModalDataVisivel(true)} style={styles.filtroBotao}>
          <Text style={{ color: tema.textColor }}>📅 {dataAtual.toISOString().slice(0, 7)}</Text>
        </TouchableOpacity>
      </View>

      {/* Totais em destaque */}
      <View style={styles.cardTotais}>
        <Text style={[styles.valorTotal, { color: tema.textColor }]}>Saldo</Text>
        <Text style={[styles.valorSaldo, { color: tema.textColor }]}>R$ {(totais.entradas - totais.saidas).toFixed(2)}</Text>
        <View style={styles.totaisBox}>
          <Text style={{ color: "green" }}>+ R$ {totais.entradas.toFixed(2)}</Text>
          <Text style={{ color: "red" }}>- R$ {totais.saidas.toFixed(2)}</Text>
        </View>
      </View>

      {/* Botões de ação */}
      <View style={styles.botoesContainer}>
        <TouchableOpacity
          style={[styles.botaoAcao, { backgroundColor: tema.linkColor }]}
          onPress={() => router.push("/MovimentacaoEntrada")}
        >
          <Text style={styles.botaoTexto}>➕ Entrada</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.botaoAcao, { backgroundColor: tema.linkColor }]}
          onPress={() => router.push("/MovimentacaoSaida")}
        >
          <Text style={styles.botaoTexto}>➖ Saída</Text>
        </TouchableOpacity>
      </View>

      {/* Modal de seleção de grupo */}
      <Modal visible={modalGrupoVisivel} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitulo}>Selecionar Grupo</Text>
            {grupos.map((grupo) => (
              <Pressable
                key={grupo.chave}
                onPress={() => {
                  setGrupoSelecionado(grupo);
                  setModalGrupoVisivel(false);
                }}
                style={styles.modalItem}
              >
                <Text>{grupo.nome}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>

      {/* Modal de seleção de data */}
      <Modal visible={modalDataVisivel} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitulo}>Mês de Referência</Text>
            <View style={styles.dataSelecao}>
              <TouchableOpacity onPress={() => mudarMes(-1)}>
                <Text style={{ fontSize: 24 }}>◀️</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 18 }}>{dataAtual.toISOString().slice(0, 7)}</Text>
              <TouchableOpacity onPress={() => mudarMes(1)}>
                <Text style={{ fontSize: 24 }}>▶️</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => setModalDataVisivel(false)}>
              <Text style={{ marginTop: 20, color: "blue" }}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  filtroContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  filtroBotao: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  cardTotais: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: "#f2f2f2",
    alignItems: "center",
    marginBottom: 20,
  },
  valorTotal: { fontSize: 16 },
  valorSaldo: { fontSize: 28, fontWeight: "bold" },
  totaisBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "80%",
    marginTop: 10,
  },
  botoesContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 20,
  },
  botaoAcao: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  botaoTexto: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 20,
  },
  modalTitulo: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  modalItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#ddd",
  },
  dataSelecao: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
});
