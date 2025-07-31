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
  Alert, // Usar Alert para mensagens simples, como no seu Principal.tsx
  ActivityIndicator, // Para indicar carregamento
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useFocusEffect } from "expo-router";
import { useTheme } from "./ThemeContext"; // Certifique-se de que o caminho para ThemeContext está correto
import { PieChart, BarChart } from "react-native-chart-kit"; // Importa BarChart também
import { Feather } from '@expo/vector-icons'; // Ícones de olho aberto e fechado

const screenWidth = Dimensions.get("window").width;

// Interface para os dados do PieChart e BarChart
interface ChartDataEntry {
  name: string;
  population: number; // Para PieChart (valor)
  value: number; // Para BarChart (valor)
  color: string;
  legendFontColor?: string;
  legendFontSize?: number;
}

export default function RelatorioFinanceiro() {
  const router = useRouter();
  const { tema } = useTheme();

  const [dataAtual, setDataAtual] = useState(new Date());
  const [modalGrupoVisivel, setModalGrupoVisivel] = useState(false);
  const [modalDataVisivel, setModalDataVisivel] = useState(false);
  const [grupos, setGrupos] = useState<any[]>([]);
  const [grupoSelecionado, setGrupoSelecionado] = useState<any>(null);
  const [totais, setTotais] = useState({ entradas: 0, saidas: 0 });
  const [despesasPorCategoria, setDespesasPorCategoria] = useState<ChartDataEntry[]>([]);
  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [showValues, setShowValues] = useState(true);
  const [isLoading, setIsLoading] = useState(false); // Novo estado para carregamento
  const [networkError, setNetworkError] = useState<string | null>(null); // Novo estado para erros de rede

  // Função para formatar valores monetários (com ou sem asteriscos)
  const formatCurrency = useCallback((value: number) => {
    if (typeof value !== 'number' || isNaN(value)) { // Adicionado: Verifica se o valor é um número válido
      return "R$ --,--"; // Retorna um placeholder se o valor não for um número
    }
    if (!showValues) {
      return "R$ *****";
    }
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
  }, [showValues]);

  // Função para buscar grupos do usuário
  const fetchGrupos = useCallback(async (ip: string, userId: number) => {
    setNetworkError(null); // Limpa erros de rede anteriores
    try {
      const response = await fetch(`${ip}/grupo/usuario/${userId}`);
      if (!response.ok) {
        throw new Error(`Erro ao buscar grupos: ${response.statusText || response.status}`);
      }
      const data = await response.json();
      setGrupos(data);
      // Tenta carregar o grupo salvo ou seleciona o primeiro
      const grupoSalvo = await AsyncStorage.getItem("grupoSelecionado");
      const grupoAtual = grupoSalvo ? data.find((g: any) => g.chave === parseInt(grupoSalvo)) : null;
      if (grupoAtual || data[0]) {
        setGrupoSelecionado(grupoAtual || data[0]);
      } else {
        setGrupoSelecionado(null);
      }
    } catch (error: any) {
      console.error("Erro em fetchGrupos:", error);
      setNetworkError(`Não foi possível conectar ao servidor. Verifique o IP e a conexão. Detalhes: ${error.message}`);
      Alert.alert("Erro de Conexão", `Não foi possível carregar os grupos. Verifique se o servidor está rodando e o IP está correto. Detalhes: ${error.message}`);
    }
  }, []);

  // Função para buscar dados do relatório
  const fetchReportData = useCallback(async () => {
    if (!grupoSelecionado?.chave || !dataAtual) {
      // Limpa os dados se não houver grupo ou data selecionada
      setTotais({ entradas: 0, saidas: 0 });
      setDespesasPorCategoria([]);
      setTransacoes([]);
      return;
    }

    setIsLoading(true);
    setNetworkError(null); // Limpa erros de rede anteriores
    try {
      const ip = await AsyncStorage.getItem("ipServidor");
      if (!ip) {
        setNetworkError("IP do servidor não configurado. Por favor, configure-o nas configurações.");
        Alert.alert("Erro de Configuração", "IP do servidor não configurado. Por favor, configure-o nas configurações.");
        return;
      }

      const anoMes = dataAtual.toISOString().slice(0, 7);
      const grupoId = grupoSelecionado.chave;

      console.log(`Buscando dados para Grupo: ${grupoId}, Mês/Ano: ${anoMes}`);

      // 1. Buscar totais de gastos (entrada/saída)
      const gastosRes = await fetch(`${ip}/grafico/gastos/${grupoId}/${anoMes}`);
      if (!gastosRes.ok) throw new Error(`Erro ao buscar totais de gastos: ${gastosRes.statusText || gastosRes.status}`);
      const gastosData = await gastosRes.json();
      console.log("Dados de gastos (entradas/saídas):", gastosData);

      let entradas = 0, saidas = 0;
      gastosData.forEach((item: any) => {
        const valor = Number(item.total);
        if (item.tipo === "entrada") entradas += valor;
        if (item.tipo === "saida") saidas += valor;
      });
      setTotais({ entradas, saidas });

      // 2. Buscar despesas por categoria
      const despesasCategoriaRes = await fetch(`${ip}/grafico/despesas-por-categoria/${grupoId}/${anoMes}`);
      if (!despesasCategoriaRes.ok) throw new Error(`Erro ao buscar despesas por categoria: ${despesasCategoriaRes.statusText || despesasCategoriaRes.status}`);
      const despesasCategoriaData = await despesasCategoriaRes.json();
      console.log("Dados de despesas por categoria:", despesasCategoriaData);
      
      const formattedDespesas = despesasCategoriaData.map((item: any, index: number) => ({
        name: item.categoria || 'Outros', // Usar 'Outros' se a categoria for nula/indefinida
        population: parseFloat(item.total), // 'population' para PieChart
        color: COLORS[index % COLORS.length],
        legendFontColor: tema.textColor,
        legendFontSize: 14,
      }));
      setDespesasPorCategoria(formattedDespesas);

      // 3. Buscar histórico de transações
      // Assumimos que o backend AGORA retorna a categoria na rota /transacoes
      const transacoesRes = await fetch(`${ip}/transacoes/${grupoId}/${anoMes}`);
      if (!transacoesRes.ok) throw new Error(`Erro ao buscar transações: ${transacoesRes.statusText || transacoesRes.status}`);
      const transacoesData = await transacoesRes.json();
      console.log("Dados de transações (histórico):", transacoesData);
      setTransacoes(transacoesData);

    } catch (error: any) {
      console.error("Erro em fetchReportData:", error);
      setNetworkError(`Não foi possível carregar os dados do relatório. Verifique o IP e a conexão. Detalhes: ${error.message}`);
      Alert.alert("Erro de Conexão", `Não foi possível carregar os dados do relatório. Verifique se o servidor está rodando e o IP está correto. Detalhes: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [grupoSelecionado, dataAtual, tema.textColor]);

  // Efeito para carregar grupos e dados iniciais ao focar na tela
  useFocusEffect(
    useCallback(() => {
      async function loadInitialData() {
        setIsLoading(true);
        setNetworkError(null); // Limpa erros de rede anteriores
        try {
          const [email, ip] = await Promise.all([
            AsyncStorage.getItem("usuarioEmail"),
            AsyncStorage.getItem("ipServidor"),
          ]);
          if (!email || !ip) {
            Alert.alert("Erro", "Dados de autenticação ausentes. Por favor, faça login novamente.");
            router.replace('/login'); // Redireciona para o login se não houver dados
            return;
          }

          const usuarioRes = await fetch(`${ip}/usuario/por-email/${email}`);
          if (!usuarioRes.ok) throw new Error("Usuário não encontrado.");
          const usuario = await usuarioRes.json();
          
          // Chama fetchGrupos para carregar e selecionar o grupo
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

  // Efeito para buscar dados do relatório sempre que o grupo ou data mudar
  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Cores para os gráficos (mesmas do seu componente anterior)
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF19A6', '#19FFD4', '#FFD700'];

  function formatarMes(data: Date) {
    return data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  }

  function mudarMes(direcao: number) {
    const nova = new Date(dataAtual);
    nova.setMonth(nova.getMonth() + direcao);
    setDataAtual(nova);
  }

  const saldo = totais.entradas - totais.saidas;
  // Removido o status "Positivo" / "Negativo" do saldo
  // const statusSaldo = saldo >= 0 ? "Positivo" : "Negativo";

  // Dados para o BarChart (Receitas vs. Despesas)
  const barChartData = {
    labels: ["Receitas", "Despesas"],
    datasets: [
      {
        data: [totais.entradas, totais.saidas],
        colors: [
          (opacity = 1) => `rgba(0, 128, 0, ${opacity})`, // Verde para Receitas
          (opacity = 1) => `rgba(255, 0, 0, ${opacity})`, // Vermelho para Despesas
        ],
      },
    ],
  };

  // Configuração do gráfico para react-native-chart-kit
  const chartConfig = {
    backgroundColor: tema.sectionBoxBackground,
    backgroundGradientFrom: tema.sectionBoxBackground,
    backgroundGradientTo: tema.sectionBoxBackground,
    decimalPlaces: 2, // opcional, para formatar valores
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`, // Cor padrão para labels do gráfico
    labelColor: (opacity = 1) => tema.textColor, // Cor dos labels da legenda
    propsForLabels: {
      fill: tema.textColor, // Cor do texto dos labels na pizza (não usado diretamente com absolute=false)
    },
    propsForBackgroundLines: {
      strokeDasharray: "", // Linhas sólidas
      stroke: tema.inputBorderColor, // Cor das linhas de fundo
    },
    fillShadowGradient: tema.linkColor, // Cor do gradiente de preenchimento
    fillShadowGradientOpacity: 0.5, // Opacidade do gradiente
    formatYLabel: (yValue: string) => formatCurrency(parseFloat(yValue)), // Movido para cá e tipado
    // yAxisSuffix: "R$", // Removido daqui, pois será passado diretamente para o BarChart
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
          <Text style={[styles.errorText, { color: 'red' }]}>{networkError}</Text>
          <Text style={[styles.errorHint, { color: tema.textColor }]}>
            Verifique se o seu servidor backend está rodando e se o IP configurado no aplicativo está correto.
            Para emuladores Android, o IP geralmente é `http://10.0.2.2:3000`. Para iOS, `http://localhost:3000`.
          </Text>
        </View>
      )}

      <Text style={[styles.title, { color: tema.textColor }]}>Relatório Financeiro</Text>

      {/* Seção de Filtros */}
      <View style={styles.filtrosRow}>
        <TouchableOpacity onPress={() => setModalGrupoVisivel(true)} style={[styles.filtroBotao, { borderColor: tema.inputBorderColor }]}>
          <Text style={[styles.filtroTexto, { color: tema.textColor }]}>
            👥 {grupoSelecionado?.nome || "Grupo"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setModalDataVisivel(true)} style={[styles.filtroBotao, { borderColor: tema.inputBorderColor }]}>
          <Text style={[styles.filtroTexto, { color: tema.textColor }]}>
            📅 {formatarMes(dataAtual)}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={fetchReportData} style={[styles.filtroBotao, { backgroundColor: tema.buttonBackground, borderColor: tema.buttonBackground }]}>
          <Text style={[styles.filtroTexto, { color: tema.buttonTextColor }]}>🔄 Atualizar</Text>
        </TouchableOpacity>
      </View>

      {/* Seção de Resumo Financeiro */}
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
        <Text style={[styles.valorSaldo, { color: tema.textColor }]}>
          {formatCurrency(saldo)}
        </Text>
        <View style={styles.totaisBox}>
          <Text style={{ color: "green" }}>Entradas: {formatCurrency(totais.entradas)}</Text>
          <Text style={{ color: "red" }}>Saídas: {formatCurrency(totais.saidas)}</Text>
        </View>
      </View>

      {/* Seção de Gráficos */}
      <Text style={[styles.sectionTitle, { color: tema.textColor }]}>Gráficos do Período</Text>
      <View style={[styles.chartContainer, { backgroundColor: tema.sectionBoxBackground }]}>
        <Text style={[styles.chartTitle, { color: tema.textColor }]}>Despesas por Categoria</Text>
        {despesasPorCategoria.length > 0 && despesasPorCategoria.some(d => d.population > 0) ? (
          <PieChart
            data={despesasPorCategoria}
            width={screenWidth - 64} // Ajuste para padding do container
            height={220}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute={false} // Para usar a legenda built-in com porcentagens
          />
        ) : (
          <Text style={[styles.noDataText, { color: tema.textColor }]}>Nenhuma despesa por categoria para este período.</Text>
        )}
      </View>

      <View style={[styles.chartContainer, { backgroundColor: tema.sectionBoxBackground }]}>
        <Text style={[styles.chartTitle, { color: tema.textColor }]}>Receitas vs. Despesas</Text>
        {(totais.entradas > 0 || totais.saidas > 0) ? (
          <BarChart
            data={barChartData}
            width={screenWidth - 64} // Ajuste para padding do container
            height={220}
            yAxisLabel="R$"
            yAxisSuffix="R$" // Adicionado diretamente aqui
            chartConfig={chartConfig} // chartConfig já inclui formatYLabel
            verticalLabelRotation={0}
            fromZero={true} // Inicia o eixo Y em zero
          />
        ) : (
          <Text style={[styles.noDataText, { color: tema.textColor }]}>Nenhum dado de receita ou despesa para este período.</Text>
        )}
      </View>

      {/* Seção de Histórico de Transações */}
      <Text style={[styles.sectionTitle, { color: tema.textColor }]}>Histórico de Transações</Text>
      <View style={[styles.transactionsContainer, { backgroundColor: tema.sectionBoxBackground }]}>
        {transacoes.length > 0 ? (
          <ScrollView style={styles.transactionsScroll}>
            <View style={[styles.transactionHeader, { borderBottomColor: tema.inputBorderColor }]}>
              <Text style={[styles.headerText, { color: tema.textColor, flex: 0.8 }]}>Tipo</Text>
              <Text style={[styles.headerText, { color: tema.textColor, flex: 1.5 }]}>Categoria</Text> {/* Ajustado flex */}
              <Text style={[styles.headerText, { color: tema.textColor, flex: 1, textAlign: 'right' }]}>Valor</Text>
              <Text style={[styles.headerText, { color: tema.textColor, flex: 0.8, textAlign: 'right' }]}>Data</Text>
            </View>
            {transacoes.map((transacao, index) => (
              <View
                key={index}
                style={[
                  styles.transactionItem,
                  { borderBottomColor: tema.inputBorderColor },
                  transacao.tipo === 'entrada' ? styles.transactionEntrada : styles.transactionSaida
                ]}
              >
                <Text style={[styles.transactionType, { color: tema.textColor }]}>
                  {transacao.tipo === 'entrada' ? 'Receita' : 'Despesa'}
                </Text>
                {/* Assumindo que a propriedade 'categoria' está disponível no objeto transacao */}
                <Text style={[styles.transactionCategory, { color: tema.textColor }]}>
                  {transacao.categoria || 'N/A'} {/* Exibe categoria ou 'N/A' */}
                </Text>
                <Text style={[styles.transactionValue, { color: tema.textColor, fontWeight: 'bold' }]}>
                  {formatCurrency(transacao.valor)}
                </Text>
                <Text style={[styles.transactionDate, { color: tema.textSecondaryColor }]}>
                  {new Date(transacao.datacad).toLocaleDateString('pt-BR')}
                </Text>
              </View>
            ))}
          </ScrollView>
        ) : (
          <Text style={[styles.noDataText, { color: tema.textColor }]}>Nenhuma transação encontrada para este período.</Text>
        )}
      </View>

      {/* Modal de Seleção de Grupo */}
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
                    await AsyncStorage.setItem("grupoSelecionado", String(grupo.chave)); // Salva o grupo selecionado
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

      {/* Modal de Seleção de Data */}
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
  container: {
    flex: 1,
    padding: 16,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'red',
  },
  errorText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  errorHint: {
    fontSize: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  filtrosRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 8, // Espaçamento entre os botões
  },
  filtroBotao: {
    flex: 1, // Para que os botões ocupem o espaço igualmente
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtroTexto: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: 'center',
  },
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
  },
  valorTotal: {
    fontSize: 16,
    flex: 1, // Para ocupar o espaço restante
  },
  valorSaldo: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 10,
  },
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
    alignItems: 'center', // Centraliza o gráfico
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  noDataText: {
    textAlign: 'center',
    paddingVertical: 20,
    fontSize: 16,
  },
  transactionsContainer: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  transactionsScroll: {
    maxHeight: 300, // Limita a altura para que a lista seja rolável
  },
  transactionHeader: { // Novo estilo para o cabeçalho da tabela de transações
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    marginBottom: 5,
  },
  headerText: { // Estilo para o texto do cabeçalho
    fontWeight: 'bold',
    fontSize: 14,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#eee', // Cor padrão da borda
  },
  transactionEntrada: {
    backgroundColor: '#e6ffe6', // Verde claro para entradas
  },
  transactionSaida: {
    backgroundColor: '#ffe6e6', // Vermelho claro para saídas
  },
  transactionType: {
    fontSize: 14,
    fontWeight: 'bold',
    flex: 0.8,
  },
  transactionCategory: { // Novo estilo para a categoria
    fontSize: 14,
    flex: 1.5, // Ajustado o flex para dar mais espaço à categoria
  },
  transactionDescription: { // Removido, pois a descrição não será mais exibida na tabela
    // fontSize: 14, // Comentado/Removido
    // flex: 1.5, // Comentado/Removido
  },
  transactionValue: {
    fontSize: 14,
    flex: 1,
    textAlign: 'right',
  },
  transactionDate: {
    fontSize: 12,
    flex: 0.8,
    textAlign: 'right',
  },
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
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  modalTitulo: {
    fontSize: 20,
    fontWeight: "bold",
  },
  fecharBotao: {
    fontSize: 22,
    fontWeight: "bold",
  },
  modalItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  mesSelector: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  mesBotao: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  mesBotaoTexto: {
    fontSize: 24,
  },
  mesAtual: {
    fontSize: 18,
    fontWeight: "bold",
    marginHorizontal: 10,
  },
  toggleVisibilityButton: {
    padding: 5,
  },
  confirmButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
