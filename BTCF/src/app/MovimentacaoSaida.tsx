import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useTheme } from "./ThemeContext";

type TransacaoSaida = {
  id: number;
  valor: string;
  tipo: string;
  data: string;
  categoria: string;
  descricao: string;
};

export default function MovimentacaoSaida() {
  const { tema } = useTheme();
  const [valor, setValor] = useState("");
  const [tipo, setTipo] = useState("avista");
  const [categoria, setCategoria] = useState("alimentacao");
  const [descricao, setDescricao] = useState("");
  const [transacoes, setTransacoes] = useState<TransacaoSaida[]>([]);

  const dataAtual = new Date().toLocaleDateString();

  const categorias = [
    { label: "Alimentação", value: "alimentacao" },
    { label: "Transporte", value: "transporte" },
    { label: "Moradia", value: "moradia" },
    { label: "Lazer", value: "lazer" },
    { label: "Outros", value: "outros" },
  ];

  const gerarDescricaoPadrao = (tipo: string, valor: string, cat: string): string => {
    const nomeCategoria = categorias.find(c => c.value === cat)?.label || "Outros";
    return `Gasto de R$ ${valor} com ${nomeCategoria} (${tipo})`;
  };

  const handleSalvar = () => {
    if (!valor) {
      Alert.alert("Erro", "Informe o valor da saída.");
      return;
    }

    const novaTransacao: TransacaoSaida = {
      id: Date.now(),
      valor,
      tipo,
      data: dataAtual,
      categoria,
      descricao: descricao.trim() || gerarDescricaoPadrao(tipo, valor, categoria),
    };

    setTransacoes((prev) => [novaTransacao, ...prev]);
    setValor("");
    setTipo("avista");
    setCategoria("alimentacao");
    setDescricao("");
  };

  const renderItem = ({ item }: { item: TransacaoSaida }) => (
    <View style={[styles.card, { backgroundColor: tema.sectionBoxBackground }]}>
      <Text style={[styles.cardValor, { color: "#e53935" }]}>🔻 R$ {item.valor}</Text>
      <Text style={[styles.cardInfo, { color: tema.textColor }]}>📝 {item.descricao}</Text>
      <Text style={[styles.cardInfo, { color: tema.textColor }]}>📅 {item.data}</Text>
      <Text style={[styles.cardInfo, { color: tema.textColor }]}>Tipo: {item.tipo}</Text>
      <Text style={[styles.cardInfo, { color: tema.textColor }]}>Categoria: {item.categoria}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: tema.backgroundColor }]}>
      <Text style={[styles.label, { color: tema.textColor }]}>Valor da Saída (R$)</Text>
      <TextInput
        style={[styles.input, {
          borderColor: tema.inputBorderColor,
          backgroundColor: tema.sectionBoxBackground,
          color: tema.textColor,
        }]}
        keyboardType="numeric"
        placeholder="0,00"
        placeholderTextColor={tema.itemColor}
        value={valor}
        onChangeText={setValor}
      />

      <Text style={[styles.label, { color: tema.textColor }]}>Data</Text>
      <Text style={[styles.texto, { color: tema.textColor }]}>{dataAtual}</Text>

      <Text style={[styles.label, { color: tema.textColor }]}>Tipo da Transação</Text>
      <View style={[styles.pickerContainer, {
        borderColor: tema.inputBorderColor,
        backgroundColor: tema.sectionBoxBackground,
      }]}>
        <Picker selectedValue={tipo} onValueChange={setTipo} style={{ color: "#000" }}>
          <Picker.Item label="À Vista" value="avista" />
          <Picker.Item label="Débito" value="debito" />
          <Picker.Item label="Crédito" value="credito" />
        </Picker>
      </View>

      <Text style={[styles.label, { color: tema.textColor }]}>Categoria</Text>
      <View style={[styles.pickerContainer, {
        borderColor: tema.inputBorderColor,
        backgroundColor: tema.sectionBoxBackground,
      }]}>
        <Picker selectedValue={categoria} onValueChange={setCategoria} style={{ color: "#000" }}>
          {categorias.map((cat) => (
            <Picker.Item key={cat.value} label={cat.label} value={cat.value} />
          ))}
        </Picker>
      </View>

      <Text style={[styles.label, { color: tema.textColor }]}>Descrição (opcional)</Text>
      <TextInput
        style={[styles.input, {
          borderColor: tema.inputBorderColor,
          backgroundColor: tema.sectionBoxBackground,
          color: tema.textColor,
        }]}
        placeholder="Ex: Mercado, gasolina, aluguel..."
        placeholderTextColor={tema.itemColor}
        value={descricao}
        onChangeText={setDescricao}
      />

      <TouchableOpacity
        style={[styles.botao, !valor && { backgroundColor: tema.itemColor }]}
        onPress={handleSalvar}
        disabled={!valor}
      >
        <Text style={[styles.botaoTexto, !valor && { color: "#fff" }]}>Salvar Saída</Text>
      </TouchableOpacity>

      <Text style={[styles.label, { marginTop: 32, color: tema.textColor }]}>Saídas Registradas</Text>
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
  title: "Movimentação de Saída",
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
    backgroundColor: "#e53935",
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