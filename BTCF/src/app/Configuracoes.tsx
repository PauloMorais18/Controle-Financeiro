import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView, Alert, TextInput } from "react-native";
import { useTheme } from "./ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Configuracoes() {
  const { temaEscuro, setTemaEscuro, tema } = useTheme();
  const [emailExportacao, setEmailExportacao] = useState("usuario@email.com");
  const [notificacoes, setNotificacoes] = useState(true);
  const [ipServidor, setIpServidor] = useState("");

  useEffect(() => {
    async function carregarConfiguracoes() {
      const ipSalvo = await AsyncStorage.getItem("ipServidor");
      if (ipSalvo) setIpServidor(ipSalvo);
    }
    carregarConfiguracoes();
  }, []);

  async function handleSalvarIP() {
    if (!ipServidor.startsWith("http://") && !ipServidor.startsWith("https://")) {
      Alert.alert("Erro", "O IP deve começar com http:// ou https://");
      return;
    }
    try {
      await AsyncStorage.setItem("ipServidor", ipServidor);
      Alert.alert("✅ Sucesso", "IP do servidor salvo!");
    } catch (error) {
      console.error(error);
      Alert.alert("Erro", "Não foi possível salvar o IP.");
    }
  }

  function handleExportarDados() {
    Alert.alert("Exportar Dados", `Os dados foram enviados para: ${emailExportacao}`);
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: tema.backgroundColor }]}>
      <Text style={[styles.sectionTitle, { color: tema.textColor }]}>👤 Perfil</Text>
      <View style={[styles.sectionBox, { backgroundColor: tema.sectionBoxBackground }]}>
        <Text style={[styles.item, { color: tema.itemColor }]}>Nome: Usuário</Text>
        <Text style={[styles.item, { color: tema.itemColor }]}>E-mail: usuario@email.com</Text>
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
      <View style={[styles.sectionBox, { backgroundColor: tema.sectionBoxBackground }]}>
        <View style={styles.toggleRow}>
          <Text style={[styles.item, { color: tema.itemColor }]}>Tema Escuro</Text>
          <Switch value={temaEscuro} onValueChange={setTemaEscuro} />
        </View>
        <View style={styles.toggleRow}>
          <Text style={[styles.item, { color: tema.itemColor }]}>Notificações</Text>
          <Switch value={notificacoes} onValueChange={setNotificacoes} />
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: tema.textColor }]}>🌐 Configurações do Servidor</Text>
      <View style={[styles.sectionBox, { backgroundColor: tema.sectionBoxBackground }]}>
        <Text style={[styles.item, { color: tema.itemColor }]}>Endereço IP do servidor:</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: "#e0e0e0", // cor acinzentada para mostrar que está desabilitado
              borderColor: tema.inputBorderColor,
              color: "#888",
            },
          ]}
          value={ipServidor}
          editable={false}
          selectTextOnFocus={false}
        />
      </View>

      <Text style={[styles.sectionTitle, { color: tema.textColor }]}>📁 Dados</Text>
      <View style={[styles.sectionBox, { backgroundColor: tema.sectionBoxBackground }]}>
        <Text style={[styles.item, { color: tema.itemColor }]}>E-mail para exportação:</Text>
        <TextInput
          style={[styles.input, { backgroundColor: tema.sectionBoxBackground, borderColor: tema.inputBorderColor, color: tema.textColor }]}
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
      <View style={[styles.sectionBox, { backgroundColor: tema.sectionBoxBackground }]}>
        <Text style={[styles.item, { color: tema.itemColor }]}>Versão: 1.0.0</Text>
        <Text style={[styles.link, { color: tema.linkColor }]}>Política de Privacidade</Text>
        <Text style={[styles.link, { color: tema.linkColor }]}>Suporte</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 40 },
  sectionTitle: { fontSize: 20, fontWeight: "600", marginTop: 30, marginBottom: 12 },
  sectionBox: { padding: 18, borderRadius: 12, marginBottom: 24, elevation: 3 },
  item: { fontSize: 16, marginBottom: 10 },
  toggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  button: { backgroundColor: "#1976D2", paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, marginVertical: 6 },
  buttonText: { color: "#fff", fontSize: 16, textAlign: "center" },
  rowButtons: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  link: { fontSize: 16, textDecorationLine: "underline", marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 16, marginBottom: 12 },
});
