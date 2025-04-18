import React, { useState } from "react";
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView, Alert, TextInput } from "react-native";

export default function Configuracoes() {
  const [temaEscuro, setTemaEscuro] = useState(false);
  const [notificacoes, setNotificacoes] = useState(true);
  const [emailExportacao, setEmailExportacao] = useState("usuario@email.com");

  function handleExportarDados() {
    Alert.alert("Exportar Dados", `Dados enviados para: ${emailExportacao}`);
  }

  function handleRedefinirApp() {
    Alert.alert("Redefinir App", "Todos os dados serão apagados.");
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionTitle}>👤 Perfil</Text>
      <View style={styles.sectionBox}>
        <Text style={styles.item}>Nome: Michele</Text>
        <Text style={styles.item}>E-mail: michele@email.com</Text>
        <View style={styles.rowButtons}>
          <TouchableOpacity style={styles.button}><Text style={styles.buttonText}>Editar Perfil</Text></TouchableOpacity>
          <TouchableOpacity style={styles.button}><Text style={styles.buttonText}>Alterar Senha</Text></TouchableOpacity>
        </View>
      </View>

      <Text style={styles.sectionTitle}>⚙️ Preferências</Text>
      <View style={styles.sectionBox}>
        <View style={styles.toggleRow}>
          <Text style={styles.item}>Tema escuro</Text>
          <Switch value={temaEscuro} onValueChange={setTemaEscuro} />
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.item}>Notificações</Text>
          <Switch value={notificacoes} onValueChange={setNotificacoes} />
        </View>
      </View>

      <Text style={styles.sectionTitle}>📁 Dados</Text>
      <View style={styles.sectionBox}>
        <Text style={styles.item}>E-mail para exportação:</Text>
        <TextInput
          style={styles.input}
          value={emailExportacao}
          onChangeText={setEmailExportacao}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.button} onPress={handleExportarDados}>
          <Text style={styles.buttonText}>Exportar dados</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, { backgroundColor: '#c62828' }]} onPress={handleRedefinirApp}>
          <Text style={styles.buttonText}>Redefinir aplicativo</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>❓ Sobre</Text>
      <View style={styles.sectionBox}>
        <Text style={styles.item}>Versão: 1.0.0</Text>
        <Text style={styles.link}>Política de Privacidade</Text>
        <Text style={styles.link}>Suporte</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fdfdfd",
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 30,
    marginBottom: 12,
    color: "#333",
  },
  sectionBox: {
    backgroundColor: "#f9f9f9",
    padding: 18,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  item: {
    fontSize: 16,
    marginBottom: 10,
    color: "#444",
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  button: {
    backgroundColor: "#1976D2",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginVertical: 6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
  },
  rowButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  link: {
    fontSize: 16,
    color: "#1976D2",
    textDecorationLine: "underline",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: "#fff",
  },
});
