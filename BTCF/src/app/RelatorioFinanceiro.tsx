import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { PieChart, BarChart } from "react-native-chart-kit";
import { Dimensions } from "react-native";
import { useTheme } from "./ThemeContext"; // Importa o hook useTheme

const screenWidth = Dimensions.get("window").width;

export default function RelatorioFinanceiro() {
  const { tema } = useTheme(); // Acessa o tema atual
  const totalEntradas = 3200.0;
  const totalSaidas = 2450.0;
  const saldo = totalEntradas - totalSaidas;

  const dadosPizza = [
    { name: "Alimentacao", population: 900, color: "#4caf50", legendFontColor: tema.textColor, legendFontSize: 12 },
    { name: "Transporte", population: 600, color: "#ff9800", legendFontColor: tema.textColor, legendFontSize: 12 },
    { name: "Lazer", population: 450, color: "#03a9f4", legendFontColor: tema.textColor, legendFontSize: 12 },
    { name: "Outros", population: 500, color: "#9c27b0", legendFontColor: tema.textColor, legendFontSize: 12 },
  ];

  const dadosBarra = {
    labels: ["Jan", "Fev", "Mar", "Abr"],
    datasets: [
      {
        data: [800, 1200, 600, 900],
        color: () => "#4caf50",
        label: "Entradas",
      },
      {
        data: [500, 950, 450, 550],
        color: () => "#f44336",
        label: "Saídas",
      },
    ],
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: tema.backgroundColor }]}>
      <Text style={[styles.titulo, { color: tema.textColor }]}>Relatório Financeiro</Text>

      <View style={styles.resumoBox}>
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
      <PieChart
        data={dadosPizza}
        width={screenWidth * 0.95}
        height={220}
        chartConfig={{
          color: () => tema.textColor,
          labelColor: () => tema.textColor,
        }}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="20"
        absolute
      />

      <Text style={[styles.subtitulo, { color: tema.textColor }]}>Entradas vs Saídas por Mês</Text>
      <BarChart
        data={dadosBarra}
        width={screenWidth * 0.95}
        height={220}
        yAxisLabel="R$ "
        yAxisSuffix=""
        chartConfig={{
          backgroundGradientFrom: tema.sectionBoxBackground,
          backgroundGradientTo: tema.sectionBoxBackground,
          decimalPlaces: 2,
          color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
          labelColor: (opacity = 1) => tema.textColor,
          propsForHorizontalLabels: {
            fill: tema.textColor, // "R$" dinâmico com base no tema
          },
        }}
        verticalLabelRotation={30}
        fromZero
        showBarTops
      />

      <TouchableOpacity
        style={[styles.botao, { backgroundColor: tema.linkColor }]}
        onPress={() => alert("Função de envio de e-mail em desenvolvimento")}
      >
        <Text style={[styles.botaoTexto, { color: tema.inputBackground }]}>Enviar por E-mail</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

export const screenOptions = {
  title: "Relatório Financeiro",
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingBottom: 100,
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
});