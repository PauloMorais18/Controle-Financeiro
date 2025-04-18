import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Animated
} from "react-native";
import { PieChart } from "react-native-chart-kit";
import { useRouter } from "expo-router";
import { DrawerActions } from "@react-navigation/native";
import Index from ".";

const screenWidth = Dimensions.get("window").width;

export default function Principal() {
  const router = useRouter();
  const [showActions, setShowActions] = useState(false);
  const [showValue, setShowValue] = useState(false); // 👈 estado para exibir/ocultar valor

  const chartData = [
    { name: "Alimentação", population: 33.3, color: "#4caf50", legendFontColor: "#000", legendFontSize: 12 },
    { name: "Educação", population: 26.7, color: "#7e57c2", legendFontColor: "#000", legendFontSize: 12 },
    { name: "Lazer", population: 20.0, color: "#29b6f6", legendFontColor: "#000", legendFontSize: 12 },
    { name: "Transporte", population: 13.3, color: "#039be5", legendFontColor: "#000", legendFontSize: 12 },
    { name: "Moradia", population: 6.7, color: "#f44336", legendFontColor: "#000", legendFontSize: 12 },
  ];

  return (
    <View style={styles.container}>
      {/* Cabeçalho azul com menu e título */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
        <TouchableOpacity onPress={() => router.push("/Perfil")}>
          <Text style={styles.menu}>👤</Text>
        </TouchableOpacity>
          <Text style={styles.title}>Nome, Usuario</Text>
        </View>
        <TouchableOpacity onPress={() => setShowValue(!showValue)}>
          <View style={styles.logo}>
            <Text style={styles.logoIcon}>💲</Text>
            <Text style={styles.logoText}>
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
          color: () => `#000`,
          labelColor: () => "#000",
        }}
        accessor={"population"}
        backgroundColor={"transparent"}
        paddingLeft={"20"}
        center={[5, 0]}
        absolute
      />

      {/* Lista */}
      <View style={styles.list}>
        {Array.from({ length: 4 }).map((_, Index) => (
          <View key={Index} style={styles.listItem}>
            <View style={styles.bullet} />
            <View style={styles.line} />
          </View>
        ))}
      </View>

      {/* Botões de ação */}
      {/* Botões expandidos animados */}
      {showActions && (
        <Animated.View style={[styles.actionButtons, { opacity: 1, transform: [{ translateY: -10 }] }]}>
          <TouchableOpacity style={[styles.subButton, { marginRight: 10 }]} onPress={() => Alert.alert("Entrada", "Adicionar entrada")}>
            <Text style={styles.subText}>➕ Entrada</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.subButton} onPress={() => Alert.alert("Saída", "Adicionar saída")}>
            <Text style={styles.subText}>➖ Saída</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Botão principal */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowActions((prev) => !prev)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

export const drawerLabel = "📊 Dashboard";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1976D2",
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  menu: {
    fontSize: 28,
    color: "#fff",
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  logo: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoIcon: {
    fontSize: 22,
    marginRight: 6,
    color: "#0f0",
  },
  logoText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
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
    backgroundColor: "#000",
    marginRight: 14,
  },
  line: {
    height: 2,
    flex: 1,
    backgroundColor: "#333",
  },
  fab: {
    position: "absolute",
    bottom: 30,
    alignSelf: "center",
    backgroundColor: "#000",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  fabText: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "bold",
    marginTop: -2,
  },
  actionButtons: {
    position: "absolute",
    bottom: 100,
    flexDirection: "row",
    alignSelf: "center",
    alignItems: "center",
  },  
  subButton: {
    backgroundColor: "#1976D2",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
    marginVertical: 5,
  },
  subText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
