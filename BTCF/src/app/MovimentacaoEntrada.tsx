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
  const [valor, setValor] = useState<string>("");
  const [tipo, setTipo] = useState<string>("avista");
  const [parcelas, setParcelas] = useState<string>("");
  const [valorParcela, setValorParcela] = useState<string>("");
  const [dataTermino, setDataTermino] = useState<string>("");
  const [data, setData] = useState<string>(new Date().toISOString().slice(0, 10));
  const [descricao, setDescricao] = useState<string>("");
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (tipo === "parcelado" && valor && parcelas) {
      const qtd = parseInt(parcelas);
      const val = parseFloat(valor.replace(/\D/g, "")) / 100;
      if (!isNaN(qtd) && qtd > 0 && !isNaN(val)) {
        setValorParcela((val / qtd).toFixed(2));
        const now = new Date(data);
        now.setMonth(now.getMonth() + qtd);
        setDataTermino(now.toISOString().slice(0, 10));
      } else {
        setValorParcela("");
        setDataTermino("");
      }
    } else {
      setValorParcela("");
      setDataTermino("");
    }
  }, [tipo, valor, parcelas, data]);

  const formatarValor = (texto: string) => {
    const numeros = texto.replace(/\D/g, "");
    const numeroFormatado = (parseInt(numeros || "0") / 100).toFixed(2);
    return numeroFormatado.replace(".", ",");
  };

  const gerarDescricaoPadrao = (tipo: string, valor: string): string => {
    return `Ganho ${tipo === "parcelado" ? "parcelado" : "à vista"} de R$ ${valor}`;
  };

  const getApiUrl = async (): Promise<string> => {
    const ip = await AsyncStorage.getItem("ipServidor");
    if (!ip) throw new Error("IP do servidor não configurado.");
    return `${ip}/entrada`;
  };

  const handleSalvar = async () => {
    if (!valor || (tipo === "parcelado" && (!parcelas || parseInt(parcelas) <= 0))) {
      Alert.alert("Erro", "Preencha corretamente os campos obrigatórios.");
      return;
    }

    try {
      setLoading(true);

      const valorNumerico = parseFloat(valor.replace(/\D/g, "")) / 100;
      const valorParcelaNumerico = valorParcela ? parseFloat(valorParcela) : valorNumerico;
      const dataFimParcelas = tipo === "parcelado" ? dataTermino : data;

      const body = {
        tipo,
        valor: valorNumerico,
        descricao: descricao.trim() || gerarDescricaoPadrao(tipo, valor),
        qtdeparc: tipo === "parcelado" ? parseInt(parcelas) : 1,
        valorparc: valorParcelaNumerico,
        datafimparc: dataFimParcelas,
      };

      const apiUrl = await getApiUrl();

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error("Erro ao inserir a entrada");
      }

      const resposta = await response.json();

      const novaTransacao: Transacao = {
        id: resposta.chave,
        valor: resposta.valor,
        tipo: resposta.tipo,
        descricao: resposta.descricao,
        data: resposta.datacad,
      };

      setTransacoes((prev) => [novaTransacao, ...prev]);

      // Reseta campos
      setValor("");
      setTipo("avista");
      setParcelas("");
      setValorParcela("");
      setDataTermino("");
      setDescricao("");
      setData(new Date().toISOString().slice(0, 10));

      Alert.alert("✅ Sucesso", "Entrada salva com sucesso!");
    } catch (error: any) {
      console.error(error);
      Alert.alert("Erro", `Erro ao salvar entrada: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: Transacao }) => (
    <View style={[styles.card, { backgroundColor: tema.sectionBoxBackground }]}>
      <Text style={[styles.cardValor, { color: tema.linkColor }]}>
        💰 {item.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
      </Text>
      <Text style={[styles.cardInfo, { color: tema.textColor }]}>📝 {item.descricao}</Text>
      <Text style={[styles.cardInfo, { color: tema.textColor }]}>
        📅 {new Date(item.data).toLocaleDateString("pt-BR")}
      </Text>
      <Text style={[styles.cardInfo, { color: tema.textColor }]}>Tipo: {item.tipo}</Text>
    </View>
  );

  const botaoDesabilitado = !valor || (tipo === "parcelado" && (!parcelas || parseInt(parcelas) <= 0)) || loading;

  return (
    <View style={[styles.container, { backgroundColor: tema.backgroundColor }]}>
      <Text style={[styles.label, { color: tema.textColor }]}>Valor da Entrada (R$)</Text>
      <TextInput
        style={[styles.input, { borderColor: tema.inputBorderColor, backgroundColor: tema.sectionBoxBackground, color: tema.textColor }]}
        keyboardType="numeric"
        placeholder="0,00"
        placeholderTextColor={tema.itemColor}
        value={valor}
        onChangeText={(text) => setValor(formatarValor(text))}
      />

      <Text style={[styles.label, { color: tema.textColor }]}>Data</Text>
      <TextInput
        style={[styles.input, { borderColor: tema.inputBorderColor, backgroundColor: tema.sectionBoxBackground, color: tema.textColor }]}
        value={data}
        onChangeText={setData}
      />

      <Text style={[styles.label, { color: tema.textColor }]}>Tipo da Transação</Text>
      <View style={[styles.pickerContainer, { borderColor: tema.inputBorderColor, backgroundColor: tema.sectionBoxBackground }]}>
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
            style={[styles.input, { borderColor: tema.inputBorderColor, backgroundColor: tema.sectionBoxBackground, color: tema.textColor }]}
            keyboardType="numeric"
            placeholder="Ex: 3"
            placeholderTextColor={tema.itemColor}
            value={parcelas}
            onChangeText={setParcelas}
          />

          <Text style={[styles.label, { color: tema.textColor }]}>Valor de Cada Parcela</Text>
          <TextInput
            style={[styles.input, { backgroundColor: "#e0e0e0", color: tema.textColor }]}
            editable={false}
            value={valorParcela ? parseFloat(valorParcela).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : ""}
          />

          <Text style={[styles.label, { color: tema.textColor }]}>Término do Parcelamento</Text>
          <TextInput
            style={[styles.input, { backgroundColor: "#e0e0e0", color: tema.textColor }]}
            editable={false}
            value={dataTermino}
          />
        </>
      )}

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
        disabled={botaoDesabilitado}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.botaoTexto}>Salvar Entrada</Text>}
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

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  label: { fontSize: 16, fontWeight: "bold", marginTop: 16, marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 16, marginBottom: 8 },
  pickerContainer: { borderWidth: 1, borderRadius: 8, marginBottom: 8 },
  botao: { marginTop: 20, backgroundColor: "#4CAF50", paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  botaoTexto: { fontSize: 16, fontWeight: "bold", color: "#fff" },
  card: { padding: 16, borderRadius: 8, marginVertical: 8, elevation: 3 },
  cardValor: { fontSize: 18, fontWeight: "bold" },
  cardInfo: { fontSize: 14, marginTop: 4 },
});
