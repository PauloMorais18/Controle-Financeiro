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
      case "avista":
        return `Ganho à vista de R$ ${valor}`;
      case "debito":
        return `Ganho via débito de R$ ${valor}`;
      case "credito":
        return `Ganho via crédito de R$ ${valor}`;
      case "parcelado":
        return `Ganho parcelado de R$ ${valor}`;
      default:
        return `Ganho de R$ ${valor}`;
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

    // Limpar os campos
    setValor("");
    setTipo("avista");
    setParcelas("");
    setValorParcela("");
    setDataTermino("");
    setDescricao("");
  };

  const renderItem = ({ item }: { item: Transacao }) => (
    <View style={styles.card}>
      <Text style={styles.cardValor}>💰 R$ {item.valor}</Text>
      <Text style={styles.cardInfo}>📝 {item.descricao}</Text>
      <Text style={styles.cardInfo}>📅 {item.data}</Text>
      <Text style={styles.cardInfo}>Tipo: {item.tipo}</Text>
      {item.tipo === "parcelado" && (
        <View>
          <Text style={styles.cardInfo}>Parcelas: {item.parcelas}</Text>
          <Text style={styles.cardInfo}>Valor/Parcela: R$ {item.valorParcela}</Text>
          <Text style={styles.cardInfo}>Término: {item.dataTermino}</Text>
        </View>
      )}
    </View>
  );

  const botaoDesabilitado =
    !valor || (tipo === "parcelado" && (!parcelas || parseInt(parcelas) <= 0));

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Valor da Entrada (R$)</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        placeholder="0,00"
        value={valor}
        onChangeText={setValor}
      />

      <Text style={styles.label}>Data</Text>
      <Text style={styles.texto}>{dataAtual}</Text>

      <Text style={styles.label}>Tipo da Transação</Text>
      <View style={styles.pickerContainer}>
        <Picker selectedValue={tipo} onValueChange={setTipo}>
          <Picker.Item label="À Vista" value="avista" />
          <Picker.Item label="Débito" value="debito" />
          <Picker.Item label="Crédito" value="credito" />
          <Picker.Item label="Parcelado" value="parcelado" />
        </Picker>
      </View>

      {tipo === "parcelado" && (
        <>
          <Text style={styles.label}>Quantidade de Parcelas *</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="Ex: 3"
            value={parcelas}
            onChangeText={setParcelas}
          />

          <Text style={styles.label}>Valor por Parcela (calculado)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: "#eee" }]}
            value={valorParcela}
            editable={false}
          />

          <Text style={styles.label}>Data de Término</Text>
          <TextInput
            style={[styles.input, { backgroundColor: "#eee" }]}
            value={dataTermino}
            editable={false}
          />
        </>
      )}

      <Text style={styles.label}>Descrição (opcional)</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: Salário, venda, bônus..."
        value={descricao}
        onChangeText={setDescricao}
      />

      <TouchableOpacity
        style={[
          styles.botao,
          botaoDesabilitado && { backgroundColor: "#999" },
        ]}
        onPress={handleSalvar}
        disabled={botaoDesabilitado}
      >
        <Text style={styles.botaoTexto}>Salvar Entrada</Text>
      </TouchableOpacity>

      <Text style={[styles.label, { marginTop: 32 }]}>Entradas Registradas</Text>
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
    backgroundColor: "#fff",
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 4,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  texto: {
    fontSize: 16,
    color: "#555",
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: "#f9f9f9",
  },
  botao: {
    marginTop: 32,
    backgroundColor: "#1976D2",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  botaoTexto: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  card: {
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
  },
  cardValor: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1976D2",
  },
  cardInfo: {
    fontSize: 14,
    color: "#555",
  },
});
