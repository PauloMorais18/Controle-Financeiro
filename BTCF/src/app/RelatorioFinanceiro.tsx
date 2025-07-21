import React, { useState, useEffect, createContext, useContext, ReactNode, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Alert,
  Modal, // Importado Modal
  Pressable, // Importado Pressable
} from "react-native";
import { PieChart, BarChart } from "react-native-chart-kit"; // Manter PieChart para a estrutura de dados, mas não será renderizado
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from '@expo/vector-icons'; // Importa ícones de olho aberto e fechado
import { Picker } from "@react-native-picker/picker"; // Importa Picker para os filtros

const screenWidth = Dimensions.get("window").width;

// --- Definições de Tipo para TypeScript ---
interface Theme {
  backgroundColor: string;
  textColor: string;
  sectionBoxBackground: string;
  linkColor: string;
  inputBackground: string;
  chartTextColor: string;
  chartGridColor: string;
  inputBorderColor: string; // Adicionado inputBorderColor aqui
  saida: string; // Adicionado 'saida' aqui para consistência nos estilos
  entrada: string; // Adicionado 'entrada' aqui para consistência nos estilos
  saldoPositivo: string; // Adicionado para o saldo positivo
  saldoNegativo: string; // Adicionado para o saldo negativo
}

interface ThemeContextType {
  tema: Theme;
  toggleTheme: () => void;
  isDarkMode: boolean;
}

interface PieDataRN {
  name: string;
  population: number;
  color: string;
  legendFontColor: string;
  legendFontSize: number;
}

interface BarDataRN {
  labels: string[];
  datasets: {
    data: number[];
    color: (opacity: number) => string;
    label: string;
  }[];
}

interface TotalsApiResponse {
  tipo: 'entrada' | 'saida';
  total: string;
}

interface CategoryExpensesApiResponse {
  categoria: string;
  total: string;
}

interface Categoria { // Interface para categorias customizadas
  chave: number;
  nome_categoria: string;
  tipo_transacao: 'entrada' | 'saida';
  chaveusuario: number;
}

