import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";

export default function Principal() {
  function handleAddEntrada() {
    Alert.alert("Adicionar Entrada", "Função de adicionar entrada chamada.");
  }

  function handleAddSaida() {
    Alert.alert("Adicionar Saída", "Função de adicionar saída chamada.");
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard Financeiro</Text>

      <View style={styles.dashboard}>
        <Text style={styles.metric}>Saldo Atual: R$ 0,00</Text>
        <Text style={styles.metric}>Entradas: R$ 0,00</Text>
        <Text style={styles.metric}>Saídas: R$ 0,00</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.button, styles.entrada]} onPress={handleAddEntrada}>
          <Text style={styles.buttonText}>+ Entrada</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.saida]} onPress={handleAddSaida}>
          <Text style={styles.buttonText}>- Saída</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 32,
    justifyContent: "center",
    backgroundColor: "#f4f4f4",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 32,
    textAlign: "center",
    color: "#333",
  },
  dashboard: {
    marginBottom: 40,
  },
  metric: {
    fontSize: 18,
    marginVertical: 8,
    color: "#444",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  entrada: {
    backgroundColor: "#4caf50",
  },
  saida: {
    backgroundColor: "#f44336",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
