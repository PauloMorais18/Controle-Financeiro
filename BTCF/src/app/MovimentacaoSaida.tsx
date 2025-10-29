import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useTheme } from "./ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";

// --- Tipos ---
type Transacao = {
  id: number;
  valor: number;        // total da transação (não apenas parcela)
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

interface ErrorResponse {
  erro: string;
}

export default function MovimentacaoSaida() {
  const { tema } = useTheme();

  // ----- Estados de formulário -----
  const [valorRaw, setValorRaw] = useState<number>(0); // valor digitado bruto
  const [valorExibicao, setValorExibicao] = useState<string>(""); // texto que o usuário vê
  const [taxaJuros, setTaxaJuros] = useState<string>(""); // texto "10,5"
  const [tipo, setTipo] = useState<string>("avista");
  const [categoria, setCategoria] = useState<string>("");
  const [parcelas, setParcelas] = useState<string>("");
  const [valorParcela, setValorParcela] = useState<string>(""); // parcela calculada
  const [dataTermino, setDataTermino] = useState<string>("");
  const [data, setData] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [descricao, setDescricao] = useState<string>("");

  // ----- Auxiliares -----
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [grupos, setGrupos] = useState<any[]>([]);
  const [grupoSelecionado, setGrupoSelecionado] = useState<number | null>(null);

  const CHAVE_HISTORICO = "historico_saidas";

  const [ipServidor, setIpServidor] = useState<string | null>(null);
  const [usuarioId, setUsuarioId] = useState<number | null>(null);

  const [categoriasDisponiveis, setCategoriasDisponiveis] = useState<
    Categoria[]
  >([]);

  const [showValues, setShowValues] = useState(true);
  const [networkError, setNetworkError] = useState<string | null>(null);

  // ----- formatação de moeda pro card -----
  const formatCurrency = useCallback(
    (value: number | null | undefined): string => {
      if (
        value === null ||
        value === undefined ||
        isNaN(value) ||
        !Number.isFinite(value)
      ) {
        value = 0;
      }
      if (!showValues) {
        return "R$ *****";
      }
      return `R$ ${value.toFixed(2).replace(".", ",")}`;
    },
    [showValues]
  );

  // ----- carregar config inicial -----
  const loadConfig = useCallback(async () => {
    setLoading(true);
    setNetworkError(null);
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
      setNetworkError(
        `Não foi possível obter as configurações iniciais. Detalhes: ${err.message}`
      );
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

  // ----- carregar grupos -----
  const carregarGrupos = useCallback(async () => {
    if (!ipServidor || usuarioId === null) {
      return;
    }
    setNetworkError(null);
    try {
      const gruposRes = await fetch(
        `${ipServidor}/grupo/usuario/${usuarioId}`
      );
      if (!gruposRes.ok)
        throw new Error(
          `Erro ao buscar grupos: ${gruposRes.statusText || gruposRes.status}`
        );
      const lista = await gruposRes.json();
      setGrupos(lista);

      const grupoSalvo = await AsyncStorage.getItem("grupoSelecionado");
      const grupoValido =
        grupoSalvo &&
        lista.some(
          (g: any) => g.chave === parseInt(grupoSalvo as string, 10)
        );
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
      setNetworkError(
        `Não foi possível carregar os grupos. Verifique o IP e a conexão. Detalhes: ${err.message}`
      );
      Alert.alert(
        "Erro ao carregar grupos",
        err.message || "Erro desconhecido."
      );
    }
  }, [ipServidor, usuarioId]);

  // ----- carregar categorias de saída -----
  const carregarCategorias = useCallback(async () => {
    if (!ipServidor || usuarioId === null) return;
    setNetworkError(null);
    try {
      const response = await fetch(
        `${ipServidor}/categorias/${usuarioId}/saida`
      );
      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();
        throw new Error(
          errorData.erro ||
            `Erro ao buscar categorias de saída: ${response.statusText || response.status}`
        );
      }
      const data: Categoria[] = await response.json();
      setCategoriasDisponiveis(data);
      if (data.length > 0) {
        setCategoria(data[0].nome_categoria);
      } else {
        setCategoria("");
      }
    } catch (err: any) {
      console.error("Erro ao carregar categorias de saída:", err.message);
      setNetworkError(
        `Não foi possível carregar as categorias de saída. Verifique o IP e a conexão. Detalhes: ${err.message}`
      );
      Alert.alert(
        "Erro",
        "Não foi possível carregar as categorias de saída personalizadas."
      );
    }
  }, [ipServidor, usuarioId]);

  useEffect(() => {
    if (ipServidor && usuarioId !== null) {
      carregarGrupos();
      carregarCategorias();
    }
  }, [ipServidor, usuarioId, carregarGrupos, carregarCategorias]);

  // ----- carregar histórico quando tudo estiver pronto -----
  useEffect(() => {
    if (ipServidor && usuarioId !== null && grupoSelecionado !== null) {
      carregarHistoricoDoServidor();
    }
  }, [ipServidor, usuarioId, grupoSelecionado]);

  const carregarHistoricoDoServidor = async () => {
    try {
      const chavepessoa = await AsyncStorage.getItem("usuarioId");
      if (!chavepessoa || !ipServidor) {
        throw new Error("Dados de autenticação ausentes.");
      }
      setNetworkError(null);

      const res = await fetch(
        `${ipServidor}/saida?chavepessoa=${chavepessoa}`
      );

      if (!res.ok) {
        const errorData: ErrorResponse = await res.json();
        throw new Error(
          errorData.erro ||
            `Erro ao buscar histórico: ${res.statusText || res.status}`
        );
      }

      const lista: any[] = await res.json();

      const dadosComCategoria: Transacao[] = lista.map((item) => {
        // tentar extrair o valor real
        // prioridade:
        // 1. item.valor (se válido e >0)
        // 2. item.valorparc * item.qtdeparc (se existir)
        // 3. fallback 0
        let valorCalculado = 0;

        const valorDireto =
          typeof item.valor === "number"
            ? item.valor
            : parseFloat(
                String(item.valor ?? "").replace(",", ".")
              );

        if (!isNaN(valorDireto) && valorDireto > 0) {
          valorCalculado = valorDireto;
        } else {
          const vp =
            typeof item.valorparc === "number"
              ? item.valorparc
              : parseFloat(
                  String(item.valorparc ?? "").replace(",", ".")
                );
          const qtd = parseInt(String(item.qtdeparc ?? "0"), 10);
          if (!isNaN(vp) && vp > 0 && !isNaN(qtd) && qtd > 0) {
            valorCalculado = vp * qtd;
          }
        }

        return {
          id: item.id || item.chave,
          valor: isNaN(valorCalculado) ? 0 : valorCalculado,
          tipo: item.tipo || "",
          categoria: item.categoria || "Não Definida",
          descricao: item.descricao || "",
          data:
            item.data ||
            item.datacad ||
            new Date().toISOString().slice(0, 10),
          taxajuros: item.taxajuros || 0,
        };
      });

      setTransacoes(dadosComCategoria);
      await salvarHistoricoLocal(dadosComCategoria);
    } catch (e: any) {
      console.error("Erro ao buscar saídas:", e.message);
      setNetworkError(
        `Não foi possível carregar o histórico de saídas. Verifique o IP e a conexão. Detalhes: ${e.message}`
      );
    }
  };

  const salvarHistoricoLocal = async (lista: Transacao[]) => {
    try {
      await AsyncStorage.setItem(
        CHAVE_HISTORICO,
        JSON.stringify(lista)
      );
    } catch (e) {
      console.error("Erro ao salvar histórico local:", e);
    }
  };

  // ----- recálculo de parcela e término -----
  useEffect(() => {
    if (tipo === "parcelado" && valorRaw > 0 && parcelas) {
      const qtd = parseInt(parcelas, 10);
      const val = valorRaw;
      const jurosFloat = taxaJuros
        ? parseFloat(taxaJuros.replace(",", "."))
        : 0;
      const juros = jurosFloat > 0 ? jurosFloat / 100 : 0;

      if (!isNaN(qtd) && qtd > 0 && !isNaN(val)) {
        const valorTotalComJuros = val * (1 + juros);
        setValorParcela(
          (valorTotalComJuros / qtd).toFixed(2)
        );

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

  // ----- handler de valor digitado -----
  const handleValorChange = (text: string) => {
    const raw = text.replace(/[^0-9,]/g, ""); // só dígitos e vírgula
    setValorExibicao(raw);

    if (raw.trim() !== "") {
      const numero = parseFloat(raw.replace(",", "."));
      if (!isNaN(numero)) {
        setValorRaw(numero);
      } else {
        setValorRaw(0);
      }
    } else {
      setValorRaw(0);
    }
  };

  // ----- handler da taxa de juros -----
  const handleTaxaChange = (text: string) => {
    const numericText = text.replace(/[^0-9.,]/g, "");
    setTaxaJuros(numericText);
  };

  // ----- salvar saída -----
  const handleSalvar = async () => {
    if (valorRaw <= 0) {
      Alert.alert(
        "Erro",
        "O valor da saída deve ser maior que zero."
      );
      return;
    }
    if (
      tipo === "parcelado" &&
      (!parcelas || parseInt(parcelas, 10) <= 0)
    ) {
      Alert.alert(
        "Erro",
        "Preencha corretamente o número de parcelas."
      );
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
      (tipo === "credito" || tipo === "parcelado") &&
      (!taxaJuros.trim() ||
        parseFloat(taxaJuros.replace(",", ".")) < 0)
    ) {
      Alert.alert(
        "Erro",
        "A taxa de juros é obrigatória para transações a crédito ou parceladas."
      );
      return;
    }

    try {
      setLoading(true);
      setNetworkError(null);

      if (!usuarioId || !ipServidor)
        throw new Error(
          "Dados incompletos (usuário ou IP do servidor)."
        );

      // valor total considerado para histórico local:
      // se parcelado, multiplica parcela calculada pela qtd
      // senão, é o valorRaw
      let valorFinalDaTransacao = valorRaw;

      if (tipo === "parcelado") {
        const qtd = parseInt(parcelas, 10);
        const parcelaFloat = valorParcela
          ? parseFloat(valorParcela)
          : 0;
        if (!isNaN(qtd) && qtd > 0 && !isNaN(parcelaFloat)) {
          valorFinalDaTransacao = parcelaFloat * qtd;
        }
      }

      const valorParcelaNumerico =
        tipo === "parcelado" && valorParcela
          ? parseFloat(valorParcela)
          : valorRaw;

      const dataFimParcelas =
        tipo === "parcelado"
          ? dataTermino
          : data.toISOString().slice(0, 10);

      const taxaNumerica =
        tipo === "credito" || tipo === "parcelado"
          ? parseFloat(taxaJuros.replace(",", ".") || "0")
          : 0;

      const descricaoFinal = descricao.trim();

      const body = {
        tipo,
        categoria,
        valor: valorRaw,
        descricao: descricaoFinal, // só observação do usuário
        qtdeparc: tipo === "parcelado" ? parseInt(parcelas, 10) : 1,
        valorparc: valorParcelaNumerico,
        datafimparc: dataFimParcelas,
        chavepessoa: usuarioId,
        chavegrupo: grupoSelecionado,
        taxajuros: taxaNumerica,
      };

      console.log("📤 Enviando dados para API /saida:", body);

      const response = await fetch(`${ipServidor}/saida`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const resposta = await response.json();
      if (!response.ok) {
        console.error("❌ Erro na resposta da API:", resposta);
        throw new Error(
          resposta.erro ||
            `Erro ao inserir saída: ${response.statusText || response.status}`
        );
      }

      // usamos valorFinalDaTransacao calculado aqui,
      // ignorando resposta.valor caso venha 0
      const novaTransacao: Transacao = {
        id: resposta.chave,
        valor: valorFinalDaTransacao,
        tipo: resposta.tipo,
        categoria: resposta.categoria,
        descricao: resposta.descricao || "",
        data: resposta.datacad,
        taxajuros: resposta.taxajuros || 0,
      };

      const novaLista = [novaTransacao, ...transacoes];
      setTransacoes(novaLista);
      await salvarHistoricoLocal(novaLista);

      // limpar form
      setValorRaw(0);
      setValorExibicao("");
      setTaxaJuros("");
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
      setData(new Date());

      Alert.alert("✅ Sucesso", "Saída registrado com sucesso.");
    } catch (error: any) {
      console.error("Erro ao salvar saída:", error);
      setNetworkError(
        `Não foi possível salvar a saída. Verifique o IP e a conexão. Detalhes: ${error.message}`
      );
      Alert.alert("Erro", error.message || "Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  };

  // ----- DatePicker -----
  const onChangeDate = (event: any, selectedDate: Date | undefined) => {
    const currentDate = selectedDate || data;
    setShowDatePicker(Platform.OS === "ios");
    setData(currentDate);
  };
  const showMode = () => {
    setShowDatePicker(true);
  };

  // ----- item do histórico -----
  const renderItem = (item: Transacao) => (
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
          {item.tipo === "parcelado"
            ? "Parcelado"
            : item.tipo === "credito"
            ? "Crédito"
            : item.tipo === "debito"
            ? "Débito"
            : "À Vista"}
        </Text>
        <Text
          style={[styles.cardCategory, { color: tema.textColor }]}
          numberOfLines={1}
        >
          {item.categoria}
        </Text>
        <Text style={[styles.cardValue, { color: "#e53935" }]}>
          {formatCurrency(item.valor)}
        </Text>
      </View>

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

      {item.taxajuros !== undefined && item.taxajuros > 0 ? (
        <Text
          style={[styles.cardDate, { color: tema.textSecondaryColor }]}
        >
          Taxa de Juros:{" "}
          {Number(item.taxajuros)
            .toFixed(2)
            .replace(".", ",")}
          %
        </Text>
      ) : null}

      <Text style={[styles.cardDate, { color: tema.textSecondaryColor }]}>
        {new Date(item.data).toLocaleDateString("pt-BR")}
      </Text>
    </View>
  );

  // ----- formulário -----
  const renderFormulario = () => (
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
          onValueChange={(itemValue) =>
            setGrupoSelecionado(itemValue)
          }
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
        Valor da Saída (R$)
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
      <TouchableOpacity onPress={showMode}>
        <TextInput
          style={[
            styles.input,
            {
              borderColor: tema.inputBorderColor,
              backgroundColor: tema.inputBackground,
              color: tema.textColor,
            },
          ]}
          value={data.toLocaleDateString("pt-BR")}
          editable={false}
          placeholder="DD/MM/AAAA"
          placeholderTextColor={tema.textSecondaryColor}
        />
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={data}
          mode="date"
          display="default"
          onChange={onChangeDate}
        />
      )}

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
          onValueChange={setTipo}
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
          onValueChange={(itemValue) =>
            setCategoria(itemValue)
          }
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

      {(tipo === "credito" || tipo === "parcelado") && (
        <>
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
            placeholder="Ex: 2,50"
            placeholderTextColor={tema.textSecondaryColor}
            value={taxaJuros}
            onChangeText={handleTaxaChange}
          />
        </>
      )}

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
            height: 80,
          },
        ]}
        value={descricao}
        onChangeText={setDescricao}
        placeholder="Ex: Aluguel, Supermercado, Cinema"
        placeholderTextColor={tema.textSecondaryColor}
        multiline
        numberOfLines={3}
      />

      <TouchableOpacity
        style={[
          styles.botaoSalvar,
          { backgroundColor: tema.linkColor },
        ]}
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
          <Text style={styles.botaoTexto}>Salvar Saída</Text>
        )}
      </TouchableOpacity>
    </>
  );

  // ----- render principal -----
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tema.backgroundColor }}
    >
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={tema.linkColor} />
          <Text
            style={[styles.loadingText, { color: tema.textColor }]}
          >
            Carregando...
          </Text>
        </View>
      )}

      {networkError && (
        <View
          style={[
            styles.errorContainer,
            { backgroundColor: tema.sectionBoxBackground },
          ]}
        >
          <Text style={[styles.errorText, { color: "red" }]}>
            {networkError}
          </Text>
          <Text
            style={[styles.errorHint, { color: tema.textColor }]}
          >
            Verifique se o seu servidor backend está rodando e se o IP
            configurado no aplicativo está correto. Para emuladores
            Android, o IP geralmente é "http://10.0.2.2:3000". Para iOS,
            "http://localhost:3000".
          </Text>
        </View>
      )}

      <View style={styles.headerContainer}>
        <Text
          style={[styles.headerTitle, { color: tema.textColor }]}
        >
          Movimentação de Saída
        </Text>
        <TouchableOpacity
          onPress={() => setShowValues(!showValues)}
          style={styles.toggleVisibilityButton}
        >
          {showValues ? (
            <Feather
              name="eye"
              size={24}
              color={tema.textColor}
            />
          ) : (
            <Feather
              name="eye-off"
              size={24}
              color={tema.textColor}
            />
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
          Histórico de Saídas
        </Text>

        {transacoes.length > 0 ? (
          transacoes.map((item, index) => (
            <View
              key={item.id || index}
              style={{ marginTop: 10 }}
            >
              {renderItem(item)}
            </View>
          ))
        ) : (
          <Text
            style={[
              styles.noDataText,
              { color: tema.textSecondaryColor },
            ]}
          >
            Nenhuma saída registrada.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

// ----- estilos -----
const styles = StyleSheet.create({
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
  errorContainer: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "red",
  },
  errorText: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  errorHint: {
    fontSize: 14,
  },
});
