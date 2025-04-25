import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import moment from "moment";
import "moment/locale/pt-br";
import { BarChart } from "react-native-chart-kit";
import { useTheme } from "./ThemeContext"; // Importa o hook useTheme

// Tipos
type Transacao = {
  tipo: "entrada" | "saida";
  valor: number;
};

type TransacoesPorMes = {
  [mesAno: string]: Transacao[];
};

const screenWidth = Dimensions.get("window").width;

export default function Analise() {
  const { tema } = useTheme(); // Acessa o tema atual
  const [mesAtual, setMesAtual] = useState<moment.Moment>(moment());

  const transacoesPorMes: TransacoesPorMes = {
    "2025-04": [
      { tipo: "entrada", valor: 3000 },
      { tipo: "entrada", valor: 2000 },
      { tipo: "saida", valor: 1200 },
      { tipo: "saida", valor: 2000 },
    ],
  };

  const chaveMes: string = mesAtual.format("YYYY-MM");
  const transacoes: Transacao[] = transacoesPorMes[chaveMes] || [];

  const entradas: number = transacoes
    .filter((t) => t.tipo === "entrada")
    .reduce((soma: number, t) => soma + t.valor, 0);

  const saidas: number = transacoes
    .filter((t) => t.tipo === "saida")
    .reduce((soma: number, t) => soma + t.valor, 0);

  const saldo: number = entradas - saidas;

  const statusMes: string =
    saldo > 0
      ? "✅ Você fechou o mês no azul. Parabéns pelo controle financeiro!"
      : saldo < 0
      ? "❌ Você fechou o mês no vermelho. Reveja seus gastos para o próximo mês."
      : "⚠️ Você fechou o mês zerado.";

  const mudarMes = (quantidade: number) => {
    setMesAtual((prev) => moment(prev).add(quantidade, "months"));
  };

  // 📊 Dados fictícios para gráfico de barras por categoria
  const categorias = ["Alimentação", "Transporte", "Moradia", "Lazer"];
  const valoresCategoria = [1200, 800, 2000, 400];

  // 📈 Dados fictícios para comparativo mensal
  const meses = ["Jan", "Fev", "Mar", "Abr"];
  const valoresMensais = [2500, 3000, 1800, 3200];

  return (
    <ScrollView style={[styles.container, { backgroundColor: tema.backgroundColor }]}>
      <Text style={[styles.title, { color: tema.textColor }]}>📊 Análise Financeira</Text>

      <View style={styles.periodSelector}>
        <TouchableOpacity onPress={() => mudarMes(-1)}>
          <Text style={[styles.arrow, { color: tema.textColor }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.periodText, { color: tema.textColor }]}>{mesAtual.format("MMMM [de] YYYY")}</Text>
        <TouchableOpacity onPress={() => mudarMes(1)}>
          <Text style={[styles.arrow, { color: tema.textColor }]}>→</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.summaryBox, { backgroundColor: tema.sectionBoxBackground }]}>
        <Text style={[styles.summaryItem, { color: tema.textColor }]}>Entradas: R$ {entradas.toFixed(2)}</Text>
        <Text style={[styles.summaryItem, { color: tema.textColor }]}>Saídas: R$ {saidas.toFixed(2)}</Text>
        <Text style={[styles.summaryItem, { color: tema.textColor }]}>Saldo: R$ {saldo.toFixed(2)}</Text>
      </View>

      <Text style={[styles.statusMes, { color: tema.textColor }]}>{statusMes}</Text>

      {/* Gráfico de gastos por categoria */}
      <View style={styles.graphBox}>
        <Text style={[styles.graphTitle, { color: tema.textColor }]}>Gastos por categoria</Text>
        <BarChart
          data={{
            labels: categorias,
            datasets: [{ data: valoresCategoria }],
          }}
          width={screenWidth - 40}
          height={220}
          fromZero
          yAxisLabel="R$ "
          yAxisSuffix=""
          showValuesOnTopOfBars
          chartConfig={{
            backgroundGradientFrom: tema.sectionBoxBackground,
            backgroundGradientTo: tema.sectionBoxBackground,
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(25, 118, 210, ${opacity})`,
            labelColor: (opacity = 1) => tema.textColor, // Rótulos dinâmicos com base no tema
            propsForLabels: {
              fontSize: 12,
            },
            fillShadowGradient: "#1976D2",
            fillShadowGradientOpacity: 1,
            barPercentage: 0.6,
            style: {
              borderRadius: 12,
            },
            propsForVerticalLabels: {
              rotation: 0,
            },
            propsForHorizontalLabels: {
              fill: tema.textColor, // "R$" dinâmico com base no tema
            },
          }}
          style={{ borderRadius: 12 }}
        />
      </View>

      {/* Gráfico comparativo mensal */}
      <View style={styles.graphBox}>
        <Text style={[styles.graphTitle, { color: tema.textColor }]}>Comparativo mensal</Text>
        <BarChart
          data={{
            labels: meses,
            datasets: [{ data: valoresMensais }],
          }}
          width={screenWidth - 40}
          height={220}
          fromZero
          yAxisLabel="R$ "
          yAxisSuffix=""
          showValuesOnTopOfBars
          chartConfig={{
            backgroundGradientFrom: tema.sectionBoxBackground,
            backgroundGradientTo: tema.sectionBoxBackground,
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
            labelColor: (opacity = 1) => tema.textColor, // Meses dinâmicos com base no tema
            propsForLabels: {
              fontSize: 12,
            },
            fillShadowGradient: "#4CAF50",
            fillShadowGradientOpacity: 1,
            barPercentage: 0.6,
            style: {
              borderRadius: 12,
            },
            propsForVerticalLabels: {
              rotation: 0,
            },
            propsForHorizontalLabels: {
              fill: tema.textColor, // "R$" dinâmico com base no tema
            },
          }}
          style={{ borderRadius: 12 }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 16,
  },
  periodSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  periodText: {
    fontSize: 18,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  arrow: {
    fontSize: 28,
    paddingHorizontal: 10,
  },
  summaryBox: {
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
  },
  summaryItem: {
    fontSize: 16,
    marginBottom: 6,
  },
  statusMes: {
    fontSize: 16,
    fontStyle: "italic",
    marginBottom: 24,
  },
  graphBox: {
    marginBottom: 30,
  },
  graphTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
  },
});