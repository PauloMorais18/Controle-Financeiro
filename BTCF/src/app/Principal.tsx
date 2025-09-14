import React, { useState, useEffect, useCallback } from "react";
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
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useFocusEffect } from "expo-router";
import { useTheme } from "./ThemeContext";
import { PieChart } from "react-native-chart-kit";
import { Feather } from "@expo/vector-icons";

const screenWidth = Dimensions.get("window").width;

// Interface para os dados do PieChart
interface PieChartDataEntry {
  name: string;
  population: number; // campo usado pelo chart-kit para o valor
  color: string;
  legendFontColor?: string;
  legendFontSize?: number;
}

export default function Principal() {
  const router = useRouter();
  const { tema } = useTheme();

  const [dataAtual, setDataAtual] = useState(new Date());
  const [modalGrupoVisivel, setModalGrupoVisivel] = useState(false);
  const [modalDataVisivel, setModalDataVisivel] = useState(false);
  const [grupos, setGrupos] = useState<any[]>([]);
  const [grupoSelecionado, setGrupoSelecionado] = useState<any>(null);
  const [totais, setTotais] = useState({ entradas: 0, saidas: 0 });
  const [showValues, setShowValues] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);

  // Largura/altura do gráfico + paddingLeft dinâmico para centralizar o círculo
  const CHART_WIDTH = screenWidth - 64;
  const CHART_HEIGHT = 220;
  const CHART_PADDING_LEFT = Math.max(0, (CHART_WIDTH - CHART_HEIGHT) / 2); // centro em (height/2 + paddingLeft)

  // Formatação monetária
  const formatCurrency = useCallback(
    (value: number) => {
      if (typeof value !== "number" || isNaN(value)) return "R$ --,--";
      if (!showValues) return "R$ *****";
      return `R$ ${value.toFixed(2).replace(".", ",")}`;
    },
    [showValues]
  );

  // Buscar grupos do usuário
  const fetchGrupos = useCallback(async (ip: string, userId: number) => {
    setNetworkError(null);
    try {
      const response = await fetch(`${ip}/grupo/usuario/${userId}`);
      if (!response.ok) throw new Error(`Erro ao buscar grupos: ${response.statusText || response.status}`);
      const data = await response.json();
      setGrupos(data);
      const grupoSalvo = await AsyncStorage.getItem("grupoSelecionado");
      const grupoAtual = grupoSalvo ? data.find((g: any) => g.chave === parseInt(grupoSalvo)) : null;
      setGrupoSelecionado(grupoAtual || data[0] || null);
    } catch (error: any) {
      console.error("Erro em fetchGrupos:", error);
      setNetworkError(`Não foi possível conectar ao servidor. Verifique o IP e a conexão. Detalhes: ${error.message}`);
      Alert.alert("Erro de Conexão", `Não foi possível carregar os grupos. Verifique se o servidor está rodando e o IP está correto. Detalhes: ${error.message}`);
    }
  }, []);

  // Carregar totais de entradas/saídas
  const carregarTotais = useCallback(async () => {
    if (!grupoSelecionado?.chave || !dataAtual) {
      setTotais({ entradas: 0, saidas: 0 });
      return;
    }

    setIsLoading(true);
    setNetworkError(null);
    try {
      const ip = await AsyncStorage.getItem("ipServidor");
      if (!ip) {
        setNetworkError("IP do servidor não configurado. Por favor, configure-o nas configurações.");
        Alert.alert("Erro de Configuração", "IP do servidor não configurado. Por favor, configure-o nas configurações.");
        return;
      }

      const anoMes = dataAtual.toISOString().slice(0, 7);
      const url = `${ip}/grafico/gastos/${grupoSelecionado.chave}/${anoMes}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`Erro ao buscar totais: ${res.statusText || res.status}`);

      const data = await res.json();

      let entradas = 0, saidas = 0;
      for (const item of data) {
        const valor = Number(item.total);
        if (item.tipo === "entrada") entradas += valor;
        if (item.tipo === "saida") saidas += valor;
      }
      setTotais({ entradas, saidas });
    } catch (err: any) {
      console.error("Erro ao carregar totais:", err);
      setNetworkError(`Não foi possível carregar os totais. Verifique o IP e a conexão. Detalhes: ${err.message}`);
      Alert.alert("Erro de Conexão", `Não foi possível carregar os totais. Verifique se o servidor está rodando e o IP está correto. Detalhes: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [grupoSelecionado, dataAtual]);

  // Carregamento inicial
  useFocusEffect(
    useCallback(() => {
      async function loadInitialData() {
        setIsLoading(true);
        setNetworkError(null);
        try {
          const [email, ip] = await Promise.all([
            AsyncStorage.getItem("usuarioEmail"),
            AsyncStorage.getItem("ipServidor"),
          ]);
          if (!email || !ip) {
            Alert.alert("Erro", "Dados de autenticação ausentes. Por favor, faça login novamente.");
            router.replace("/login");
            return;
          }

          const usuarioRes = await fetch(`${ip}/usuario/por-email/${email}`);
          if (!usuarioRes.ok) throw new Error("Usuário não encontrado.");
          const usuario = await usuarioRes.json();

          await fetchGrupos(ip, usuario.chave);
        } catch (err: any) {
          console.error("Erro em loadInitialData:", err);
          setNetworkError(`Erro ao iniciar o aplicativo. Verifique o IP e a conexão. Detalhes: ${err.message}`);
          Alert.alert("Erro de Inicialização", `Não foi possível carregar os dados iniciais. Verifique se o servidor está rodando e o IP está correto. Detalhes: ${err.message}`);
        } finally {
          setIsLoading(false);
        }
      }
      loadInitialData();
    }, [fetchGrupos, router])
  );

  // Recarregar quando grupo/mês mudarem
  useEffect(() => {
    if (grupoSelecionado) carregarTotais();
  }, [grupoSelecionado, dataAtual, carregarTotais]);

  // Auto-refresh a cada 60s
  useEffect(() => {
    const intervalo = setInterval(() => {
      if (grupoSelecionado) carregarTotais();
    }, 60000);
    return () => clearInterval(intervalo);
  }, [grupoSelecionado, carregarTotais]);

  // Utilidades de data
  function formatarMes(data: Date) {
    return data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  }
  function mudarMes(direcao: number) {
    const nova = new Date(dataAtual);
    nova.setMonth(nova.getMonth() + direcao);
    setDataAtual(nova);
  }

  // Métricas
  const saldo = totais.entradas - totais.saidas;
  const totalGeral = totais.entradas + totais.saidas;

  // Percentuais (dinâmicos; somam 100 quando total > 0)
  const percEntr = totalGeral > 0 ? Math.round((totais.entradas / totalGeral) * 100) : 0;
  const percSaida = totalGeral > 0 ? 100 - percEntr : 0;

  // Dados do gráfico (sem % no name; legenda nativa desativada)
  const pieChartData: PieChartDataEntry[] = [
    { name: "Entradas", population: totais.entradas, color: "green", legendFontColor: tema.textColor, legendFontSize: 14 },
    { name: "Saídas",   population: totais.saidas,   color: "red",   legendFontColor: tema.textColor, legendFontSize: 14 },
  ];

  // Configuração do gráfico
  const chartConfig = {
    backgroundColor: tema.sectionBoxBackground,
    backgroundGradientFrom: tema.sectionBoxBackground,
    backgroundGradientTo: tema.sectionBoxBackground,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    labelColor: (_opacity = 1) => tema.textColor,
    propsForLabels: { fill: tema.textColor },
    propsForBackgroundLines: { strokeDasharray: "", stroke: tema.inputBorderColor },
    fillShadowGradient: tema.linkColor,
    fillShadowGradientOpacity: 0.5,
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: tema.backgroundColor }]}>
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={tema.linkColor} />
          <Text style={[styles.loadingText, { color: tema.textColor }]}>Carregando dados...</Text>
        </View>
      )}

      {networkError && (
        <View style={[styles.errorContainer, { backgroundColor: tema.sectionBoxBackground }]}>
          <Text style={[styles.errorText, { color: "red" }]}>{networkError}</Text>
          <Text style={[styles.errorHint, { color: tema.textColor }]}>
            Verifique se o seu servidor backend está rodando e se o IP configurado no aplicativo está correto.
            Para emuladores Android, o IP geralmente é http://10.0.2.2:3000. Para iOS, http://localhost:3000.
          </Text>
        </View>
      )}

      <Text style={[styles.title, { color: tema.textColor }]}>Principal</Text>

      {/* Filtros */}
      <View style={styles.filtrosRow}>
        <TouchableOpacity
          onPress={() => setModalGrupoVisivel(true)}
          style={[styles.filtroBotao, { borderColor: tema.inputBorderColor }]}
        >
          <Text style={[styles.filtroTexto, { color: tema.textColor }]}>
            👥 {grupoSelecionado?.nome || "Grupo"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setModalDataVisivel(true)}
          style={[styles.filtroBotao, { borderColor: tema.inputBorderColor }]}
        >
          <Text style={[styles.filtroTexto, { color: tema.textColor }]}>
            📅 {formatarMes(dataAtual)}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={carregarTotais}
          style={[
            styles.filtroBotao,
            { backgroundColor: tema.buttonBackground, borderColor: tema.buttonBackground },
          ]}
        >
          <Text style={[styles.filtroTexto, { color: tema.buttonTextColor }]}>🔄 Atualizar</Text>
        </TouchableOpacity>
      </View>

      {/* Resumo Financeiro */}
      <View style={[styles.cardTotais, { backgroundColor: tema.sectionBoxBackground }]}>
        <View style={styles.saldoHeader}>
          <Text style={[styles.valorTotal, { color: tema.textColor }]}>Saldo Total</Text>
          <TouchableOpacity onPress={() => setShowValues(!showValues)} style={styles.toggleVisibilityButton}>
            {showValues ? (
              <Feather name="eye" size={24} color={tema.textColor} />
            ) : (
              <Feather name="eye-off" size={24} color={tema.textColor} />
            )}
          </TouchableOpacity>
        </View>
        <Text style={[styles.valorSaldo, { color: tema.textColor }]}>{formatCurrency(saldo)}</Text>
        <View style={styles.totaisBox}>
          <Text style={{ color: "green" }}>Entradas: {formatCurrency(totais.entradas)}</Text>
          <Text style={{ color: "red" }}>Saídas: {formatCurrency(totais.saidas)}</Text>
        </View>
      </View>

      {/* Resumo Gráfico */}
      <Text style={[styles.sectionTitle, { color: tema.textColor }]}>Resumo Gráfico</Text>
      <View style={[styles.chartContainer, { backgroundColor: tema.sectionBoxBackground }]}>
        {totalGeral > 0 ? (
          <>
            <PieChart
              data={pieChartData}
              width={CHART_WIDTH}
              height={CHART_HEIGHT}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft={`${CHART_PADDING_LEFT}`} // centralização real do círculo
              absolute={false}
              hasLegend={false}
              style={styles.pie}
            />
            {/* Legenda customizada com percentuais dinâmicos (centralizada) */}
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "green" }]} />
                <Text style={[styles.legendText, { color: tema.textColor }]}>
                  Entradas {percEntr}%
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "red" }]} />
                <Text style={[styles.legendText, { color: tema.textColor }]}>
                  Saídas {percSaida}%
                </Text>
              </View>
            </View>
          </>
        ) : (
          <Text style={[styles.noDataText, { color: tema.textColor }]}>
            Nenhum dado de transação para este período.
          </Text>
        )}
      </View>

      {/* Botões de Ação */}
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

      {/* Modal: Seleção de Grupo */}
      <Modal visible={modalGrupoVisivel} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={[styles.modalBox, { backgroundColor: tema.sectionBoxBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitulo, { color: tema.textColor }]}>Selecionar Grupo</Text>
              <TouchableOpacity onPress={() => setModalGrupoVisivel(false)}>
                <Text style={[styles.fecharBotao, { color: tema.textColor }]}>✖</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              {grupos.map((grupo) => (
                <Pressable
                  key={grupo.chave}
                  onPress={async () => {
                    setGrupoSelecionado(grupo);
                    await AsyncStorage.setItem("grupoSelecionado", String(grupo.chave));
                    setModalGrupoVisivel(false);
                  }}
                  style={[styles.modalItem, { borderBottomColor: tema.inputBorderColor }]}
                >
                  <Text style={{ color: tema.textColor }}>{grupo.nome}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal: Seleção de Data */}
      <Modal visible={modalDataVisivel} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={[styles.modalBox, { backgroundColor: tema.sectionBoxBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitulo, { color: tema.textColor }]}>Selecionar Mês</Text>
              <TouchableOpacity onPress={() => setModalDataVisivel(false)}>
                <Text style={[styles.fecharBotao, { color: tema.textColor }]}>✖</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.mesSelector}>
              <TouchableOpacity style={styles.mesBotao} onPress={() => mudarMes(-1)}>
                <Text style={[styles.mesBotaoTexto, { color: tema.textColor }]}>◀</Text>
              </TouchableOpacity>
              <Text style={[styles.mesAtual, { color: tema.textColor }]}>{formatarMes(dataAtual)}</Text>
              <TouchableOpacity style={styles.mesBotao} onPress={() => mudarMes(1)}>
                <Text style={[styles.mesBotaoTexto, { color: tema.textColor }]}>▶</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={() => setModalDataVisivel(false)}
              style={[styles.confirmButton, { backgroundColor: tema.linkColor }]}
            >
              <Text style={styles.confirmButtonText}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  loadingText: { marginTop: 10, fontSize: 16 },
  errorContainer: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "red",
  },
  errorText: { fontSize: 16, fontWeight: "bold", marginBottom: 5 },
  errorHint: { fontSize: 14 },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
  filtrosRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16, gap: 8 },
  filtroBotao: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  filtroTexto: { fontSize: 14, fontWeight: "500", textAlign: "center" },
  cardTotais: {
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  saldoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 10,
  },
  valorTotal: { fontSize: 16, flex: 1 },
  valorSaldo: { fontSize: 28, fontWeight: "bold", marginBottom: 10 },
  totaisBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    marginTop: 20,
    textAlign: "center",
  },
  chartContainer: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  pie: {
    alignSelf: "center",
  },
  legendRow: {
    marginTop: 10,
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 14,
    fontWeight: "500",
  },
  noDataText: { textAlign: "center", paddingVertical: 20, fontSize: 16 },
  botoesContainer: { flexDirection: "row", justifyContent: "space-around", marginTop: 20 },
  botaoAcao: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 24 },
  botaoTexto: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: "85%",
    borderRadius: 12,
    padding: 24,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 },
  modalTitulo: { fontSize: 20, fontWeight: "bold" },
  fecharBotao: { fontSize: 22, fontWeight: "bold" },
  modalItem: { paddingVertical: 12, borderBottomWidth: 1 },
  mesSelector: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  mesBotao: { paddingHorizontal: 20, paddingVertical: 10 },
  mesBotaoTexto: { fontSize: 24 },
  mesAtual: { fontSize: 18, fontWeight: "bold", marginHorizontal: 10 },
  toggleVisibilityButton: { padding: 5 },
  confirmButton: { paddingVertical: 12, borderRadius: 8, alignItems: "center", marginTop: 10 },
  confirmButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
