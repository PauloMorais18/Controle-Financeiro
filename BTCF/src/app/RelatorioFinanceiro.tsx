import React, { useState, useEffect, createContext, useContext, ReactNode, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Alert, // Usar Alert para mensagens ao usuário
} from "react-native";
import { PieChart, BarChart } from "react-native-chart-kit";
import AsyncStorage from "@react-native-async-storage/async-storage"; // Importar AsyncStorage

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

// --- ThemeContext.js (Adaptado para React Native) ---
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  const tema: Theme = {
    backgroundColor: isDarkMode ? '#1a202c' : '#f7fafc',
    textColor: isDarkMode ? '#f7fafc' : '#2d3748',
    sectionBoxBackground: isDarkMode ? '#2d3748' : '#ffffff',
    linkColor: isDarkMode ? '#63b3ed' : '#4299e1',
    inputBackground: isDarkMode ? '#4a5568' : '#edf2f7',
    chartTextColor: isDarkMode ? '#f7fafc' : '#2d3748',
    chartGridColor: isDarkMode ? '#4a5568' : '#e2e8f0',
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
  const { tema, toggleTheme, isDarkMode } = useTheme();

  const [totalEntradas, setTotalEntradas] = useState<number>(0);
  const [totalSaidas, setTotalSaidas] = useState<number>(0);
  const [saldo, setSaldo] = useState<number>(0);
  const [dadosPizza, setDadosPizza] = useState<PieDataRN[]>([]);
  const [dadosBarra, setDadosBarra] = useState<BarDataRN>({ labels: [], datasets: [] });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [ipServidor, setIpServidor] = useState<string | null>(null);
  const [grupoSelecionado, setGrupoSelecionado] = useState<any>(null); // Para simular o grupo selecionado

  // Função para carregar o IP do servidor e o grupo selecionado do AsyncStorage
  const loadConfig = useCallback(async () => {
    try {
      const storedIp = await AsyncStorage.getItem("ipServidor");
      if (storedIp) {
        setIpServidor(storedIp);
      } else {
        setError("IP do servidor não configurado. Por favor, configure o IP na tela de login/configurações.");
        setIsLoading(false);
        return;
      }

      // TODO: Em um cenário real, o grupo selecionado viria de um contexto global
      // ou de uma forma de persistência após o login.
      // Por enquanto, vamos simular um grupoId.
      // Se sua tela principal já gerencia isso, você precisaria passar o grupoId como prop
      // ou usar um contexto compartilhado.
      const usuarioEmail = await AsyncStorage.getItem("usuarioEmail");
      if (usuarioEmail && storedIp) {
        const usuarioRes = await fetch(`${storedIp}/usuario/por-email/${usuarioEmail}`);
        if (!usuarioRes.ok) throw new Error("Usuário não encontrado.");
        const usuario = await usuarioRes.json();

        const gruposRes = await fetch(`${storedIp}/grupo/usuario/${usuario.chave}`);
        if (!gruposRes.ok) throw new Error("Erro ao buscar grupos.");
        const gruposData = await gruposRes.json();

        // Seleciona o primeiro grupo como padrão para demonstração
        if (gruposData.length > 0) {
          setGrupoSelecionado(gruposData[0]);
        } else {
          setError("Nenhum grupo encontrado para o usuário. Crie um grupo.");
          setIsLoading(false);
          return;
        }
      } else {
        setError("Email do usuário ou IP do servidor ausente.");
        setIsLoading(false);
        return;
      }

    } catch (err: any) {
      console.error("Erro ao carregar configurações:", err);
      setError(`Erro ao carregar configurações: ${err.message}`);
      setIsLoading(false);
    }
  }, []);

  // Use useFocusEffect para recarregar quando a tela for focada,
  // assim como na sua tela Principal.
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);


  // Função para buscar dados financeiros do backend
  const fetchFinancialData = useCallback(async () => {
    if (!ipServidor || !grupoSelecionado?.chave) {
      // Não tenta buscar se o IP ou grupo não estiverem carregados
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const grupoId = grupoSelecionado.chave; // Usa o grupoId do grupo selecionado
    const today = new Date();
    const currentYearMonth = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;

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
        if (item.tipo === 'entrada') {
          currentTotalEntradas = parseFloat(item.total);
        } else if (item.tipo === 'saida') {
          currentTotalSaidas = parseFloat(item.total);
        }
      });

      setTotalEntradas(currentTotalEntradas);
      setTotalSaidas(currentTotalSaidas);
      setSaldo(currentTotalEntradas - currentTotalSaidas);

      // 2. Dados para o Gráfico de Pizza (Despesas por Categoria)
      // Como seu backend não tem um endpoint para isso, vamos simular.
      // Se você criar o endpoint /grafico/despesas-por-categoria, substitua esta simulação.
      const simulatedDespesasPorCategoria: { categoria: string; valor: number }[] = [
        { categoria: "Alimentação", valor: 1000 },
        { categoria: "Transporte", valor: 700 },
        { categoria: "Lazer", valor: 500 },
        { categoria: "Moradia", valor: 600 },
        { categoria: "Outros", valor: 400 }
      ];

      const mappedDadosPizza: PieDataRN[] = simulatedDespesasPorCategoria.map((item, index) => ({
        name: item.categoria,
        population: item.valor,
        color: PIE_COLORS[index % PIE_COLORS.length],
        legendFontColor: tema.textColor,
        legendFontSize: 12,
      }));
      setDadosPizza(mappedDadosPizza);

      // 3. Dados para o Gráfico de Barras (Entradas vs Saídas por Mês)
      const barChartLabels: string[] = [];
      const barChartEntradas: number[] = [];
      const barChartSaidas: number[] = [];

      for (let i = 5; i >= 0; i--) { // Busca dados dos últimos 6 meses
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
          if (item.tipo === 'entrada') {
            monthlyEntradas = parseFloat(item.total);
          } else if (item.tipo === 'saida') {
            monthlySaidas = parseFloat(item.total);
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
  }, [ipServidor, grupoSelecionado, tema.textColor]); // Adiciona dependências

  // Dispara a busca de dados quando ipServidor ou grupoSelecionado mudam
  useEffect(() => {
    if (ipServidor && grupoSelecionado) {
      fetchFinancialData();
    }
  }, [ipServidor, grupoSelecionado, fetchFinancialData]);

  const handleSendEmail = () => {
    Alert.alert("Função em Desenvolvimento", "A função de envio de e-mail está em desenvolvimento.");
  };

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
          onPress={fetchFinancialData} // Tentar buscar novamente
        >
          <Text style={[styles.botaoTexto, { color: tema.inputBackground }]}>Tentar Novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: tema.backgroundColor }]}>
      {/* Botão de alternar tema */}
      <TouchableOpacity
        onPress={toggleTheme}
        style={[styles.themeToggleButton, { backgroundColor: tema.sectionBoxBackground }]}
      >
        <Text style={{ color: tema.textColor, fontSize: 24 }}>{isDarkMode ? '☀️' : '🌙'}</Text>
      </TouchableOpacity>

      <Text style={[styles.titulo, { color: tema.textColor }]}>Relatório Financeiro</Text>

      <View style={[styles.resumoBox, { backgroundColor: tema.sectionBoxBackground }]}>
        <Text style={[styles.label, { color: tema.textColor }]}>
          Total de Entradas: <Text style={styles.entrada}>R$ {totalEntradas.toFixed(2)}</Text>
        </Text>
        <Text style={[styles.label, { color: tema.textColor }]}>
          Total de Saídas: <Text style={styles.saida}>R$ {totalSaidas.toFixed(2)}</Text>
        </Text>
        <Text style={[styles.label, { color: tema.textColor }]}>
          Saldo Final: <Text style={[styles.saldo, { color: saldo >= 0 ? '#4caf50' : '#f44336' }]}>R$ {saldo.toFixed(2)}</Text>
        </Text>
      </View>

      <Text style={[styles.subtitulo, { color: tema.textColor }]}>Distribuição de Despesas</Text>
      {dadosPizza.length > 0 ? (
        <PieChart
          data={dadosPizza}
          width={screenWidth * 0.95}
          height={220}
          chartConfig={{
            backgroundColor: tema.sectionBoxBackground,
            backgroundGradientFrom: tema.sectionBoxBackground,
            backgroundGradientTo: tema.sectionBoxBackground,
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            labelColor: (opacity = 1) => tema.textColor,
            decimalPlaces: 2,
            propsForLabels: {
              fill: tema.textColor,
            },
          }}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="20"
          absolute
        />
      ) : (
        <Text style={[styles.noDataText, { color: tema.textColor }]}>Nenhum dado de despesa disponível.</Text>
      )}

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
          }}
          verticalLabelRotation={30}
          fromZero
          showBarTops
        />
      ) : (
        <Text style={[styles.noDataText, { color: tema.textColor }]}>Nenhum dado mensal disponível.</Text>
      )}

      <TouchableOpacity
        style={[styles.botao, { backgroundColor: tema.linkColor }]}
        onPress={handleSendEmail}
      >
        <Text style={[styles.botaoTexto, { color: tema.inputBackground }]}>Enviar por E-mail</Text>
      </TouchableOpacity>
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
    marginBottom: 16,
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
  themeToggleButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    padding: 10,
    borderRadius: 25,
    zIndex: 1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  noDataText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  }
});

// Componente App que encapsula o RelatorioFinanceiro com o ThemeProvider
export default function App() {
  return (
    <ThemeProvider>
      <RelatorioFinanceiro />
    </ThemeProvider>
  );
}
