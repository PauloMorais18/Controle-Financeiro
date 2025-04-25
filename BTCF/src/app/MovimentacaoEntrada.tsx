import React, { useState, useEffect } from "react";
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

type Transacao = {
  id: number;
  valor: string;
  tipo: string;
  data: string;
  parcelas?: string;
  valorParcela?: string;
  dataTermino?: string;
  descricao: string;
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

  const dataAtual = new Date().toLocaleDateString();

  useEffect(() => {
    if (tipo === "parcelado" && valor && parcelas) {
      const qtd = parseInt(parcelas);
      const val = parseFloat(valor.replace(",", "."));
      if (!isNaN(qtd) && qtd > 0 && !isNaN(val)) {
        const parcelaCalculada = (val / qtd).toFixed(2);
        setValorParcela(parcelaCalculada);

        const now = new Date();
        const termino = new Date(now.setMonth(now.getMonth() + qtd));
        const dataFormatada = `${("0" + (termino.getMonth() + 1)).slice(-2)}/${termino.getFullYear()}`;
        setDataTermino(dataFormatada);
      } else {
        setValorParcela("");
        setDataTermino("");
      }
    } else {
      setValorParcela("");
      setDataTermino("");
    }
  }, [tipo, valor, parcelas]);

  const gerarDescricaoPadrao = (tipo: string, valor: string): string => {
    switch (tipo) {
      case "avista": return `Ganho à vista de R$ ${valor}`;
      case "debito": return `Ganho via débito de R$ ${valor}`;
      case "credito": return `Ganho via crédito de R$ ${valor}`;
      case "parcelado": return `Ganho parcelado de R$ ${valor}`;
      default: return `Ganho de R$ ${valor}`;
    }
  };

  const handleSalvar = () => {
    if (!valor) {
      Alert.alert("Erro", "Informe o valor da entrada.");
      return;
    }

    if (tipo === "parcelado" && (!parcelas || parseInt(parcelas) <= 0)) {
      Alert.alert("Erro", "Informe a quantidade de parcelas.");
      return;
    }

    const novaTransacao: Transacao = {
      id: Date.now(),
      valor,
      tipo,
      data: dataAtual,
      parcelas,
      valorParcela,
      dataTermino,
      descricao: descricao.trim() || gerarDescricaoPadrao(tipo, valor),
    };

    setTransacoes((prev) => [novaTransacao, ...prev]);

    setValor("");
    setTipo("avista");
    setParcelas("");
    setValorParcela("");
    setDataTermino("");
    setDescricao("");
  };

  const renderItem = ({ item }: { item: Transacao }) => (
    <View style={[styles.card, { backgroundColor: tema.sectionBoxBackground }]}>
      <Text style={[styles.cardValor, { color: tema.linkColor }]}>💰 R$ {item.valor}</Text>
      <Text style={[styles.cardInfo, { color: tema.textColor }]}>📝 {item.descricao}</Text>
      <Text style={[styles.cardInfo, { color: tema.textColor }]}>📅 {item.data}</Text>
      <Text style={[styles.cardInfo, { color: tema.textColor }]}>Tipo: {item.tipo}</Text>
      {item.tipo === "parcelado" && (
        <>
          <Text style={[styles.cardInfo, { color: tema.textColor }]}>Parcelas: {item.parcelas}</Text>
          <Text style={[styles.cardInfo, { color: tema.textColor }]}>Valor/Parcela: R$ {item.valorParcela}</Text>
          <Text style={[styles.cardInfo, { color: tema.textColor }]}>Término: {item.dataTermino}</Text>
        </>
      )}
    </View>
  );

  const botaoDesabilitado = !valor || (tipo === "parcelado" && (!parcelas || parseInt(parcelas) <= 0));

  return (
    <View style={[styles.container, { backgroundColor: tema.backgroundColor }]}>
      <Text style={[styles.label, { color: tema.textColor }]}>Valor da Entrada (R$)</Text>
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
          <Picker.Item label="Parcelado" value="parcelado" />
        </Picker>
      </View>

      {tipo === "parcelado" && (
        <>
          <Text style={[styles.label, { color: tema.textColor }]}>Quantidade de Parcelas *</Text>
          <TextInput
            style={[styles.input, {
              borderColor: tema.inputBorderColor,
              backgroundColor: tema.sectionBoxBackground,
              color: tema.textColor,
            }]}
            keyboardType="numeric"
            placeholder="Ex: 3"
            placeholderTextColor={tema.itemColor}
            value={parcelas}
            onChangeText={setParcelas}
          />

          <Text style={[styles.label, { color: tema.textColor }]}>Valor por Parcela (calculado)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: tema.sectionBoxBackground, color: tema.textColor }]}
            value={valorParcela}
            editable={false}
          />

          <Text style={[styles.label, { color: tema.textColor }]}>Data de Término</Text>
          <TextInput
            style={[styles.input, { backgroundColor: tema.sectionBoxBackground, color: tema.textColor }]}
            value={dataTermino}
            editable={false}
          />
        </>
      )}

      <Text style={[styles.label, { color: tema.textColor }]}>Descrição (opcional)</Text>
      <TextInput
        style={[styles.input, {
          borderColor: tema.inputBorderColor,
          backgroundColor: tema.sectionBoxBackground,
          color: tema.textColor,
        }]}
        placeholder="Ex: Salário, venda, bônus..."
        placeholderTextColor={tema.itemColor}
        value={descricao}
        onChangeText={setDescricao}
      />

      <TouchableOpacity
        style={[styles.botao, botaoDesabilitado && { backgroundColor: tema.itemColor }]}
        onPress={handleSalvar}
        disabled={botaoDesabilitado}
      >
        <Text style={[styles.botaoTexto, botaoDesabilitado && { color: "#fff" }]}>Salvar Entrada</Text>
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