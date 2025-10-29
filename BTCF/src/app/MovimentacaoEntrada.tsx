import React, { useState, useEffect, useCallback } from "react";
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
import { Feather } from "@expo/vector-icons";

// --- Definições de Tipo para TypeScript ---
type Transacao = {
  id: number;
  valor: number;
  tipo: string;
  categoria: string;
  descricao: string;
  data: string;
  taxajuros?: number;
};

interface Categoria {
  chave: number;
  nome_categoria: string;
  tipo_transacao: "entrada" | "saida";
  chaveusuario: number;
}

// Interface para a resposta de erro da API
interface ErrorResponse {
  erro: string;
}

export default function MovimentacaoEntrada() {
  const { tema } = useTheme();

  // Estados do formulário
  const [valorRaw, setValorRaw] = useState<number>(0); // número puro para cálculos
  const [valorExibicao, setValorExibicao] = useState<string>(""); // texto no input
  const [tipo, setTipo] = useState<string>("avista");
  const [categoria, setCategoria] = useState<string>("");
  const [parcelas, setParcelas] = useState<string>("");
  const [valorParcela, setValorParcela] = useState<string>("");
  const [dataTermino, setDataTermino] = useState<string>("");
  const [data, setData] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [descricao, setDescricao] = useState<string>("");

  // Estados auxiliares
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [grupos, setGrupos] = useState<any[]>([]);
  const [grupoSelecionado, setGrupoSelecionado] = useState<number | null>(null);
  const CHAVE_HISTORICO = "historico_entradas";

  const [ipServidor, setIpServidor] = useState<string | null>(null);
  const [usuarioId, setUsuarioId] = useState<number | null>(null);
  const [categoriasDisponiveis, setCategoriasDisponiveis] = useState<
    Categoria[]
  >([]);
  const [showValues, setShowValues] = useState(true);

  // Taxa de juros digitada (ex.: "15", "1,5", "2.75")
  const [taxaJuros, setTaxaJuros] = useState<string>("");

  // -------- formatador de moeda no card --------
  const formatCurrency = useCallback(
    (value: any): string => {
      if (value === null || value === undefined || isNaN(value)) {
        value = 0;
      }
      const numericValue =
        typeof value === "string"
          ? parseFloat(value.replace(",", "."))
          : value;

      if (!showValues) {
        return "R$ *****";
      }
      if (!Number.isFinite(numericValue)) {
        return "R$ 0,00";
      }

      return `R$ ${numericValue.toFixed(2).replace(".", ",")}`;
    },
    [showValues]
  );

  // -------- carregar config inicial: IP servidor + usuário --------
  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const storedIp = await AsyncStorage.getItem("ipServidor");
      if (storedIp) {
        setIpServidor(storedIp);
      } else {
        Alert.alert(
          "Erro",
          "IP do servidor não configurado. Por favor, configure o IP na tela de configurações."
        );
        setLoading(false);
        return;
      }

      const userEmail = await AsyncStorage.getItem("usuarioEmail");
      if (userEmail && storedIp) {
        const userRes = await fetch(
          `${storedIp}/usuario/por-email/${userEmail}`
        );
        if (userRes.ok) {
          const userData = await userRes.json();
          setUsuarioId(userData.chave);
          await AsyncStorage.setItem("usuarioId", String(userData.chave));
        } else {
          Alert.alert(
            "Erro",
            "Não foi possível obter o ID do usuário. Faça login novamente."
          );
          setLoading(false);
          return;
        }
      } else {
        Alert.alert(
          "Erro",
          "ID do usuário ou Email não encontrado. Por favor, faça login novamente."
        );
        setLoading(false);
        return;
      }
    } catch (err: any) {
      console.error("Erro ao carregar configurações:", err.message);
      Alert.alert(
        "Erro",
        "Não foi possível obter as configurações iniciais."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // -------- carregar grupos --------
  const carregarGrupos = useCallback(async () => {
    if (!ipServidor || usuarioId === null) {
      return;
    }
    try {
      const gruposRes = await fetch(
        `${ipServidor}/grupo/usuario/${usuarioId}`
      );
      if (!gruposRes.ok) {
        const errorData: ErrorResponse = await gruposRes.json();
        throw new Error(errorData.erro || "Erro ao buscar grupos.");
      }
      const lista = await gruposRes.json();
      setGrupos(lista);

      const grupoSalvo = await AsyncStorage.getItem("grupoSelecionado");
      const grupoValido =
        grupoSalvo &&
        lista.some((g: any) => g.chave === parseInt(grupoSalvo as string, 10));
      const grupoId = grupoValido
        ? parseInt(grupoSalvo as string, 10)
        : lista[0]?.chave;

      if (!grupoId) {
        Alert.alert(
          "Atenção",
          "Você ainda não faz parte de nenhum grupo."
        );
        return;
      }
      setGrupoSelecionado(grupoId);
    } catch (err: any) {
      console.error("Erro ao carregar grupos:", err);
      Alert.alert(
        "Erro ao carregar grupos",
        err.message || "Erro desconhecido."
      );
    }
  }, [ipServidor, usuarioId]);

  // -------- carregar categorias --------
  const carregarCategorias = useCallback(async () => {
    if (!ipServidor || usuarioId === null) {
      return;
    }
    try {
      const response = await fetch(
        `${ipServidor}/categorias/${usuarioId}/entrada`
      );
      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();
        throw new Error(errorData.erro || "Erro ao buscar categorias.");
      }
      const data: Categoria[] = await response.json();
      setCategoriasDisponiveis(data);
      if (data.length > 0) {
        setCategoria(data[0].nome_categoria);
      } else {
        setCategoria("");
      }
    } catch (err: any) {
      console.error("Erro ao carregar categorias:", err.message);
      Alert.alert(
        "Erro",
        "Não foi possível carregar as categorias personalizadas."
      );
    }
  }, [ipServidor, usuarioId]);

  useEffect(() => {
    if (ipServidor && usuarioId !== null) {
      carregarGrupos();
      carregarCategorias();
    }
  }, [ipServidor, usuarioId, carregarGrupos, carregarCategorias]);

  // -------- histórico do servidor (mantido, pode ser chamado em botão futuro) --------
  const carregarHistoricoDoServidor = async () => {
    try {
      if (!usuarioId || !ipServidor)
        throw new Error("Usuário ou IP não encontrado.");

      const response = await fetch(
        `${ipServidor}/entrada?chavepessoa=${usuarioId}`
      );

      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();
        throw new Error(errorData.erro || "Erro ao buscar histórico.");
      }

      const dados: any[] = await response.json();
      const dadosComCategoria: Transacao[] = dados.map((item) => ({
        id: item.id || item.chave,
        valor:
          typeof item.valor === "number"
            ? item.valor
            : parseFloat(item.valor?.replace(",", ".") || "0"),
        tipo: item.tipo || "",
        categoria: item.categoria || "Não Definida",
        descricao: item.descricao || "",
        data:
          item.data ||
          item.datacad ||
          new Date().toISOString().slice(0, 10),
        taxajuros: item.taxajuros || 0,
      }));

      setTransacoes(dadosComCategoria);
      await salvarHistoricoLocal(dadosComCategoria);
    } catch (err: any) {
      console.error("Erro ao carregar histórico do servidor:", err.message);
      Alert.alert("Erro", err.message || "Erro ao carregar histórico.");
    }
  };

  const salvarHistoricoLocal = async (lista: Transacao[]) => {
    try {
      await AsyncStorage.setItem(CHAVE_HISTORICO, JSON.stringify(lista));
    } catch (e) {
      console.error("Erro ao salvar histórico local:", e);
    }
  };

  // -------- cálculo de parcelas / fim do parcelamento --------
  useEffect(() => {
    if (tipo === "parcelado" && valorRaw > 0 && parcelas) {
      const qtd = parseInt(parcelas, 10);
      const val = valorRaw;

      // taxaJuros pode ser "15", "1,5", "1.5"
      const jurosFloat = taxaJuros
        ? parseFloat(taxaJuros.replace(",", "."))
        : 0;

      const juros = jurosFloat > 0 ? jurosFloat / 100 : 0;

      if (!isNaN(qtd) && qtd > 0 && !isNaN(val)) {
        const valorTotalComJuros = val * (1 + juros);
        setValorParcela((valorTotalComJuros / qtd).toFixed(2));

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
  }, [tipo, valorRaw, parcelas, data, taxaJuros]);

  // -------- handler do campo Valor da Entrada --------
  const handleValorChange = (text: string) => {
    // permite apenas números e vírgula
    const apenasPermitidos = text.replace(/[^0-9,]/g, "");

    // atualiza texto que aparece no input
    setValorExibicao(apenasPermitidos);

    // converte vírgula para ponto e atualiza número bruto
    if (apenasPermitidos.trim() !== "") {
      const numero = parseFloat(apenasPermitidos.replace(",", "."));
      if (!isNaN(numero)) {
        setValorRaw(numero);
      } else {
        setValorRaw(0);
      }
    } else {
      setValorRaw(0);
    }
  };

  // -------- handler do campo Taxa de Juros (%) --------
  const handleTaxaChange = (text: string) => {
    // permite dígitos, vírgula e ponto
    const limpo = text.replace(/[^0-9.,]/g, "");

    // substitui múltiplos pontos/vírgulas extras no final? vamos apenas aceitar livre,
    // e confiar no parseFloat(limpo.replace(",", ".")) depois.
    setTaxaJuros(limpo);
  };

  // -------- salvamento --------
  const handleSalvar = async () => {
    if (valorRaw <= 0) {
      Alert.alert("Erro", "O valor da entrada deve ser maior que zero.");
      return;
    }
    if (tipo === "parcelado" && (!parcelas || parseInt(parcelas, 10) <= 0)) {
      Alert.alert("Erro", "Preencha corretamente o número de parcelas.");
      return;
    }
    if (!grupoSelecionado) {
      Alert.alert("Erro", "Selecione um grupo.");
      return;
    }
    if (!categoria) {
      Alert.alert("Erro", "Selecione uma categoria.");
      return;
    }
    if (
      tipo === "parcelado" &&
      (!taxaJuros.trim() ||
        parseFloat(taxaJuros.replace(",", ".")) < 0)
    ) {
      Alert.alert(
        "Erro",
        "A taxa de juros é obrigatória para transações parceladas."
      );
      return;
    }

    try {
      setLoading(true);
      if (!usuarioId || !ipServidor)
        throw new Error(
          "Dados incompletos (usuário ou IP do servidor)."
        );

      const valorNumerico = valorRaw;
      const valorParcelaNumerico =
        tipo === "parcelado" && valorParcela
          ? parseFloat(valorParcela)
          : valorNumerico;

      const dataFimParcelas =
        tipo === "parcelado" ? dataTermino : data;

      // taxa de juros numérica pura
      const taxaJurosNumerica =
        tipo === "parcelado" && taxaJuros
          ? parseFloat(taxaJuros.replace(",", "."))
          : 0;

      // OBS: agora NÃO geramos descrição padrão automática.
      // Enviamos exatamente o que o usuário escreveu,
      // podendo ir string vazia.
      const descricaoFinal = descricao.trim();

      const body = {
        tipo,
        categoria,
        valor: valorNumerico,
        descricao: descricaoFinal,
        qtdeparc: tipo === "parcelado" ? parseInt(parcelas, 10) : 1,
        valorparc: valorParcelaNumerico,
        datafimparc: dataFimParcelas,
        chavepessoa: usuarioId,
        chavegrupo: grupoSelecionado,
        taxajuros: taxaJurosNumerica,
      };

      console.log("📤 Enviando dados para API /entrada:", body);

      const response = await fetch(`${ipServidor}/entrada`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const resposta = await response.json();

      if (!response.ok) {
        console.error("❌ Erro na resposta da API:", resposta);
        throw new Error(resposta.erro || "Erro ao inserir entrada");
      }

      // Monta transação para histórico local
      const novaTransacao: Transacao = {
        id: resposta.chave,
        valor: resposta.valor,
        tipo: resposta.tipo,
        categoria: resposta.categoria,
        descricao: resposta.descricao || "", // pode vir vazio
        data: resposta.datacad,
        taxajuros: resposta.taxajuros || 0,
      };

      const novaLista = [novaTransacao, ...transacoes];
      setTransacoes(novaLista);
      await salvarHistoricoLocal(novaLista);

      // limpar formulário
      setValorRaw(0);
      setValorExibicao("");
      setTipo("avista");
      setCategoria(
        categoriasDisponiveis.length > 0
          ? categoriasDisponiveis[0].nome_categoria
          : ""
      );
      setParcelas("");
      setValorParcela("");
      setDataTermino("");
      setDescricao("");
      setData(new Date().toISOString().slice(0, 10));
      setTaxaJuros("");

      Alert.alert("✅ Sucesso", "Entrada registrada com sucesso.");
    } catch (error: any) {
      Alert.alert("Erro", error.message || "Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  };

  // -------- item do histórico --------
  const renderItem = ({ item }: { item: Transacao }) => (
    <View
      style={[
        styles.card,
        {
          backgroundColor: tema.sectionBoxBackground,
          borderColor: tema.inputBorderColor,
        },
      ]}
    >
      <View style={styles.cardRow}>
        <Text
          style={[
            styles.cardType,
            {
              color: tema.textColor,
              backgroundColor: tema.inputBorderColor,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 5,
              overflow: "hidden",
            },
          ]}
        >
          {item.tipo === "parcelado" ? "Parcelado" : "À Vista"}
        </Text>

        <Text
          style={[styles.cardCategory, { color: tema.textColor }]}
          numberOfLines={1}
        >
          {item.categoria}
        </Text>

        <Text style={[styles.cardValue, { color: tema.linkColor }]}>
          {formatCurrency(item.valor)}
        </Text>
      </View>

      {/* Só mostra a observação se o usuário realmente escreveu algo */}
      {item.descricao?.trim() ? (
        <Text
          style={[
            styles.cardDescription,
            { color: tema.textSecondaryColor },
          ]}
        >
          {item.descricao}
        </Text>
      ) : null}

      {item.taxajuros && item.taxajuros > 0 ? (
        <Text
          style={[styles.cardDate, { color: tema.textSecondaryColor }]}
        >
          Taxa de Juros:{" "}
          {Number(item.taxajuros).toFixed(2).replace(".", ",")}%
        </Text>
      ) : null}

      <Text style={[styles.cardDate, { color: tema.textSecondaryColor }]}>
        {new Date(item.data).toLocaleDateString("pt-BR")}
      </Text>
    </View>
  );

  // -------- formulário --------
  function renderFormulario() {
    return (
      <>
        <Text style={[styles.label, { color: tema.textColor }]}>
          Grupo
        </Text>
        <View
          style={[
            styles.pickerContainer,
            {
              borderColor: tema.inputBorderColor,
              backgroundColor: tema.inputBackground,
            },
          ]}
        >
          <Picker
            selectedValue={grupoSelecionado}
            onValueChange={(itemValue) => setGrupoSelecionado(itemValue)}
            style={{ color: tema.textColor }}
            dropdownIconColor={tema.textColor}
          >
            {grupos.length > 0 ? (
              grupos.map((grupo) => (
                <Picker.Item
                  key={grupo.chave}
                  label={grupo.nome}
                  value={grupo.chave}
                />
              ))
            ) : (
              <Picker.Item
                label="Nenhum grupo disponível"
                value={null}
                enabled={false}
              />
            )}
          </Picker>
        </View>

        <TouchableOpacity
          onPress={carregarGrupos}
          style={[
            styles.botaoAtualizar,
            { backgroundColor: tema.buttonBackground },
          ]}
          disabled={!ipServidor || usuarioId === null}
        >
          <Text
            style={[styles.botaoTexto, { color: tema.buttonTextColor }]}
          >
            🔄 Atualizar Grupos
          </Text>
        </TouchableOpacity>

        <Text style={[styles.label, { color: tema.textColor }]}>
          Valor da Entrada (R$)
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              borderColor: tema.inputBorderColor,
              backgroundColor: tema.inputBackground,
              color: tema.textColor,
            },
          ]}
          keyboardType="numeric"
          placeholder="0,00"
          placeholderTextColor={tema.textSecondaryColor}
          value={valorExibicao}
          onChangeText={handleValorChange}
        />

        <Text style={[styles.label, { color: tema.textColor }]}>
          Data
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              borderColor: tema.inputBorderColor,
              backgroundColor: tema.inputBackground,
              color: tema.textColor,
            },
          ]}
          value={data}
          onChangeText={setData}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={tema.textSecondaryColor}
        />

        <Text style={[styles.label, { color: tema.textColor }]}>
          Tipo da Transação
        </Text>
        <View
          style={[
            styles.pickerContainer,
            {
              borderColor: tema.inputBorderColor,
              backgroundColor: tema.inputBackground,
            },
          ]}
        >
          <Picker
            selectedValue={tipo}
            onValueChange={(itemValue) => setTipo(itemValue)}
            style={{ color: tema.textColor }}
            dropdownIconColor={tema.textColor}
          >
            <Picker.Item label="À Vista" value="avista" />
            <Picker.Item label="Débito" value="debito" />
            <Picker.Item label="Crédito" value="credito" />
            <Picker.Item label="Parcelado" value="parcelado" />
          </Picker>
        </View>

        <Text style={[styles.label, { color: tema.textColor }]}>
          Categoria
        </Text>
        <View
          style={[
            styles.pickerContainer,
            {
              borderColor: tema.inputBorderColor,
              backgroundColor: tema.inputBackground,
            },
          ]}
        >
          <Picker
            selectedValue={categoria}
            onValueChange={(itemValue) => setCategoria(itemValue)}
            style={{ color: tema.textColor }}
            dropdownIconColor={tema.textColor}
          >
            {categoriasDisponiveis.length > 0 ? (
              categoriasDisponiveis.map((cat) => (
                <Picker.Item
                  key={cat.chave}
                  label={cat.nome_categoria}
                  value={cat.nome_categoria}
                />
              ))
            ) : (
              <Picker.Item
                label="Nenhuma categoria disponível"
                value=""
                enabled={false}
              />
            )}
          </Picker>
        </View>

        <TouchableOpacity
          onPress={carregarCategorias}
          style={[
            styles.botaoAtualizar,
            { backgroundColor: tema.buttonBackground },
          ]}
          disabled={!ipServidor || usuarioId === null}
        >
          <Text
            style={[styles.botaoTexto, { color: tema.buttonTextColor }]}
          >
            🔄 Atualizar Categorias
          </Text>
        </TouchableOpacity>

        {tipo === "parcelado" && (
          <>
            <Text style={[styles.label, { color: tema.textColor }]}>
              Parcelas
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: tema.inputBorderColor,
                  backgroundColor: tema.inputBackground,
                  color: tema.textColor,
                },
              ]}
              keyboardType="numeric"
              placeholder="Número de parcelas"
              placeholderTextColor={tema.textSecondaryColor}
              value={parcelas}
              onChangeText={setParcelas}
            />

            <Text style={[styles.label, { color: tema.textColor }]}>
              Taxa de Juros (%)
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: tema.inputBorderColor,
                  backgroundColor: tema.inputBackground,
                  color: tema.textColor,
                },
              ]}
              keyboardType="numeric"
              placeholder="Ex: 1,50"
              placeholderTextColor={tema.textSecondaryColor}
              value={taxaJuros}
              onChangeText={handleTaxaChange}
            />

            <Text style={[styles.label, { color: tema.textColor }]}>
              Valor por Parcela
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: tema.sectionBoxBackground,
                  color: tema.textColor,
                  opacity: 0.7,
                },
              ]}
              editable={false}
              value={
                valorParcela
                  ? formatCurrency(parseFloat(valorParcela))
                  : formatCurrency(0)
              }
            />

            <Text style={[styles.label, { color: tema.textColor }]}>
              Fim do Parcelamento
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: tema.sectionBoxBackground,
                  color: tema.textColor,
                  opacity: 0.7,
                },
              ]}
              editable={false}
              value={dataTermino}
            />
          </>
        )}

        <Text style={[styles.label, { color: tema.textColor }]}>
          Descrição (opcional)
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              borderColor: tema.inputBorderColor,
              backgroundColor: tema.inputBackground,
              color: tema.textColor,
              minHeight: 80,
            },
          ]}
          value={descricao}
          onChangeText={setDescricao}
          placeholder="Ex: Salário do mês, Venda de item"
          placeholderTextColor={tema.textSecondaryColor}
          multiline
          numberOfLines={4}
        />

        <TouchableOpacity
          style={[styles.botaoSalvar, { backgroundColor: tema.linkColor }]}
          onPress={handleSalvar}
          disabled={
            loading ||
            !ipServidor ||
            grupoSelecionado === null ||
            !categoria ||
            valorRaw <= 0
          }
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.botaoTexto}>Salvar Entrada</Text>
          )}
        </TouchableOpacity>
      </>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: tema.backgroundColor }}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={tema.linkColor} />
          <Text style={[styles.loadingText, { color: tema.textColor }]}>
            Carregando...
          </Text>
        </View>
      )}

      <View style={styles.headerContainer}>
        <Text style={[styles.headerTitle, { color: tema.textColor }]}>
          Movimentação de Entrada
        </Text>

        <TouchableOpacity
          onPress={() => setShowValues(!showValues)}
          style={styles.toggleVisibilityButton}
        >
          {showValues ? (
            <Feather name="eye" size={24} color={tema.textColor} />
          ) : (
            <Feather name="eye-off" size={24} color={tema.textColor} />
          )}
        </TouchableOpacity>
      </View>

      <View style={{ padding: 24, paddingBottom: 100 }}>
        {renderFormulario()}

        <Text
          style={[
            styles.label,
            {
              color: tema.textColor,
              textAlign: "center",
              marginTop: 30,
              fontSize: 18,
            },
          ]}
        >
          Histórico de Entradas
        </Text>

        {transacoes.length > 0 ? (
          transacoes.map((item, index) => (
            <View key={item.id || index} style={{ marginTop: 10 }}>
              {renderItem({ item })}
            </View>
          ))
        ) : (
          <Text
            style={[styles.noDataText, { color: tema.textSecondaryColor }]}
          >
            Nenhuma entrada registrada.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 16, fontWeight: "bold", marginTop: 16, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
    overflow: "hidden",
    justifyContent: "center",
    height: 50,
  },
  botaoAtualizar: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  botaoSalvar: {
    marginTop: 30,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  botaoTexto: { fontSize: 16, fontWeight: "bold", color: "#fff" },
  card: {
    padding: 16,
    borderRadius: 10,
    marginVertical: 6,
    borderWidth: 1,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  cardType: {
    fontSize: 14,
    fontWeight: "bold",
    backgroundColor: "#e0e0e0",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    overflow: "hidden",
  },
  cardCategory: {
    fontSize: 14,
    flex: 1,
    textAlign: "center",
    marginHorizontal: 5,
  },
  cardValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  cardDescription: {
    fontSize: 13,
    marginTop: 5,
  },
  cardDate: {
    fontSize: 12,
    textAlign: "right",
    marginTop: 5,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    paddingBottom: 0,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
  },
  toggleVisibilityButton: {
    padding: 5,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  noDataText: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
  },
});
