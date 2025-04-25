// Configuracoes.js
import React from "react";
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView, Alert, TextInput } from "react-native";
import { useTheme } from "./ThemeContext"; // Ajuste o caminho conforme necessário

export default function Configuracoes() {
  const { temaEscuro, setTemaEscuro, tema } = useTheme();
  const [emailExportacao, setEmailExportacao] = React.useState("usuario@email.com");
  const [notificacoes, setNotificacoes] = React.useState(true);

  function handleExportarDados() {
    Alert.alert("Exportar Dados", `Os dados foram enviados para: ${emailExportacao}`);
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: tema.backgroundColor }]}>
      <Text style={[styles.sectionTitle, { color: tema.textColor }]}>👤 Perfil</Text>
      <View style={[styles.sectionBox, { backgroundColor: tema.sectionBoxBackground, shadowColor: tema.shadowColor }]}>
        <Text style={[styles.item, { color: tema.itemColor }]}>Nome: Michele</Text>
        <Text style={[styles.item, { color: tema.itemColor }]}>E-mail: michele@email.com</Text>
        <View style={styles.rowButtons}>
          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Editar Perfil</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Alterar Senha</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: tema.textColor }]}>⚙️ Preferências</Text>
      <View style={[styles.sectionBox, { backgroundColor: tema.sectionBoxBackground, shadowColor: tema.shadowColor }]}>
        <View style={styles.toggleRow}>
          <Text style={[styles.item, { color: tema.itemColor }]}>Tema Escuro</Text>
          <Switch value={temaEscuro} onValueChange={setTemaEscuro} />
        </View>
        <View style={styles.toggleRow}>
          <Text style={[styles.item, { color: tema.itemColor }]}>Notificações</Text>
          <Switch value={notificacoes} onValueChange={setNotificacoes} />
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: tema.textColor }]}>📁 Dados</Text>
      <View style={[styles.sectionBox, { backgroundColor: tema.sectionBoxBackground, shadowColor: tema.shadowColor }]}>
        <Text style={[styles.item, { color: tema.itemColor }]}>E-mail para exportação:</Text>
        <TextInput
          style={[styles.input, { backgroundColor: tema.inputBackground, borderColor: tema.inputBorderColor, color: tema.textColor }]}
          value={emailExportacao}
          onChangeText={setEmailExportacao}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="Digite o e-mail"
          placeholderTextColor={tema.itemColor}
        />
        <TouchableOpacity style={styles.button} onPress={handleExportarDados}>
          <Text style={styles.buttonText}>Exportar Dados</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.sectionTitle, { color: tema.textColor }]}>❓ Sobre</Text>
      <View style={[styles.sectionBox, { backgroundColor: tema.sectionBoxBackground, shadowColor: tema.shadowColor }]}>
        <Text style={[styles.item, { color: tema.itemColor }]}>Versão: 1.0.0</Text>
        <Text style={[styles.link, { color: tema.linkColor }]}>Política de Privacidade</Text>
        <Text style={[styles.link, { color: tema.linkColor }]}>Suporte</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 30,
    marginBottom: 12,
  },
  sectionBox: {
    padding: 18,
    borderRadius: 12,
    marginBottom: 24,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  item: {
    fontSize: 16,
    marginBottom: 10,
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
    textDecorationLine: "underline",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginBottom: 12,
  },
});