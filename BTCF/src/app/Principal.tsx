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
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useTheme } from "./ThemeContext";
import { BarChart } from "react-native-chart-kit";

const screenWidth = Dimensions.get("window").width;

export default function Principal() {
  const router = useRouter();
  const { tema } = useTheme();

  const [grupos, setGrupos] = useState<any[]>([]);
  const [grupoSelecionado, setGrupoSelecionado] = useState<any>(null);
  const [dataAtual, setDataAtual] = useState(new Date());
  const [modalGrupoVisivel, setModalGrupoVisivel] = useState(false);
  const [modalDataVisivel, setModalDataVisivel] = useState(false);
  const [totais, setTotais] = useState({ entradas: 0, saidas: 0 });
  const [graficoData, setGraficoData] = useState<number[]>([]);

  useEffect(() => {
    carregarGrupos();
  }, []);

  useEffect(() => {
    if (grupoSelecionado) {
      carregarTotais();
    }
  }, [grupoSelecionado, dataAtual]);

  function formatarMes(data: Date) {
    return data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
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
      if (gruposData.length > 0) setGrupoSelecionado(gruposData[0]);
    } catch (err: any) {
      Alert.alert("Erro", err.message);
    }
  }

  async function carregarTotais() {
    try {
      const ip = await AsyncStorage.getItem("ipServidor");
      const anoMes = dataAtual.toISOString().slice(0, 7);

      const res = await fetch(`${ip}/grafico/gastos/${grupoSelecionado.chave}/${anoMes}`);
      if (!res.ok) throw new Error("Erro ao buscar totais.");
      const data = await res.json();

      let entradas = 0, saidas = 0;
      data.forEach((item: any) => {
        if (item.tipo === "entrada") entradas += Number(item.total);
        else if (item.tipo === "saida") saidas += Number(item.total);
      });

      setTotais({ entradas, saidas });
      setGraficoData([entradas, saidas]);
    } catch (err: any) {
      Alert.alert("Erro ao carregar totais", err.message);
    }
  }

  function mudarMes(direcao: number) {
    const nova = new Date(dataAtual);
    nova.setMonth(nova.getMonth() + direcao);
    setDataAtual(nova);
  }

  const saldo = totais.entradas - totais.saidas;
  const status = saldo >= 0 ? "Positivo" : "Negativo";

  return (
    <ScrollView style={[styles.container, { backgroundColor: tema.backgroundColor }]}>
      {/* Filtros */}
      <View style={styles.filtroContainer}>
        <TouchableOpacity onPress={() => setModalGrupoVisivel(true)} style={styles.filtroBotao}>
          <Text style={{ color: tema.textColor }}>👥 {grupoSelecionado?.nome || "Grupo"}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setModalDataVisivel(true)} style={styles.filtroBotao}>
          <Text style={{ color: tema.textColor }}>📅 {formatarMes(dataAtual)}</Text>
        </TouchableOpacity>
      </View>

      {/* Saldo */}
      <View style={styles.cardTotais}>
        <Text style={[styles.valorTotal, { color: tema.textColor }]}>Saldo Total</Text>
        <Text style={[styles.valorSaldo, { color: tema.textColor }]}>
          R$ {saldo.toFixed(2)} ({status})
        </Text>
        <View style={styles.totaisBox}>
          <Text style={{ color: "green" }}>Entradas: R$ {totais.entradas.toFixed(2)}</Text>
          <Text style={{ color: "red" }}>Saídas: R$ {totais.saidas.toFixed(2)}</Text>
        </View>
      </View>

      {/* Gráfico */}
      <Text style={[styles.sectionTitle, { color: tema.textColor }]}>Resumo Gráfico</Text>
      <BarChart
        data={{
          labels: ["Entradas", "Saídas"],
          datasets: [{ data: graficoData.length ? graficoData : [0, 0] }],
        }}
        width={screenWidth - 32}
        height={220}
        yAxisLabel=""
        yAxisSuffix=" R$"
        chartConfig={{
          backgroundGradientFrom: "#fff",
          backgroundGradientTo: "#fff",
          decimalPlaces: 2,
          color: () => tema.textColor,
          labelColor: () => tema.textColor,
        }}
        style={{ marginVertical: 16, borderRadius: 8 }}
      />


      {/* Botões */}
      <View style={styles.botoesContainer}>
        <TouchableOpacity style={[styles.botaoAcao, { backgroundColor: tema.linkColor }]} onPress={() => router.push("/MovimentacaoEntrada")}>
          <Text style={styles.botaoTexto}>➕ Entrada</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.botaoAcao, { backgroundColor: tema.linkColor }]} onPress={() => router.push("/MovimentacaoSaida")}>
          <Text style={styles.botaoTexto}>➖ Saída</Text>
        </TouchableOpacity>
      </View>

      {/* Modais */}
      <Modal visible={modalGrupoVisivel} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitulo}>Selecionar Grupo</Text>
            {grupos.map((grupo) => (
              <Pressable key={grupo.chave} onPress={() => { setGrupoSelecionado(grupo); setModalGrupoVisivel(false); }} style={styles.modalItem}>
                <Text>{grupo.nome}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>

      <Modal visible={modalDataVisivel} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitulo}>Mês de Referência</Text>
            <View style={styles.dataSelecao}>
              <TouchableOpacity onPress={() => mudarMes(-1)}><Text style={{ fontSize: 24 }}>◀️</Text></TouchableOpacity>
              <Text style={{ fontSize: 18 }}>{formatarMes(dataAtual)}</Text>
              <TouchableOpacity onPress={() => mudarMes(1)}><Text style={{ fontSize: 24 }}>▶️</Text></TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => setModalDataVisivel(false)}><Text style={{ marginTop: 20, color: "blue" }}>Fechar</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  filtroContainer: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  filtroBotao: { padding: 10, borderRadius: 8, borderWidth: 1, borderColor: "#ccc" },
  cardTotais: { padding: 20, borderRadius: 16, backgroundColor: "#f2f2f2", alignItems: "center", marginBottom: 20 },
  valorTotal: { fontSize: 16 },
  valorSaldo: { fontSize: 28, fontWeight: "bold" },
  totaisBox: { flexDirection: "row", justifyContent: "space-between", width: "100%", marginTop: 10 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 8 },
  botoesContainer: { flexDirection: "row", justifyContent: "space-around", marginTop: 20 },
  botaoAcao: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 24 },
  botaoTexto: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  modalContainer: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" },
  modalBox: { width: "80%", backgroundColor: "#fff", borderRadius: 8, padding: 20 },
  modalTitulo: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  modalItem: { paddingVertical: 10, borderBottomWidth: 1, borderColor: "#ddd" },
  dataSelecao: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10 },
});