// --- ThemeContext.js (Adaptado para React Native) ---
// Mantido o ThemeContext para que outros componentes que o usem não quebrem.
// No entanto, o toggleTheme e isDarkMode não serão usados nesta tela.
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // isDarkMode e toggleTheme são mantidos aqui, mas não serão expostos/usados no RelatorioFinanceiro
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false); 

  const tema: Theme = {
    backgroundColor: isDarkMode ? '#1a202c' : '#f7fafc',
    textColor: isDarkMode ? '#f7fafc' : '#2d3748',
    sectionBoxBackground: isDarkMode ? '#2d3748' : '#ffffff',
    linkColor: isDarkMode ? '#63b3ed' : '#4299e1',
    inputBackground: isDarkMode ? '#4a5568' : '#edf2f7',
    chartTextColor: isDarkMode ? '#f7fafc' : '#2d3748',
    chartGridColor: isDarkMode ? '#4a5568' : '#e2e8f0',
    inputBorderColor: isDarkMode ? '#4a5568' : '#cbd5e0', // Adicionado inputBorderColor aqui
    saida: '#f44336', // Definido cor para saida
    entrada: '#4caf50', // Definido cor para entrada
    saldoPositivo: '#4caf50', // Definido cor para saldo positivo
    saldoNegativo: '#f44336', // Definido cor para saldo negativo
  };

  const toggleTheme = () => {
    setIsDarkMode(prevMode => !prevMode);
  };

  return (
    <ThemeContext.Provider value={{ tema, toggleTheme, isDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// --- RelatorioFinanceiro.tsx (Componente Principal) ---

const PIE_COLORS = ['#4caf50', '#ff9800', '#03a9f4', '#9c27b0', '#f44336', '#00bcd4', '#ffeb3b'];

const RelatorioFinanceiro: React.FC = () => {
  // Acessa apenas o tema, sem toggleTheme ou isDarkMode, pois não serão usados nesta tela
  const { tema } = useTheme(); 

  const [dataAtual, setDataAtual] = useState(new Date()); // Estado para o filtro de data
  const [modalDataVisivel, setModalDataVisivel] = useState(false); // Estado para o modal de data
  const [grupos, setGrupos] = useState<any[]>([]);
  const [grupoSelecionado, setGrupoSelecionado] = useState<any>(null); // Estado para o filtro de grupo
  const [modalGrupoVisivel, setModalGrupoVisivel] = useState(false); // Estado para o modal de grupo

  const [totalEntradas, setTotalEntradas] = useState<number>(0);
  const [totalSaidas, setTotalSaidas] = useState<number>(0);
  const [saldo, setSaldo] = useState<number>(0);
  const [dadosPizza, setDadosPizza] = useState<PieDataRN[]>([]); // Mantido para o mini-relatório de despesas
  const [dadosBarra, setDadosBarra] = useState<BarDataRN>({ labels: [], datasets: [] });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [ipServidor, setIpServidor] = useState<string | null>(null);
  const [usuarioId, setUsuarioId] = useState<number | null>(null);

  const [showValues, setShowValues] = useState(true);
  const [categoriasSaida, setCategoriasSaida] = useState<Categoria[]>([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>("Todas");

  // Função para formatar valores monetários (com ou sem asteriscos)
  const formatCurrency = useCallback((value: any): string => {
    let numericValue: number;

    if (typeof value === 'string') {
      numericValue = parseFloat(value.replace(',', '.'));
    } else if (typeof value === 'number') {
      numericValue = value;
    } else {
      numericValue = 0;
    }

    if (isNaN(numericValue) || !Number.isFinite(numericValue)) {
      numericValue = 0;
    }

    if (!showValues) {
      return "R$ *****";
    }

    return `R$ ${numericValue.toFixed(2).replace('.', ',')}`;
  }, [showValues]);

  // Função para carregar o IP do servidor e o grupo/usuário/categorias do AsyncStorage
  const loadConfig = useCallback(async () => {
    try {
      const storedIp = await AsyncStorage.getItem("ipServidor");
      if (storedIp) {
        setIpServidor(storedIp);
      } else {
        Alert.alert("Erro", "IP do servidor não configurado. Por favor, configure o IP na tela de login/configurações.");
        setIsLoading(false);
        return;
      }

      const storedUsuarioId = await AsyncStorage.getItem("usuarioId");
      let currentUsuarioId: number | null = null;
      if (storedUsuarioId) {
        currentUsuarioId = parseInt(storedUsuarioId);
        setUsuarioId(currentUsuarioId);
      } else {
        const userEmail = await AsyncStorage.getItem("usuarioEmail");
        if (userEmail && storedIp) {
          const userRes = await fetch(`${storedIp}/usuario/por-email/${userEmail}`);
          if (userRes.ok) {
            const userData = await userRes.json();
            currentUsuarioId = userData.chave;
            setUsuarioId(currentUsuarioId);
            await AsyncStorage.setItem("usuarioId", String(userData.chave));
          } else {
            Alert.alert("Erro", "Não foi possível obter o ID do usuário. Faça login novamente.");
          }
        } else {
          Alert.alert("Erro", "Email do usuário ou IP do servidor ausente.");
          setIsLoading(false);
          return;
        }
      }

      // Carregar grupos
      const gruposRes = await fetch(`${storedIp}/grupo/usuario/${currentUsuarioId}`);
      if (!gruposRes.ok) throw new Error("Erro ao buscar grupos.");
      const gruposData = await gruposRes.json();

      if (gruposData.length > 0) {
        setGrupos(gruposData); // Corrigido setGroups para setGrupos
        const grupoSalvo = await AsyncStorage.getItem("grupoSelecionado");
        const grupoAtual = grupoSalvo ? gruposData.find((g: any) => g.chave === parseInt(grupoSalvo)) : null;
        setGrupoSelecionado(grupoAtual || gruposData[0]); // Seleciona o grupo salvo ou o primeiro
      } else {
        setError("Nenhum grupo encontrado para o usuário. Crie um grupo.");
        setIsLoading(false);
        return;
      }

      // Carregar categorias de saída
      const categoriasRes = await fetch(`${storedIp}/categorias/${currentUsuarioId}/saida`);
      if (!categoriasRes.ok) throw new Error("Erro ao buscar categorias.");
      const categoriasData: Categoria[] = await categoriasRes.json();
      setCategoriasSaida([{ chave: 0, nome_categoria: "Todas", tipo_transacao: "saida", chaveusuario: currentUsuarioId || 0 }, ...categoriasData]); // Adiciona "Todas" como opção
      setCategoriaSelecionada("Todas"); // Define "Todas" como padrão

    } catch (err: any) {
      console.error("Erro ao carregar configurações:", err);
      setError(`Erro ao carregar configurações: ${err.message}`);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);


  // Função para buscar dados financeiros do backend
  const fetchFinancialData = useCallback(async () => {
    if (!ipServidor || !grupoSelecionado?.chave || usuarioId === null) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const grupoId = grupoSelecionado.chave;
    const today = new Date(); // Declarado 'today' aqui
    const currentYearMonth = `${dataAtual.getFullYear()}-${(dataAtual.getMonth() + 1).toString().padStart(2, '0')}`;

    try {
      // 1. Buscar totais de entradas e saídas para o mês atual
      const totalsResponse = await fetch(`${ipServidor}/grafico/gastos/${grupoId}/${currentYearMonth}`);
      if (!totalsResponse.ok) {
        throw new Error(`Erro ao buscar totais: ${totalsResponse.statusText}`);
      }
      const totalsData: TotalsApiResponse[] = await totalsResponse.json();

      let currentTotalEntradas = 0;
      let currentTotalSaidas = 0;

      totalsData.forEach(item => {
        const totalValue = parseFloat(String(item.total || '0').replace(',', '.'));
        if (item.tipo === 'entrada') {
          currentTotalEntradas = totalValue;
        } else if (item.tipo === 'saida') {
          currentTotalSaidas = totalValue;
        }
      });

      setTotalEntradas(currentTotalEntradas);
      setTotalSaidas(currentTotalSaidas);
      setSaldo(currentTotalEntradas - currentTotalSaidas);

      // 2. Dados para o Mini Relatório (Despesas por Categoria)
      let despesasPorCategoriaUrl = `${ipServidor}/grafico/despesas-por-categoria/${grupoId}/${currentYearMonth}`;
      if (categoriaSelecionada !== "Todas") {
        despesasPorCategoriaUrl += `?categoria=${encodeURIComponent(categoriaSelecionada)}`;
        // TODO: Você precisará ajustar seu backend para filtrar por categoria se este parâmetro for enviado.
        // Se o backend não suportar, esta linha não terá efeito ou causará erro.
      }

      const despesasPorCategoriaResponse = await fetch(despesasPorCategoriaUrl);
      if (!despesasPorCategoriaResponse.ok) {
        throw new Error(`Erro ao buscar despesas por categoria: ${despesasPorCategoriaResponse.statusText}`);
      }
      const despesasPorCategoriaData: CategoryExpensesApiResponse[] = await despesasPorCategoriaResponse.json();

      // Mapeia para o formato de dados de pizza, embora não seja um PieChart,
      // a estrutura de name/population é útil para a lista.
      const mappedDadosPizza: PieDataRN[] = despesasPorCategoriaData.map((item, index) => ({
        name: item.categoria,
        population: parseFloat(String(item.total || '0').replace(',', '.')), // Garante que total é number
        color: PIE_COLORS[index % PIE_COLORS.length], // Mantém as cores para consistência visual
        legendFontColor: tema.textColor,
        legendFontSize: 12,
      }));
      setDadosPizza(mappedDadosPizza);

      // 3. Dados para o Gráfico de Barras (Entradas vs Saídas por Mês)
      const barChartLabels: string[] = [];
      const barChartEntradas: number[] = [];
      const barChartSaidas: number[] = [];

      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(today.getMonth() - i);
        const monthName = date.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
        const yearMonth = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;

        barChartLabels.push(monthName.charAt(0).toUpperCase() + monthName.slice(1));

        const monthlyResponse = await fetch(`${ipServidor}/grafico/gastos/${grupoId}/${yearMonth}`);
        if (!monthlyResponse.ok) {
          throw new Error(`Erro ao buscar dados mensais para ${yearMonth}: ${monthlyResponse.statusText}`);
        }
        const monthlyData: TotalsApiResponse[] = await monthlyResponse.json();

        let monthlyEntradas = 0;
        let monthlySaidas = 0;

        monthlyData.forEach(item => {
          const totalValue = parseFloat(String(item.total || '0').replace(',', '.'));
          if (item.tipo === 'entrada') {
            monthlyEntradas = totalValue;
          } else if (item.tipo === 'saida') {
            monthlySaidas = totalValue;
          }
        });
        barChartEntradas.push(monthlyEntradas);
        barChartSaidas.push(monthlySaidas);
      }

      setDadosBarra({
        labels: barChartLabels,
        datasets: [
          {
            data: barChartEntradas,
            color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
            label: "Entradas",
          },
          {
            data: barChartSaidas,
            color: (opacity = 1) => `rgba(244, 67, 54, ${opacity})`,
            label: "Saídas",
          },
        ],
      });

    } catch (err: any) {
      console.error("Erro ao buscar dados financeiros:", err);
      setError(`Não foi possível carregar os dados financeiros: ${err.message}. Verifique se o servidor está rodando e o IP está correto.`);
    } finally {
      setIsLoading(false);
    }
  }, [ipServidor, grupoSelecionado, dataAtual, showValues, categoriaSelecionada, usuarioId, tema.textColor]); // Adiciona todas as dependências

  // Dispara a busca de dados quando filtros mudam
  useEffect(() => {
    if (ipServidor && grupoSelecionado && usuarioId !== null) {
      fetchFinancialData();
    }
  }, [ipServidor, grupoSelecionado, usuarioId, categoriaSelecionada, dataAtual, fetchFinancialData]);

  const handleSendEmail = () => {
    Alert.alert("Função em Desenvolvimento", "A função de envio de e-mail está em desenvolvimento.");
  };

  // Funções para filtro de data
  function formatarMes(data: Date) {
    return data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  }

  function mudarMes(direcao: number) {
    const nova = new Date(dataAtual);
    nova.setMonth(nova.getMonth() + direcao);
    setDataAtual(nova);
  }

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: tema.backgroundColor }]}>
        <ActivityIndicator size="large" color={tema.textColor} />
        <Text style={[styles.loadingText, { color: tema.textColor }]}>Carregando dados financeiros...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: tema.backgroundColor }]}>
        <Text style={[styles.errorText, { color: tema.textColor }]}>Erro: {error}</Text>
        <TouchableOpacity
          style={[styles.botao, { backgroundColor: tema.linkColor, marginTop: 20 }]}
          onPress={fetchFinancialData}
        >
          <Text style={[styles.botaoTexto, { color: tema.inputBackground }]}>Tentar Novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: tema.backgroundColor }]}>
      {/* Removido o Botão de alternar tema e a lógica de tema escuro/claro */}
      <View style={styles.headerContainer}>
        <Text style={[styles.titulo, { color: tema.textColor }]}>Relatório Financeiro</Text>
        {/* Botão para esconder/mostrar valores */}
        <TouchableOpacity onPress={() => setShowValues(!showValues)} style={styles.toggleVisibilityButton}>
          {showValues ? (
            <Feather name="eye" size={24} color={tema.textColor} />
          ) : (
            <Feather name="eye-off" size={24} color={tema.textColor} />
          )}
        </TouchableOpacity>
      </View>

      {/* --- FILTROS --- */}
      <View style={styles.filtrosRow}>
        {/* Filtro de Grupo */}
        <TouchableOpacity onPress={() => setModalGrupoVisivel(true)} style={styles.filtroBotao}>
          <Text style={[styles.filtroTexto, { color: tema.textColor }]}>
            👥 {grupoSelecionado?.nome || "Grupo"}
          </Text>
        </TouchableOpacity>
        {/* Filtro de Data */}
        <TouchableOpacity onPress={() => setModalDataVisivel(true)} style={styles.filtroBotao}>
          <Text style={[styles.filtroTexto, { color: tema.textColor }]}>
            📅 {formatarMes(dataAtual)}
          </Text>
        </TouchableOpacity>
        {/* Filtro de Categoria */}
        <View style={[styles.pickerContainer, styles.filtroBotao, { borderColor: tema.inputBorderColor, flex: 1, marginLeft: 10 }]}>
          <Picker
            selectedValue={categoriaSelecionada}
            onValueChange={(itemValue) => setCategoriaSelecionada(itemValue)}
            style={{ color: tema.textColor, height: 30 }} // Altura ajustada para caber no filtroBotao
          >
            {categoriasSaida.map((cat) => (
              <Picker.Item key={cat.chave} label={cat.nome_categoria} value={cat.nome_categoria} />
            ))}
          </Picker>
        </View>
        <TouchableOpacity onPress={fetchFinancialData} style={[styles.filtroBotao, { backgroundColor: "#e0e0e0", marginLeft: 10 }]}>
          <Text style={[styles.filtroTexto, { color: tema.textColor }]}>🔄</Text>
        </TouchableOpacity>
      </View>
      {/* --- FIM FILTROS --- */}

      <Text style={[styles.subtitulo, { color: tema.textColor }]}>Entradas vs Saídas por Mês</Text>
      {dadosBarra.labels.length > 0 ? (
        <BarChart
          data={dadosBarra}
          width={screenWidth * 0.95}
          height={220}
          yAxisLabel="R$ "
          yAxisSuffix=""
          chartConfig={{
            backgroundColor: tema.sectionBoxBackground,
            backgroundGradientFrom: tema.sectionBoxBackground,
            backgroundGradientTo: tema.sectionBoxBackground,
            decimalPlaces: 2,
            color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            labelColor: (opacity = 1) => tema.textColor,
            propsForHorizontalLabels: {
              fill: tema.textColor,
            },
            propsForVerticalLabels: {
              fill: tema.textColor,
            },
            fillShadowGradient: tema.linkColor,
            fillShadowGradientOpacity: 0.5,
            formatYLabel: (value: string) => formatCurrency(parseFloat(value)),
          }}
          verticalLabelRotation={30}
          fromZero
          showBarTops
        />
      ) : (
        <Text style={[styles.noDataText, { color: tema.textColor }]}>Nenhum dado mensal disponível.</Text>
      )}

      {/* --- MINI RELATÓRIO DE DESPESAS POR CATEGORIA (Substitui o PieChart) --- */}
      <Text style={[styles.subtitulo, { color: tema.textColor, marginTop: 20 }]}>Resumo de Despesas por Categoria</Text>
      <View style={[styles.resumoBox, { backgroundColor: tema.sectionBoxBackground }]}>
        {dadosPizza.length > 0 ? (
          dadosPizza.map((item, index) => (
            <View key={index} style={styles.miniReportItem}>
              <Text style={[styles.miniReportCategory, { color: tema.textColor }]}>{item.name}:</Text>
              <Text style={[styles.miniReportValue, { color: tema.saida }]}>{formatCurrency(item.population)}</Text>
            </View>
          ))
        ) : (
          <Text style={[styles.noDataText, { color: tema.textColor }]}>Nenhuma despesa por categoria disponível para o período/filtro.</Text>
        )}
      </View>
      {/* --- FIM MINI RELATÓRIO --- */}

      {/* --- RESUMO GERAL (Movido para o final) --- */}
      <Text style={[styles.subtitulo, { color: tema.textColor, marginTop: 20 }]}>Resumo Geral</Text>
      <View style={[styles.resumoBox, { backgroundColor: tema.sectionBoxBackground }]}>
        <Text style={[styles.label, { color: tema.textColor }]}>
          Total de Entradas: <Text style={styles.entrada}>{formatCurrency(totalEntradas)}</Text>
        </Text>
        <Text style={[styles.label, { color: tema.textColor }]}>
          Total de Saídas: <Text style={styles.saida}>{formatCurrency(totalSaidas)}</Text>
        </Text>
        <Text style={[styles.label, { color: tema.textColor }]}>
          Saldo Final: <Text style={[styles.saldo, { color: saldo >= 0 ? tema.saldoPositivo : tema.saldoNegativo }]}>{formatCurrency(saldo)}</Text>
        </Text>
      </View>
      {/* --- FIM RESUMO GERAL --- */}

      <TouchableOpacity
        style={[styles.botao, { backgroundColor: tema.linkColor }]}
        onPress={handleSendEmail}
      >
        <Text style={[styles.botaoTexto, { color: tema.inputBackground }]}>Enviar por E-mail</Text>
      </TouchableOpacity>

      {/* Modal para Selecionar Grupo */}
      <Modal visible={modalGrupoVisivel} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={[styles.modalBox, { backgroundColor: tema.sectionBoxBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitulo, { color: tema.textColor }]}>Selecionar Grupo</Text>
              <TouchableOpacity onPress={() => setModalGrupoVisivel(false)}>
                <Text style={[styles.fecharBotao, { color: tema.textColor }]}>✖</Text>
              </TouchableOpacity>
            </View>
            {grupos.map((grupo) => (
              <Pressable
                key={grupo.chave}
                onPress={() => {
                  setGrupoSelecionado(grupo);
                  setModalGrupoVisivel(false);
                }}
                style={[styles.modalItem, { borderBottomColor: tema.inputBorderColor }]}
              >
                <Text style={{ color: tema.textColor }}>{grupo.nome}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>

      {/* Modal para Selecionar Mês */}
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
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

export const screenOptions = {
  title: "Relatório Financeiro",
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 100,
  },
  headerContainer: { // Novo estilo para o container do cabeçalho
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16, // Espaçamento entre o cabeçalho e o resumo
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
    color: '#f44336',
  },
  titulo: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
  },
  subtitulo: {
    fontSize: 18,
    fontWeight: "bold",
    marginVertical: 12,
  },
  resumoBox: {
    marginBottom: 20,
    padding: 15,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  label: {
    fontSize: 16,
    marginVertical: 4,
  },
  entrada: {
    color: "#4caf50",
    fontWeight: "bold",
  },
  saida: {
    color: "#f44336",
    fontWeight: "bold",
  },
  saldo: {
    fontWeight: "bold",
  },
  botao: {
    marginTop: 30,
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  botaoTexto: {
    fontWeight: "bold",
    fontSize: 16,
  },
  toggleVisibilityButton: {
    padding: 5,
  },
  noDataText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  filtrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap', // Permite que os itens quebrem a linha em telas menores
  },
  filtroBotao: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    flex: 1, // Permite que os botões ocupem o espaço disponível
    marginHorizontal: 5, // Espaçamento entre os botões
    minWidth: 100, // Garante um tamanho mínimo para o botão
    alignItems: 'center',
  },
  filtroTexto: {
    fontSize: 14,
    fontWeight: '500',
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
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  modalTitulo: {
    fontSize: 18,
    fontWeight: "bold",
  },
  fecharBotao: {
    fontSize: 20,
    fontWeight: "bold",
  },
  modalItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  mesSelector: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
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
  miniReportItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  miniReportCategory: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  miniReportValue: {
    fontSize: 16,
  },
});
