import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Animated,
} from "react-native";
import { PieChart } from "react-native-chart-kit";
import { useRouter } from "expo-router";
import { useTheme } from "./ThemeContext"; // Mantém apenas o useTheme aqui!

const screenWidth = Dimensions.get("window").width;

export default function Principal() {
  const router = useRouter();
  const { tema, temaEscuro } = useTheme();
  const [showActions, setShowActions] = useState(false);
  const [showValue, setShowValue] = useState(false);

  const chartData = [
    { name: "Alimentação", population: 33.3, color: "#4caf50", legendFontColor: tema.textColor, legendFontSize: 12 },
    { name: "Educação", population: 26.7, color: "#7e57c2", legendFontColor: tema.textColor, legendFontSize: 12 },
    { name: "Lazer", population: 20.0, color: "#29b6f6", legendFontColor: tema.textColor, legendFontSize: 12 },
    { name: "Transporte", population: 13.3, color: "#039be5", legendFontColor: tema.textColor, legendFontSize: 12 },
    { name: "Moradia", population: 6.7, color: "#f44336", legendFontColor: tema.textColor, legendFontSize: 12 },
  ];

  return (
    <View style={[styles.container, { backgroundColor: tema.backgroundColor }]}>
      
      {/* Cabeçalho */}
      <View style={[styles.header, { backgroundColor: temaEscuro ? "#222222" : tema.linkColor }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.push("/Perfil")}>
            <Text style={[styles.menu, { color: "#FFFFFF" }]}>👤</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: "#FFFFFF" }]}>Nome, Usuário</Text>
        </View>
        <TouchableOpacity onPress={() => setShowValue(!showValue)}>
          <View style={styles.logo}>
            <Text style={[styles.logoIcon, { color: "#FFFFFF" }]}>💲</Text>
            <Text style={[styles.logoText, { color: "#FFFFFF" }]}>
              {showValue ? "R$ 3.000,00" : "XXXXXX"}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Gráfico */}
      <PieChart
        data={chartData}
        width={screenWidth * 0.95}
        height={220}
        chartConfig={{
          color: () => tema.textColor,
          labelColor: () => tema.textColor,
        }}
        accessor={"population"}
        backgroundColor={"transparent"}
        paddingLeft={"20"}
        center={[5, 0]}
        absolute
      />

      {/* Lista */}
      <View style={styles.list}>
        {Array.from({ length: 4 }).map((_, index) => (
          <View key={index} style={styles.listItem}>
            <View style={[styles.bullet, { backgroundColor: tema.textColor }]} />
            <View style={[styles.line, { backgroundColor: tema.itemColor }]} />
          </View>
        ))}
      </View>

      {/* Botões de ação */}
      {showActions && (
        <Animated.View style={[styles.actionButtons, { opacity: 1, transform: [{ translateY: -10 }] }]}>
          <TouchableOpacity
            style={[styles.subButton, { backgroundColor: tema.linkColor, marginRight: 10 }]}
            onPress={() => Alert.alert("Entrada", "Adicionar entrada")}
          >
            <Text style={[styles.subText, { color: tema.inputBackground }]}>➕ Entrada</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.subButton, { backgroundColor: tema.linkColor }]}
            onPress={() => Alert.alert("Saída", "Adicionar saída")}
          >
            <Text style={[styles.subText, { color: tema.inputBackground }]}>➖ Saída</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Botão principal */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: temaEscuro ? "#fff" : tema.linkColor }]}
        onPress={() => setShowActions((prev) => !prev)}
      >
        <Text style={[styles.fabText, { color: "#111" }]}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

export const drawerLabel = "📊 Dashboard";

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  menu: {
    fontSize: 28,
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  logo: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoIcon: {
    fontSize: 22,
    marginRight: 6,
  },
  logoText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  list: {
    marginTop: 20,
    paddingHorizontal: 24,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 12,
  },
  bullet: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 14,
  },
  line: {
    height: 2,
    flex: 1,
  },
  fab: {
    position: "absolute",
    bottom: 30,
    alignSelf: "center",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  fabText: {
    fontSize: 32,
    fontWeight: "bold",
    marginTop: -5,
  },
  actionButtons: {
    position: "absolute",
    bottom: 100,
    flexDirection: "row",
    alignSelf: "center",
    alignItems: "center",
  },
  subButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
    marginVertical: 5,
  },
  subText: {
    fontSize: 16,
    fontWeight: "bold",
  },
});
