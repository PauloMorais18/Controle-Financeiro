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
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useFocusEffect } from "expo-router";
import { useTheme } from "./ThemeContext";
import { PieChart } from "react-native-chart-kit";

// Importa ícones de olho aberto e fechado do @expo/vector-icons
import { Feather } from '@expo/vector-icons'; // Certifique-se de ter esta biblioteca instalada

const screenWidth = Dimensions.get("window").width;

// Interface para os dados do PieChart, conforme esperado pelo react-native-chart-kit
interface PieChartDataEntry {
  name: string;
  population: number; // 'population' é o campo que react-native-chart-kit usa para o valor
  color: string;
  legendFontColor?: string; // Tornar opcional, pois a legenda built-in será personalizada via 'name'
  legendFontSize?: number; // Tornar opcional
}

export default function Principal() {
  const router = useRouter();
  const { tema } = useTheme(); // Use useTheme diretamente para acessar o tema

  const [dataAtual, setDataAtual] = useState(new Date());
  const [modalGrupoVisivel, setModalGrupoVisivel] = useState(false);
  const [modalDataVisivel, setModalDataVisivel] = useState(false);
  const [grupos, setGrupos] = useState<any[]>([]);
  const [grupoSelecionado, setGrupoSelecionado] = useState<any>(null);
  const [totais, setTotais] = useState({ entradas: 0, saidas: 0 });
  const [showValues, setShowValues] = useState(true); // Novo estado para controlar a visibilidade dos valores

  // Função para formatar valores monetários (com ou sem asteriscos)
  const formatCurrency = useCallback((value: number) => {
    if (!showValues) {
      return "R$ *****"; // Retorna asteriscos se os valores estiverem escondidos
    }
    return `R$ ${value.toFixed(2).replace('.', ',')}`; // Formata normalmente
  }, [showValues]); // Depende de showValues

  // carregarTotais agora é definida antes de ser usada nos useEffects
  const carregarTotais = useCallback(async () => {
    try {
      const ip = await AsyncStorage.getItem("ipServidor");
      if (!ip || !grupoSelecionado?.chave) return;

      const anoMes = dataAtual.toISOString().slice(0, 7);
      const url = `${ip}/grafico/gastos/${grupoSelecionado.chave}/${anoMes}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error("Erro ao buscar totais.");

      const data = await res.json();

      let entradas = 0, saidas = 0;
      for (const item of data) {
        const valor = Number(item.total);
        if (item.tipo === "entrada") entradas += valor;
        if (item.tipo === "saida") saidas += valor;
      }

      setTotais({ entradas, saidas });
    } catch (err: any) {
      Alert.alert("Erro ao carregar totais", err.message);
    }
  }, [grupoSelecionado, dataAtual]); // Dependências para useCallback

  useFocusEffect(
    useCallback(() => {
      // carregarGruposESelecionar agora também carrega os totais após selecionar o grupo
      async function loadInitialData() {
        try {
          const [email, ip] = await Promise.all([
            AsyncStorage.getItem("usuarioEmail"),
            AsyncStorage.getItem("ipServidor"),
          ]);
          if (!email || !ip) throw new Error("Dados de autenticação ausentes.");

          const usuarioRes = await fetch(`${ip}/usuario/por-email/${email}`);
          if (!usuarioRes.ok) throw Error("Usuário não encontrado.");
          const usuario = await usuarioRes.json();

          const gruposRes = await fetch(`${ip}/grupo/usuario/${usuario.chave}`);
          if (!gruposRes.ok) throw Error("Erro ao buscar grupos.");
          const gruposData = await gruposRes.json();

          setGrupos(gruposData);
          const grupoSalvo = await AsyncStorage.getItem("grupoSelecionado");
          const grupoAtual = grupoSalvo ? gruposData.find((g: any) => g.chave === parseInt(grupoSalvo)) : null;
          
          // Define o grupo selecionado e, se for um novo grupo, carrega os totais
          if (grupoAtual || gruposData[0]) {
            const selectedGroup = grupoAtual || gruposData[0];
            setGrupoSelecionado(selectedGroup);
            // Chama carregarTotais explicitamente aqui para o carregamento inicial
            // pois o useEffect abaixo só reagiria a mudanças subsequentes
            if (selectedGroup) {
                // Passa o grupo selecionado e a data atual para a função carregarTotais
                // para garantir que ela tenha os valores mais recentes
                const anoMes = dataAtual.toISOString().slice(0, 7);
                const url = `${ip}/grafico/gastos/${selectedGroup.chave}/${anoMes}`;
                const res = await fetch(url);
                if (!res.ok) throw Error("Erro ao buscar totais iniciais.");
                const data = await res.json();
                let entradas = 0, saidas = 0;
                for (const item of data) {
                    const valor = Number(item.total);
                    if (item.tipo === "entrada") entradas += valor;
                    if (item.tipo === "saida") saidas += valor;
                }
                setTotais({ entradas, saidas });
            }
          } else {
              setGrupoSelecionado(null);
          }

        } catch (err: any) {
          Alert.alert("Erro", err.message);
        }
      }
      loadInitialData();
    }, [dataAtual]) // Adicionado dataAtual como dependência para loadInitialData
  );

  // Carrega totais quando o grupo ou data mudam (para mudanças subsequentes)
  useEffect(() => {
    if (grupoSelecionado) {
      carregarTotais();
    }
  }, [grupoSelecionado, dataAtual, carregarTotais]); // Adicionado carregarTotais como dependência

  // Intervalo para recarregar totais (a cada 60 segundos)
  useEffect(() => {
    const intervalo = setInterval(() => {
      if (grupoSelecionado) carregarTotais();
    }, 60000);
    return () => clearInterval(intervalo);
  }, [grupoSelecionado, carregarTotais]);

  function formatarMes(data: Date) {
    return data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  }

  function mudarMes(direcao: number) {
    const nova = new Date(dataAtual);
    nova.setMonth(nova.getMonth() + direcao);
    setDataAtual(nova);
  }

  const saldo = totais.entradas - totais.saidas;
  const status = saldo >= 0 ? "Positivo" : "Negativo";

  // Calcula o total geral para as porcentagens
  const totalGeral = totais.entradas + totais.saidas;

  // Dados para o PieChart.
  // A propriedade 'name' será usada para a legenda built-in.
  // Ela conterá apenas a porcentagem.
  const pieChartData: PieChartDataEntry[] = [
    {
      name: `${totalGeral > 0 ? (totais.entradas / totalGeral * 100).toFixed(0) : 0}%`, // Apenas porcentagem para a legenda
      population: totais.entradas,
      color: "green",
      legendFontColor: tema.textColor,
      legendFontSize: 14
    },
    {
      name: `${totalGeral > 0 ? (totais.saidas / totalGeral * 100).toFixed(0) : 0}%`, // Apenas porcentagem para a legenda
      population: totais.saidas,
      color: "red",
      legendFontColor: tema.textColor,
      legendFontSize: 14
    },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: tema.backgroundColor }]}>
      <View style={styles.filtrosRow}>
        <TouchableOpacity onPress={() => setModalGrupoVisivel(true)} style={styles.filtroBotao}>
          <Text style={[styles.filtroTexto, { color: tema.textColor }]}>
            👥 {grupoSelecionado?.nome || "Grupo"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setModalDataVisivel(true)} style={styles.filtroBotao}>
          <Text style={[styles.filtroTexto, { color: tema.textColor }]}>
            📅 {formatarMes(dataAtual)}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={carregarTotais} style={[styles.filtroBotao, { backgroundColor: "#e0e0e0" }]}>
          <Text style={[styles.filtroTexto, { color: tema.textColor }]}>🔄 Atualizar</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.cardTotais, { backgroundColor: tema.sectionBoxBackground }]}>
        <View style={styles.saldoHeader}>
          <Text style={[styles.valorTotal, { color: tema.textColor }]}>Saldo Total</Text>
          {/* Botão para esconder/mostrar valores com ícones */}
          <TouchableOpacity onPress={() => setShowValues(!showValues)} style={styles.toggleVisibilityButton}>
            {showValues ? (
              <Feather name="eye" size={24} color={tema.textColor} />
            ) : (
              <Feather name="eye-off" size={24} color={tema.textColor} />
            )}
          </TouchableOpacity>
        </View>
        <Text style={[styles.valorSaldo, { color: tema.textColor }]}>
          {formatCurrency(saldo)} ({status})
        </Text>
        <View style={styles.totaisBox}>
          <Text style={{ color: "green" }}>Entradas: {formatCurrency(totais.entradas)}</Text>
          <Text style={{ color: "red" }}>Saídas: {formatCurrency(totais.saidas)}</Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: tema.textColor }]}>Resumo Gráfico</Text>
      <PieChart
        data={pieChartData} // Usa os dados tipados
        width={screenWidth - 32}
        height={220}
        chartConfig={{
          backgroundColor: tema.sectionBoxBackground,
          backgroundGradientFrom: tema.sectionBoxBackground,
          backgroundGradientTo: tema.sectionBoxBackground,
          color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`, // Cor padrão para labels do gráfico
          labelColor: (opacity = 1) => tema.textColor, // Cor dos labels da legenda
          decimalPlaces: 2, // opcional, para formatar valores
          propsForLabels: {
            fill: tema.textColor, // Cor do texto dos labels na pizza (não usado diretamente com absolute=false)
          },
        }}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="15"
        absolute={false} // Definido como false para não desenhar rótulos nas fatias
      />

      {/* --- LEGENDA built-in --- */}
      {/* A legenda built-in é controlada pelas propriedades nos itens de pieChartData.
          A imagem que você enviou mostra a legenda built-in com "67% Entradas" e "33% Saídas".
          Isso é o que estamos configurando no 'name' de pieChartData.
      */}
      {/* Não há necessidade de uma legenda customizada se a built-in já atende */}
      {/* <View style={styles.customLegendContainer}>
        {pieChartData.map((item, index) => {
          const percentage = totalGeral > 0 ? (item.population / totalGeral * 100).toFixed(0) : 0;
          return (
            <View key={index} style={styles.customLegendItem}>
              <View style={[styles.legendColorBox, { backgroundColor: item.color }]} />
              <Text style={[styles.legendText, { color: tema.textColor }]}>
                {percentage}%
              </Text>
            </View>
          );
        })}
      </View> */}
      {/* --- FIM LEGENDA built-in --- */}

      <View style={styles.botoesContainer}>
        <TouchableOpacity style={[styles.botaoAcao, { backgroundColor: tema.linkColor }]} onPress={() => router.push("/MovimentacaoEntrada")}>
          <Text style={styles.botaoTexto}>➕ Entrada</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.botaoAcao, { backgroundColor: tema.linkColor }]} onPress={() => router.push("/MovimentacaoSaida")}>
          <Text style={styles.botaoTexto}>➖ Saída</Text>
        </TouchableOpacity>
      </View>

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
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  filtrosRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  filtroBotao: { padding: 10, borderRadius: 8, borderWidth: 1, borderColor: "#ccc" },
  filtroTexto: { fontSize: 14, fontWeight: "500" },
  cardTotais: { padding: 20, borderRadius: 16, alignItems: "center", marginBottom: 20, elevation: 3 },
  saldoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
  },
  valorTotal: { fontSize: 16 },
  valorSaldo: { fontSize: 28, fontWeight: "bold" },
  totaisBox: { flexDirection: "row", justifyContent: "space-between", width: "100%", marginTop: 10 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 8, textAlign: "center" },
  botoesContainer: { flexDirection: "row", justifyContent: "space-around", marginTop: 20 },
  botaoAcao: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 24 },
  botaoTexto: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  modalContainer: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" },
  modalBox: { width: "85%", borderRadius: 12, padding: 24, elevation: 5 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  modalTitulo: { fontSize: 18, fontWeight: "bold" },
  fecharBotao: { fontSize: 20, fontWeight: "bold" },
  modalItem: { paddingVertical: 10, borderBottomWidth: 1 },
  mesSelector: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 10 },
  mesBotao: { paddingHorizontal: 20, paddingVertical: 10 },
  mesBotaoTexto: { fontSize: 24 },
  mesAtual: { fontSize: 18, fontWeight: "bold", marginHorizontal: 10 },
  toggleVisibilityButton: {
    padding: 5,
  },
  // Estilos para a legenda customizada
  customLegendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    flexWrap: 'wrap',
  },
  customLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
    marginBottom: 10,
  },
  legendColorBox: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
  },
});
