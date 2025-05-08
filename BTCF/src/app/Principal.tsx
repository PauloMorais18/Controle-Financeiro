// Arquivo: Principal.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useTheme } from "./ThemeContext";
import { PieChart } from "react-native-chart-kit";

const screenWidth = Dimensions.get("window").width;

export default function Principal() {
  const router = useRouter();
  const themeContext = useTheme();
  const tema = themeContext?.tema || {
    backgroundColor: "#fff",
    textColor: "#000",
    itemColor: "#333",
    linkColor: "#1976D2",
  };

  const [dataAtual, setDataAtual] = useState(new Date());
  const [modalGrupoVisivel, setModalGrupoVisivel] = useState(false);
  const [modalDataVisivel, setModalDataVisivel] = useState(false);
  const [grupos, setGrupos] = useState<any[]>([]);
  const [grupoSelecionado, setGrupoSelecionado] = useState<any>(null);
  const [totais, setTotais] = useState({ entradas: 0, saidas: 0 });

  useEffect(() => {
    carregarGrupos();
  }, []);

  useEffect(() => {
    if (grupoSelecionado) carregarTotais();
  }, [grupoSelecionado, dataAtual]);

  useEffect(() => {
    const intervalo = setInterval(() => {
      if (grupoSelecionado) carregarTotais();
    }, 60000);
    return () => clearInterval(intervalo);
  }, [grupoSelecionado, dataAtual]);

  function formatarMes(data: Date) {
    return data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  }

  function mudarMes(direcao: number) {
    const nova = new Date(dataAtual);
    nova.setMonth(nova.getMonth() + direcao);
    setDataAtual(nova);
  }

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
      const grupoSalvo = gruposData.find((g: any) => g.chave === grupoSelecionado?.chave);
      setGrupoSelecionado(grupoSalvo || gruposData[0]);
    } catch (err: any) {
      Alert.alert("Erro", err.message);
    }
  }

  async function carregarTotais() {
    try {
      const ip = await AsyncStorage.getItem("ipServidor");
      const anoMes = dataAtual.toISOString().slice(0, 7);
      const grupoId = grupoSelecionado?.chave;
      if (!ip || !grupoId) return;

      const res = await fetch(`${ip}/grafico/gastos/${grupoId}/${anoMes}`);
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

  const saldo = totais.entradas - totais.saidas;
  const status = saldo >= 0 ? "Positivo" : "Negativo";

  return (
    <ScrollView style={[styles.container, { backgroundColor: tema.backgroundColor }]}>
      {/* Cabeçalho e Filtros */}
      <View style={styles.filtrosRow}>
        <TouchableOpacity onPress={() => setModalGrupoVisivel(true)} style={styles.filtroBotao}>
          <Text style={[styles.filtroTexto, { color: tema.textColor }]}>👥 {grupoSelecionado?.nome || "Grupo"}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setModalDataVisivel(true)} style={styles.filtroBotao}>
          <Text style={[styles.filtroTexto, { color: tema.textColor }]}>📅 {formatarMes(dataAtual)}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={carregarTotais} style={[styles.filtroBotao, { backgroundColor: "#e0e0e0" }]}>
          <Text style={[styles.filtroTexto, { color: tema.textColor }]}>🔄 Atualizar</Text>
        </TouchableOpacity>
      </View>

      {/* Saldo */}
      <View style={styles.cardTotais}>
        <Text style={[styles.valorTotal, { color: tema.textColor }]}>Saldo Total</Text>
        <Text style={[styles.valorSaldo, { color: tema.textColor }]}>R$ {saldo.toFixed(2)} ({status})</Text>
        <View style={styles.totaisBox}>
          <Text style={{ color: "green" }}>Entradas: R$ {totais.entradas.toFixed(2)}</Text>
          <Text style={{ color: "red" }}>Saídas: R$ {totais.saidas.toFixed(2)}</Text>
        </View>
      </View>

      {/* Gráfico */}
      <Text style={[styles.sectionTitle, { color: tema.textColor }]}>Resumo Gráfico</Text>
      <PieChart
        data={[
          {
            name: "Entradas",
            population: totais.entradas,
            color: "green",
            legendFontColor: "#000",
            legendFontSize: 14,
          },
          {
            name: "Saídas",
            population: totais.saidas,
            color: "red",
            legendFontColor: "#000",
            legendFontSize: 14,
          },
        ]}
        width={screenWidth - 32}
        height={220}
        chartConfig={{
          color: () => "#000",
        }}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="15"
        absolute
      />

      {/* Botões de Ação */}
      <View style={styles.botoesContainer}>
        <TouchableOpacity style={[styles.botaoAcao, { backgroundColor: tema.linkColor }]} onPress={() => router.push("/MovimentacaoEntrada")}>
          <Text style={styles.botaoTexto}>➕ Entrada</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.botaoAcao, { backgroundColor: tema.linkColor }]} onPress={() => router.push("/MovimentacaoSaida")}>
          <Text style={styles.botaoTexto}>➖ Saída</Text>
        </TouchableOpacity>
      </View>

      {/* Modal Grupo */}
      <Modal visible={modalGrupoVisivel} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitulo}>Selecionar Grupo</Text>
              <TouchableOpacity onPress={() => setModalGrupoVisivel(false)}>
                <Text style={styles.fecharBotao}>✖</Text>
              </TouchableOpacity>
            </View>
            {grupos.map((grupo) => (
              <Pressable key={grupo.chave} onPress={() => { setGrupoSelecionado(grupo); setModalGrupoVisivel(false); }} style={styles.modalItem}>
                <Text>{grupo.nome}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>

      {/* Modal Data */}
      <Modal visible={modalDataVisivel} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitulo}>Selecionar Mês</Text>
              <TouchableOpacity onPress={() => setModalDataVisivel(false)}>
                <Text style={styles.fecharBotao}>✖</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.mesSelector}>
              <TouchableOpacity style={styles.mesBotao} onPress={() => mudarMes(-1)}>
                <Text style={styles.mesBotaoTexto}>◀</Text>
              </TouchableOpacity>
              <Text style={styles.mesAtual}>{formatarMes(dataAtual)}</Text>
              <TouchableOpacity style={styles.mesBotao} onPress={() => mudarMes(1)}>
                <Text style={styles.mesBotaoTexto}>▶</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  filtrosRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  filtroBotao: { padding: 10, borderRadius: 8, borderWidth: 1, borderColor: "#ccc" },
  filtroTexto: { fontSize: 14, fontWeight: "500" },
  cardTotais: { padding: 20, borderRadius: 16, backgroundColor: "#f2f2f2", alignItems: "center", marginBottom: 20 },
  valorTotal: { fontSize: 16 },
  valorSaldo: { fontSize: 28, fontWeight: "bold" },
  totaisBox: { flexDirection: "row", justifyContent: "space-between", width: "100%", marginTop: 10 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 8, textAlign: "center" },
  botoesContainer: { flexDirection: "row", justifyContent: "space-around", marginTop: 20 },
  botaoAcao: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 24 },
  botaoTexto: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  modalContainer: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" },
  modalBox: { width: "85%", backgroundColor: "#fff", borderRadius: 12, padding: 24 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  modalTitulo: { fontSize: 18, fontWeight: "bold" },
  fecharBotao: { fontSize: 20, fontWeight: "bold" },
  modalItem: { paddingVertical: 10, borderBottomWidth: 1, borderColor: "#ddd" },
  mesSelector: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 10 },
  mesBotao: { paddingHorizontal: 20, paddingVertical: 10 },
  mesBotaoTexto: { fontSize: 24 },
  mesAtual: { fontSize: 18, fontWeight: "bold", marginHorizontal: 10 },
});
