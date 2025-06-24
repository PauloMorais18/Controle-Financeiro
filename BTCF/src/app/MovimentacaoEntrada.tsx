import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
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
  const [valorRaw, setValorRaw] = useState("");
  const [tipo, setTipo] = useState("avista");
  const [parcelas, setParcelas] = useState("");
  const [valorParcela, setValorParcela] = useState("");
  const [dataTermino, setDataTermino] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [descricao, setDescricao] = useState("");
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(false);
  const [grupos, setGrupos] = useState<any[]>([]);
  const [grupoSelecionado, setGrupoSelecionado] = useState<number | null>(null);

  const CHAVE_HISTORICO = "historico_entradas";

  useEffect(() => {
    carregarGrupos();
    carregarHistoricoLocal();
  }, []);

  const carregarHistoricoLocal = async () => {
    try {
      const dados = await AsyncStorage.getItem(CHAVE_HISTORICO);
      if (dados) setTransacoes(JSON.parse(dados));
    } catch (e) {
      console.error("Erro ao carregar histórico local:", e);
    }
  };

  const salvarHistoricoLocal = async (lista: Transacao[]) => {
    try {
      await AsyncStorage.setItem(CHAVE_HISTORICO, JSON.stringify(lista));
    } catch (e) {
      console.error("Erro ao salvar histórico local:", e);
    }
  };

  const carregarGrupos = async () => {
    try {
      const email = await AsyncStorage.getItem("usuarioEmail");
      const ip = await AsyncStorage.getItem("ipServidor");
      if (!email || !ip) throw new Error("Dados de autenticação ausentes.");

      const usuarioRes = await fetch(`${ip}/usuario/por-email/${email}`);
      const usuario = await usuarioRes.json();

      const gruposRes = await fetch(`${ip}/grupo/usuario/${usuario.chave}`);
      const lista = await gruposRes.json();

      setGrupos(lista);

      const grupoSalvo = await AsyncStorage.getItem("grupoSelecionado");
      const grupoValido = grupoSalvo && lista.some(g => g.chave === parseInt(grupoSalvo));
      const grupoId = grupoValido ? parseInt(grupoSalvo!) : lista[0]?.chave;

      if (!grupoId) {
        Alert.alert("Atenção", "Você ainda não faz parte de nenhum grupo.");
        return;
      }

      setGrupoSelecionado(grupoId);
    } catch (err: any) {
      console.error("Erro ao carregar grupos:", err);
      Alert.alert("Erro ao carregar grupos", err.message || "Erro desconhecido.");
    }
  };

  useEffect(() => {
    if (tipo === "parcelado" && valorRaw && parcelas) {
      const qtd = parseInt(parcelas);
      const val = parseFloat(valorRaw) / 100;
      if (!isNaN(qtd) && qtd > 0 && !isNaN(val)) {
        setValorParcela((val / qtd).toFixed(2));
        const fim = new Date(data);
        fim.setMonth(fim.getMonth() + qtd);
        setDataTermino(fim.toISOString().slice(0, 10));
      } else {
        setValorParcela("");
        setDataTermino("");
      }
    } else {
      setValorParcela("");
      setDataTermino("");
    }
  }, [tipo, valorRaw, parcelas, data]);

  const formatarComoMoeda = (texto: string) => {
    const numeros = texto.replace(/\D/g, "");
    const inteiro = numeros.padStart(3, "0");
    const valorNumerico = (parseInt(inteiro, 10) / 100).toFixed(2);
    return valorNumerico.replace(".", ",");
  };

  const gerarDescricaoPadrao = (tipo: string, valorFormatado: string) =>
    `Ganho ${tipo === "parcelado" ? "parcelado" : "à vista"} de R$ ${valorFormatado}`;

  const handleSalvar = async () => {
    if (!valorRaw || (tipo === "parcelado" && (!parcelas || parseInt(parcelas) <= 0))) {
      Alert.alert("Erro", "Preencha corretamente os campos obrigatórios.");
      return;
    }
    if (!grupoSelecionado) {
      Alert.alert("Erro", "Selecione um grupo.");
      return;
    }

    try {
      setLoading(true);
      const usuarioId = await AsyncStorage.getItem("usuarioId");
      const ip = await AsyncStorage.getItem("ipServidor");
      if (!usuarioId || !ip) throw new Error("Dados incompletos.");

      const valorNumerico = parseFloat(valorRaw) / 100;
      const valorParcelaNumerico = valorParcela ? parseFloat(valorParcela) : valorNumerico;
      const dataFimParcelas = tipo === "parcelado" ? dataTermino : data;
      const valorFormatado = formatarComoMoeda(valorRaw);

      const body = {
        tipo,
        valor: valorNumerico,
        descricao: descricao.trim() || gerarDescricaoPadrao(tipo, valorFormatado),
        qtdeparc: tipo === "parcelado" ? parseInt(parcelas) : 1,
        valorparc: valorParcelaNumerico,
        datafimparc: dataFimParcelas,
        chavepessoa: parseInt(usuarioId),
        chavegrupo: grupoSelecionado,
      };

      console.log("📤 Enviando dados para API /entrada:", body);

      const response = await fetch(`${ip}/entrada`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const resposta = await response.json();

      if (!response.ok) {
        console.error("❌ Erro na resposta da API:", resposta);
        throw new Error(resposta.erro || "Erro ao inserir entrada");
      }

      const novaTransacao: Transacao = {
        id: resposta.chave,
        valor: resposta.valor,
        tipo: resposta.tipo,
        descricao: resposta.descricao,
        data: resposta.datacad,
      };

      await AsyncStorage.setItem("grupoSelecionado", grupoSelecionado.toString());

      const novaLista = [novaTransacao, ...transacoes];
      setTransacoes(novaLista);
      await salvarHistoricoLocal(novaLista);

      setValorRaw("");
      setTipo("avista");
      setParcelas("");
      setValorParcela("");
      setDataTermino("");
      setDescricao("");
      setData(new Date().toISOString().slice(0, 10));

      Alert.alert("✅ Sucesso", "Entrada registrada com sucesso.");
    } catch (error: any) {
      Alert.alert("Erro", error.message || "Erro ao salvar.");
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

  return (
    <ScrollView style={{ flex: 1, backgroundColor: tema.backgroundColor }}>
      <View style={{ padding: 24, paddingBottom: 100 }}>
        {renderFormulario()}
        {transacoes.map((item, index) => (
          <View key={item.id || index} style={{ marginTop: 16 }}>
            {renderItem({ item })}
          </View>
        ))}
      </View>
    </ScrollView>
  );

  function renderFormulario() {
    return (
      <>
        <Text style={[styles.label, { color: tema.textColor }]}>Grupo</Text>
        <View style={[styles.pickerContainer, { borderColor: tema.inputBorderColor }]}>
          <Picker
            selectedValue={grupoSelecionado}
            onValueChange={setGrupoSelecionado}
            style={{ color: "#000" }}
          >
            {grupos.map((grupo) => (
              <Picker.Item key={grupo.chave} label={grupo.nome} value={grupo.chave} />
            ))}
          </Picker>
        </View>

        <TouchableOpacity
          onPress={carregarGrupos}
          style={[styles.botao, { backgroundColor: "#2196F3", marginTop: 10 }]}
        >
          <Text style={styles.botaoTexto}>🔄 Atualizar Grupos</Text>
        </TouchableOpacity>

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
          value={formatarComoMoeda(valorRaw)}
          onChangeText={(text) => setValorRaw(text.replace(/\D/g, ""))}
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
            <Text style={[styles.label, { color: tema.textColor }]}>Parcelas *</Text>
            <TextInput
              style={[styles.input, { borderColor: tema.inputBorderColor, backgroundColor: tema.sectionBoxBackground, color: tema.textColor }]}
              keyboardType="numeric"
              value={parcelas}
              onChangeText={setParcelas}
            />
            <Text style={[styles.label, { color: tema.textColor }]}>Valor por Parcela</Text>
            <TextInput
              style={[styles.input, { backgroundColor: "#e0e0e0", color: tema.textColor }]}
              editable={false}
              value={valorParcela ? parseFloat(valorParcela).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : ""}
            />
            <Text style={[styles.label, { color: tema.textColor }]}>Fim do Parcelamento</Text>
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
          value={descricao}
          onChangeText={setDescricao}
        />

        <TouchableOpacity
          style={[styles.botao, (!valorRaw || loading) && { backgroundColor: tema.itemColor }]}
          onPress={handleSalvar}
          disabled={!valorRaw || loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.botaoTexto}>Salvar Entrada</Text>}
        </TouchableOpacity>
      </>
    );
  }
}

const styles = StyleSheet.create({
  label: { fontSize: 16, fontWeight: "bold", marginTop: 16, marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 16, marginBottom: 8 },
  pickerContainer: { borderWidth: 1, borderRadius: 8, marginBottom: 8 },
  botao: { marginTop: 20, backgroundColor: "#4CAF50", paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  botaoTexto: { fontSize: 16, fontWeight: "bold", color: "#fff" },
  card: { padding: 16, borderRadius: 8, marginVertical: 8, elevation: 3 },
  cardValor: { fontSize: 18, fontWeight: "bold" },
  cardInfo: { fontSize: 14, marginTop: 4 },
});
