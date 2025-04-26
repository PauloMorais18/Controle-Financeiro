import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useTheme } from "./ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Transacao = {
  id: number;
  valor: number;
  tipo: string;
  descricao: string;
  data: string;
};

export default function MovimentacaoEntrada() {
  const { tema } = useTheme();
  const [valor, setValor] = useState("");
  const [tipo, setTipo] = useState("avista");
  const [parcelas, setParcelas] = useState("");
  const [valorParcela, setValorParcela] = useState("");
  const [dataTermino, setDataTermino] = useState("");
  const [descricao, setDescricao] = useState("");
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(false);

  const dataAtual = new Date().toLocaleDateString();

  const gerarDescricaoPadrao = (tipo: string, valor: string): string => {
    switch (tipo) {
      case "avista": return `Ganho à vista de R$ ${valor}`;
      case "debito": return `Ganho via débito de R$ ${valor}`;
      case "credito": return `Ganho via crédito de R$ ${valor}`;
      case "parcelado": return `Ganho parcelado de R$ ${valor}`;
      default: return `Ganho de R$ ${valor}`;
    }
  };

  const getApiUrl = async (): Promise<string> => {
    const ip = await AsyncStorage.getItem("ipServidor");
    if (!ip) throw new Error("IP do servidor não configurado.");
    return `${ip}/transacoes`;
  };

  const handleSalvar = async () => {
    if (!valor) {
      Alert.alert("Erro", "Informe o valor da entrada.");
      return;
    }

    try {
      setLoading(true);
      const apiUrl = await getApiUrl();

      const body = {
        tipo: "entrada",
        valor: parseFloat(valor.replace(",", ".")),
        descricao: descricao.trim() || gerarDescricaoPadrao(tipo, valor),
      };

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error("Erro ao inserir a entrada.");
      }

      const novaTransacao: Transacao = await response.json();
      setTransacoes((prev) => [novaTransacao, ...prev]);

      // Limpar os campos
      setValor("");
      setTipo("avista");
      setParcelas("");
      setValorParcela("");
      setDataTermino("");
      setDescricao("");

      Alert.alert("✅ Sucesso", "Entrada salva com sucesso!");

    } catch (error) {
      console.error(error);
      Alert.alert("Erro", "Não foi possível conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: Transacao }) => (
    <View style={[styles.card, { backgroundColor: tema.sectionBoxBackground }]}>
      <Text style={[styles.cardValor, { color: tema.linkColor }]}>💰 R$ {item.valor.toFixed(2)}</Text>
      <Text style={[styles.cardInfo, { color: tema.textColor }]}>📝 {item.descricao}</Text>
      <Text style={[styles.cardInfo, { color: tema.textColor }]}>📅 {item.data}</Text>
      <Text style={[styles.cardInfo, { color: tema.textColor }]}>Tipo: {item.tipo}</Text>
    </View>
  );

  const botaoDesabilitado = !valor;

  return (
    <View style={[styles.container, { backgroundColor: tema.backgroundColor }]}>
      <Text style={[styles.label, { color: tema.textColor }]}>Valor da Entrada (R$)</Text>
      <TextInput
        style={[styles.input, { borderColor: tema.inputBorderColor, backgroundColor: tema.sectionBoxBackground, color: tema.textColor }]}
        keyboardType="numeric"
        placeholder="0,00"
        placeholderTextColor={tema.itemColor}
        value={valor}
        onChangeText={setValor}
      />

      <Text style={[styles.label, { color: tema.textColor }]}>Data</Text>
      <Text style={[styles.texto, { color: tema.textColor }]}>{dataAtual}</Text>

      <Text style={[styles.label, { color: tema.textColor }]}>Tipo da Transação</Text>
      <View style={[styles.pickerContainer, { borderColor: tema.inputBorderColor, backgroundColor: tema.sectionBoxBackground }]}>
        <Picker selectedValue={tipo} onValueChange={setTipo} style={{ color: "#000" }}>
          <Picker.Item label="À Vista" value="avista" />
          <Picker.Item label="Débito" value="debito" />
          <Picker.Item label="Crédito" value="credito" />
          <Picker.Item label="Parcelado" value="parcelado" />
        </Picker>
      </View>

      <Text style={[styles.label, { color: tema.textColor }]}>Descrição (opcional)</Text>
      <TextInput
        style={[styles.input, { borderColor: tema.inputBorderColor, backgroundColor: tema.sectionBoxBackground, color: tema.textColor }]}
        placeholder="Ex: Salário, venda, bônus..."
        placeholderTextColor={tema.itemColor}
        value={descricao}
        onChangeText={setDescricao}
      />

      <TouchableOpacity
        style={[styles.botao, botaoDesabilitado && { backgroundColor: tema.itemColor }]}
        onPress={handleSalvar}
        disabled={botaoDesabilitado || loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.botaoTexto}>Salvar Entrada</Text>
        )}
      </TouchableOpacity>

      <Text style={[styles.label, { marginTop: 32, color: tema.textColor }]}>Entradas Registradas</Text>
      <FlatList
        data={transacoes}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 100 }}
      />
    </View>
  );
}

export const screenOptions = {
  title: "Movimentação de Entrada",
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
  texto: {
    fontSize: 16,
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
  },
  botao: {
    marginTop: 20,
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  botaoTexto: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  card: {
    padding: 16,
    borderRadius: 8,
    marginVertical: 8,
    elevation: 3,
  },
  cardValor: {
    fontSize: 18,
    fontWeight: "bold",
  },
  cardInfo: {
    fontSize: 14,
    marginTop: 4,
  },
});
