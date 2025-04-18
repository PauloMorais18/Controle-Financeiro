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

const screenWidth = Dimensions.get("window").width;

export default function RelatorioFinanceiro() {
  const totalEntradas = 3200.0;
  const totalSaidas = 2450.0;
  const saldo = totalEntradas - totalSaidas;

  const dadosPizza = [
    { name: "Alimentacao", population: 900, color: "#4caf50", legendFontColor: "#000", legendFontSize: 12 },
    { name: "Transporte", population: 600, color: "#ff9800", legendFontColor: "#000", legendFontSize: 12 },
    { name: "Lazer", population: 450, color: "#03a9f4", legendFontColor: "#000", legendFontSize: 12 },
    { name: "Outros", population: 500, color: "#9c27b0", legendFontColor: "#000", legendFontSize: 12 },
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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>Relatório Financeiro</Text>

      <View style={styles.resumoBox}>
        <Text style={styles.label}>Total de Entradas: <Text style={styles.entrada}>R$ {totalEntradas.toFixed(2)}</Text></Text>
        <Text style={styles.label}>Total de Saídas: <Text style={styles.saida}>R$ {totalSaidas.toFixed(2)}</Text></Text>
        <Text style={styles.label}>Saldo Final: <Text style={[styles.saldo, { color: saldo >= 0 ? '#4caf50' : '#f44336' }]}>R$ {saldo.toFixed(2)}</Text></Text>
      </View>

      <Text style={styles.subtitulo}>Distribuição de Despesas</Text>
      <PieChart
        data={dadosPizza}
        width={screenWidth * 0.95}
        height={220}
        chartConfig={{
          color: () => `#000`,
          labelColor: () => "#000",
        }}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="20"
        absolute
      />

      <Text style={styles.subtitulo}>Entradas vs Saídas por Mês</Text>
      <BarChart
        data={dadosBarra}
        width={screenWidth * 0.95}
        height={220}
        yAxisLabel="R$ "
        yAxisSuffix=""
        chartConfig={{
            backgroundGradientFrom: "#fff",
            backgroundGradientTo: "#fff",
            decimalPlaces: 2,
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
        }}
        verticalLabelRotation={30}
        fromZero
        showBarTops
      />


      <TouchableOpacity style={styles.botao} onPress={() => alert("Função de envio de e-mail em desenvolvimento")}> 
        <Text style={styles.botaoTexto}>Enviar por E-mail</Text>
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
    backgroundColor: "#fff",
  },
  titulo: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#333",
    textAlign: "center",
  },
  subtitulo: {
    fontSize: 18,
    fontWeight: "bold",
    marginVertical: 12,
    color: "#333",
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
    backgroundColor: "#1976D2",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  botaoTexto: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
