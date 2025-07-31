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
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useTheme } from "./ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from '@expo/vector-icons'; // Importa ícones de olho aberto e fechado

// --- Definições de Tipo para TypeScript ---
type Transacao = {
  id: number;
  valor: number;
  tipo: string; // Tipo de transação (avista, parcelado, etc.)
  categoria: string; // Categoria da transação
  descricao: string;
  data: string;
};

// Interface para a categoria retornada do backend (compartilhada com MovimentacaoEntrada)
interface Categoria {
  chave: number;
  nome_categoria: string;
  tipo_transacao: 'entrada' | 'saida';
  chaveusuario: number;
}

export default function MovimentacaoSaida() {
  const { tema } = useTheme();
  const [valorRaw, setValorRaw] = useState<string>(""); // Valor bruto para cálculo
  const [valorExibicao, setValorExibicao] = useState<string>("0,00"); // Valor formatado para exibição
  const [tipo, setTipo] = useState<string>("avista");
  const [categoria, setCategoria] = useState<string>(""); // Estado para a categoria selecionada
  const [parcelas, setParcelas] = useState<string>("");
  const [valorParcela, setValorParcela] = useState<string>("");
  const [dataTermino, setDataTermino] = useState<string>("");
  const [data, setData] = useState<string>(new Date().toISOString().slice(0, 10));
  const [descricao, setDescricao] = useState<string>("");
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [grupos, setGrupos] = useState<any[]>([]);
  const [grupoSelecionado, setGrupoSelecionado] = useState<number | null>(null);

  const CHAVE_HISTORICO = "historico_saidas";

  // Estados para o IP do servidor e ID do usuário (carregados do AsyncStorage)
  const [ipServidor, setIpServidor] = useState<string | null>(null);
  const [usuarioId, setUsuarioId] = useState<number | null>(null);

  // Estado para as categorias de saída disponíveis (carregadas do backend)
  const [categoriasDisponiveis, setCategoriasDisponiveis] = useState<Categoria[]>([]);

  // Novo estado para controlar a visibilidade dos valores
  const [showValues, setShowValues] = useState(true);
  const [networkError, setNetworkError] = useState<string | null>(null); // Novo estado para erros de rede

  // Função para formatar valores monetários (com ou sem asteriscos)
  const formatCurrency = useCallback((value: any): string => {
    if (value === null || value === undefined) {
      return "R$ 0,00";
    }

    let numericValue: number;

    if (typeof value === 'string') {
      numericValue = parseFloat(value.replace(',', '.'));
    } else if (typeof value === 'number') {
      numericValue = value;
    } else {
      numericValue = 0; // Define como 0 para null, undefined ou outros tipos inesperados
    }

    if (isNaN(numericValue) || !Number.isFinite(numericValue)) {
      numericValue = 0; // Garante que seja um número finito válido
    }

    if (!showValues) {
      return "R$ *****";
    }

    return `R$ ${numericValue.toFixed(2).replace('.', ',')}`;
  }, [showValues]);

  // Função para carregar o IP do servidor e o ID do usuário
  const loadConfig = useCallback(async () => {
    setLoading(true); // Inicia loading ao carregar configs
    setNetworkError(null); // Limpa erros de rede anteriores
    try {
      const storedIp = await AsyncStorage.getItem("ipServidor");
      if (storedIp) {
        setIpServidor(storedIp);
      } else {
        Alert.alert("Erro", "IP do servidor não configurado. Por favor, configure o IP na tela de configurações.");
        setLoading(false);
        return;
      }

      const userEmail = await AsyncStorage.getItem("usuarioEmail");
      if (userEmail && storedIp) {
        const userRes = await fetch(`${storedIp}/usuario/por-email/${userEmail}`);
        if (userRes.ok) {
          const userData = await userRes.json();
          setUsuarioId(userData.chave);
          await AsyncStorage.setItem("usuarioId", String(userData.chave));
        } else {
          Alert.alert("Erro", "Não foi possível obter o ID do usuário. Faça login novamente.");
          setLoading(false);
          return;
        }
      } else {
        Alert.alert("Erro", "ID do usuário ou Email não encontrado. Por favor, faça login novamente.");
        setLoading(false);
        return;
      }
    } catch (err: any) {
      console.error("Erro ao carregar configurações:", err.message);
      setNetworkError(`Não foi possível obter as configurações iniciais. Detalhes: ${err.message}`);
      Alert.alert("Erro", "Não foi possível obter as configurações iniciais.");
    } finally {
      setLoading(false); // Finaliza loading após carregar configs
    }
  }, []);

  // Carrega configurações iniciais ao montar o componente
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Função para carregar grupos do backend
  const carregarGrupos = useCallback(async () => {
    if (!ipServidor || usuarioId === null) {
      return;
    }
    setNetworkError(null); // Limpa erros de rede anteriores
    try {
      const gruposRes = await fetch(`${ipServidor}/grupo/usuario/${usuarioId}`);
      if (!gruposRes.ok) throw new Error(`Erro ao buscar grupos: ${gruposRes.statusText || gruposRes.status}`);
      const lista = await gruposRes.json();
      setGrupos(lista);

      const grupoSalvo = await AsyncStorage.getItem("grupoSelecionado");
      const grupoValido = grupoSalvo && lista.some((g: any) => g.chave === parseInt(grupoSalvo));
      const grupoId = grupoValido ? parseInt(grupoSalvo!) : lista[0]?.chave;

      if (!grupoId) {
        Alert.alert("Atenção", "Você ainda não faz parte de nenhum grupo.");
        return;
      }
      setGrupoSelecionado(grupoId);
    } catch (err: any) {
      console.error("Erro ao carregar grupos:", err);
      setNetworkError(`Não foi possível carregar os grupos. Verifique o IP e a conexão. Detalhes: ${err.message}`);
      Alert.alert("Erro ao carregar grupos", err.message || "Erro desconhecido.");
    }
  }, [ipServidor, usuarioId]);

  // Função para carregar categorias de SAÍDA do backend
  const carregarCategorias = useCallback(async () => {
    if (!ipServidor || usuarioId === null) {
      return;
    }
    setNetworkError(null); // Limpa erros de rede anteriores
    try {
      // Busca categorias do tipo 'saida'
      const response = await fetch(`${ipServidor}/categorias/${usuarioId}/saida`);
      const data: Categoria[] = await response.json();
      if (response.ok) {
        setCategoriasDisponiveis(data);
        // Define a primeira categoria como padrão se houver categorias
        if (data.length > 0) {
          setCategoria(data[0].nome_categoria);
        } else {
          setCategoria(""); // Nenhuma categoria disponível
        }
      } else {
        throw new Error(data.erro || `Erro ao buscar categorias de saída: ${response.statusText || response.status}`);
      }
    } catch (err: any) {
      console.error("Erro ao carregar categorias de saída:", err.message);
      setNetworkError(`Não foi possível carregar as categorias de saída. Verifique o IP e a conexão. Detalhes: ${err.message}`);
      Alert.alert("Erro", "Não foi possível carregar as categorias de saída personalizadas.");
    }
  }, [ipServidor, usuarioId]);

  // Carrega grupos e categorias quando IP e usuárioId estão disponíveis
  useEffect(() => {
    if (ipServidor && usuarioId !== null) {
      carregarGrupos();
      carregarCategorias();
    }
  }, [ipServidor, usuarioId, carregarGrupos, carregarCategorias]);

  // Carrega histórico do servidor após IP, usuarioId e grupo serem definidos
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
      setNetworkError(null); // Limpa erros de rede anteriores

      const res = await fetch(`${ipServidor}/saida?chavepessoa=${chavepessoa}`);
      const lista: any[] = await res.json(); // Use any[] para flexibilidade na resposta da API

      if (!res.ok) throw new Error(lista.erro || `Erro ao buscar histórico: ${res.statusText || res.status}`);

      const dadosComCategoria: Transacao[] = lista.map(item => ({
        id: item.id || item.chave,
        valor: typeof item.valor === 'number' ? item.valor : parseFloat(String(item.valor || '0').replace(',', '.')),
        tipo: item.tipo || '',
        categoria: item.categoria || "Não Definida",
        descricao: item.descricao || '',
        data: item.data || item.datacad || new Date().toISOString().slice(0, 10),
      }));
      setTransacoes(dadosComCategoria);
      await salvarHistoricoLocal(dadosComCategoria);
    } catch (e: any) {
      console.error("Erro ao buscar saídas:", e.message);
      setNetworkError(`Não foi possível carregar o histórico de saídas. Verifique o IP e a conexão. Detalhes: ${e.message}`);
    }
  };

  const salvarHistoricoLocal = async (lista: Transacao[]) => {
    try {
      await AsyncStorage.setItem(CHAVE_HISTORICO, JSON.stringify(lista));
    } catch (e) {
      console.error("Erro ao salvar histórico local:", e);
    }
  };

  useEffect(() => {
    if (tipo === "parcelado" && valorRaw && parcelas) {
      const qtd = parseInt(parcelas);
      const val = parseFloat(valorRaw.replace(',', '.')); // Valor total
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

  // Atualiza o valor de exibição quando valorRaw muda
  useEffect(() => {
    setValorExibicao(formatarComoMoeda(valorRaw));
  }, [valorRaw]);

  const formatarComoMoeda = (texto: string) => {
    const numeros = texto.replace(/\D/g, "");
    const inteiro = numeros.padStart(3, "0");
    const valorNumerico = (parseInt(inteiro, 10) / 100).toFixed(2);
    return valorNumerico.replace(".", ",");
  };

  const gerarDescricaoPadrao = (tipo: string, categoria: string, valorFormatado: string) =>
    `Gasto ${categoria} ${tipo === "parcelado" ? "parcelado" : "à vista"} de R$ ${valorFormatado}`;

  const handleSalvar = async () => {
    if (!valorRaw || parseFloat(valorRaw.replace(',', '.')) <= 0) {
      Alert.alert("Erro", "O valor da saída deve ser maior que zero.");
      return;
    }
    if (tipo === "parcelado" && (!parcelas || parseInt(parcelas) <= 0)) {
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

    try {
      setLoading(true);
      setNetworkError(null); // Limpa erros de rede anteriores
      if (!usuarioId || !ipServidor) throw new Error("Dados incompletos (usuário ou IP do servidor).");

      const valorNumerico = parseFloat(valorRaw.replace(',', '.')); // Valor total
      const valorParcelaNumerico = tipo === "parcelado" && valorParcela ? parseFloat(valorParcela.replace(',', '.')) : valorNumerico;
      const dataFimParcelas = tipo === "parcelado" ? dataTermino : data;
      const valorFormatado = formatarComoMoeda(valorRaw);

      const body = {
        tipo,
        categoria, // Envia a categoria para o backend
        valor: valorNumerico,
        descricao: descricao.trim() || gerarDescricaoPadrao(tipo, categoria, valorFormatado),
        qtdeparc: tipo === "parcelado" ? parseInt(parcelas) : 1,
        valorparc: valorParcelaNumerico,
        datafimparc: dataFimParcelas,
        chavepessoa: usuarioId, // Já é um number aqui
        chavegrupo: grupoSelecionado,
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
        throw new Error(resposta.erro || `Erro ao inserir saída: ${response.statusText || response.status}`);
      }

      const novaTransacao: Transacao = {
        id: resposta.chave,
        valor: resposta.valor,
        tipo: resposta.tipo,
        categoria: resposta.categoria, // Certifique-se de que o backend retorna a categoria
        descricao: resposta.descricao,
        data: resposta.datacad,
      };

      const novaLista = [novaTransacao, ...transacoes];
      setTransacoes(novaLista);
      await salvarHistoricoLocal(novaLista);

      // Limpar formulário
      setValorRaw("");
      setValorExibicao("0,00");
      setTipo("avista");
      setCategoria(categoriasDisponiveis.length > 0 ? categoriasDisponiveis[0].nome_categoria : ""); // Resetar para a primeira categoria disponível
      setParcelas("");
      setValorParcela("");
      setDataTermino("");
      setDescricao("");
      setData(new Date().toISOString().slice(0, 10));

      Alert.alert("✅ Sucesso", "Saída registrada com sucesso.");
    } catch (error: any) {
      console.error("Erro ao salvar saída:", error);
      setNetworkError(`Não foi possível salvar a saída. Verifique o IP e a conexão. Detalhes: ${error.message}`);
      Alert.alert("Erro", error.message || "Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  };

  const renderItem = (item: Transacao) => (
    <View style={[styles.card, { backgroundColor: tema.sectionBoxBackground, borderColor: tema.inputBorderColor }]}>
      <View style={styles.cardRow}>
        <Text style={[styles.cardType, { color: tema.textColor }]}>
          {item.tipo === 'parcelado' ? 'Parcelado' : 'À Vista'}
        </Text>
        <Text style={[styles.cardCategory, { color: tema.textColor }]}>
          {item.categoria}
        </Text>
        <Text style={[styles.cardValue, { color: '#e53935' }]}> {/* Cor vermelha para saídas */}
          {formatCurrency(item.valor)}
        </Text>
      </View>
      <Text style={[styles.cardDescription, { color: tema.textSecondaryColor }]}>
        {item.descricao}
      </Text>
      <Text style={[styles.cardDate, { color: tema.textSecondaryColor }]}>
        {new Date(item.data).toLocaleDateString("pt-BR")}
      </Text>
    </View>
  );

  // FORMULÁRIO
  const renderFormulario = () => (
    <>
      <Text style={[styles.label, { color: tema.textColor }]}>Grupo</Text>
      <View style={[styles.pickerContainer, { borderColor: tema.inputBorderColor, backgroundColor: tema.inputBackground }]}>
        <Picker
          selectedValue={grupoSelecionado}
          onValueChange={(itemValue) => setGrupoSelecionado(itemValue)}
          style={{ color: tema.textColor }}
          dropdownIconColor={tema.textColor}
        >
          {grupos.length > 0 ? (
            grupos.map((grupo) => (
              <Picker.Item key={grupo.chave} label={grupo.nome} value={grupo.chave} />
            ))
          ) : (
            <Picker.Item label="Nenhum grupo disponível" value={null} enabled={false} />
          )}
        </Picker>
      </View>

      <TouchableOpacity
        onPress={carregarGrupos}
        style={[styles.botaoAtualizar, { backgroundColor: tema.buttonBackground }]}
        disabled={!ipServidor || usuarioId === null}
      >
        <Text style={[styles.botaoTexto, { color: tema.buttonTextColor }]}>🔄 Atualizar Grupos</Text>
      </TouchableOpacity>

      <Text style={[styles.label, { color: tema.textColor }]}>Valor da Saída (R$)</Text>
      <TextInput
        style={[styles.input, {
          borderColor: tema.inputBorderColor,
          backgroundColor: tema.inputBackground,
          color: tema.textColor,
        }]}
        keyboardType="numeric"
        placeholder="0,00"
        placeholderTextColor={tema.textSecondaryColor}
        value={valorExibicao}
        onChangeText={(text) => {
          const raw = text.replace(/\D/g, "");
          setValorRaw(raw);
        }}
      />

      <Text style={[styles.label, { color: tema.textColor }]}>Data</Text>
      <TextInput
        style={[styles.input, {
          borderColor: tema.inputBorderColor,
          backgroundColor: tema.inputBackground,
          color: tema.textColor,
        }]}
        value={data}
        onChangeText={setData}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={tema.textSecondaryColor}
      />

      <Text style={[styles.label, { color: tema.textColor }]}>Tipo da Transação</Text>
      <View style={[styles.pickerContainer, {
        borderColor: tema.inputBorderColor,
        backgroundColor: tema.inputBackground,
      }]}>
        <Picker selectedValue={tipo} onValueChange={setTipo} style={{ color: tema.textColor }} dropdownIconColor={tema.textColor}>
          <Picker.Item label="À Vista" value="avista" />
          <Picker.Item label="Débito" value="debito" />
          <Picker.Item label="Crédito" value="credito" />
          <Picker.Item label="Parcelado" value="parcelado" />
        </Picker>
      </View>

      {/* --- CAMPO: CATEGORIA (AGORA DINÂMICO) --- */}
      <Text style={[styles.label, { color: tema.textColor }]}>Categoria</Text>
      <View style={[styles.pickerContainer, {
        borderColor: tema.inputBorderColor,
        backgroundColor: tema.inputBackground,
      }]}>
        <Picker
          selectedValue={categoria}
          onValueChange={(itemValue) => setCategoria(itemValue)}
          style={{ color: tema.textColor }}
          dropdownIconColor={tema.textColor}
        >
          {categoriasDisponiveis.length > 0 ? (
            categoriasDisponiveis.map((cat) => (
              <Picker.Item key={cat.chave} label={cat.nome_categoria} value={cat.nome_categoria} />
            ))
          ) : (
            <Picker.Item label="Nenhuma categoria disponível" value="" enabled={false} />
          )}
        </Picker>
      </View>
      <TouchableOpacity
        onPress={carregarCategorias}
        style={[styles.botaoAtualizar, { backgroundColor: tema.buttonBackground }]}
        disabled={!ipServidor || usuarioId === null}
      >
        <Text style={[styles.botaoTexto, { color: tema.buttonTextColor }]}>🔄 Atualizar Categorias</Text>
      </TouchableOpacity>
      {/* --- FIM CAMPO CATEGORIA --- */}

      {tipo === "parcelado" && (
        <>
          <Text style={[styles.label, { color: tema.textColor }]}>Parcelas</Text>
          <TextInput
            style={[styles.input, {
              borderColor: tema.inputBorderColor,
              backgroundColor: tema.inputBackground,
              color: tema.textColor,
            }]}
            keyboardType="numeric"
            placeholder="Número de parcelas"
            placeholderTextColor={tema.textSecondaryColor}
            value={parcelas}
            onChangeText={setParcelas}
          />
          <Text style={[styles.label, { color: tema.textColor }]}>Valor por Parcela</Text>
          <TextInput
            style={[styles.input, { backgroundColor: tema.sectionBoxBackground, color: tema.textColor, opacity: 0.7 }]}
            editable={false}
            value={valorParcela ? formatCurrency(parseFloat(valorParcela)) : formatCurrency(0)}
          />
          <Text style={[styles.label, { color: tema.textColor }]}>Fim do Parcelamento</Text>
          <TextInput
            style={[styles.input, { backgroundColor: tema.sectionBoxBackground, color: tema.textColor, opacity: 0.7 }]}
            editable={false}
            value={dataTermino}
          />
        </>
      )}

      <Text style={[styles.label, { color: tema.textColor }]}>Descrição (opcional)</Text>
      <TextInput
        style={[styles.input, {
          borderColor: tema.inputBorderColor,
          backgroundColor: tema.inputBackground,
          color: tema.textColor,
        }]}
        value={descricao}
        onChangeText={setDescricao}
        placeholder="Ex: Aluguel, Supermercado, Cinema"
        placeholderTextColor={tema.textSecondaryColor}
        multiline
        numberOfLines={3}
      />

      <TouchableOpacity
        style={[styles.botaoSalvar, { backgroundColor: tema.linkColor }]}
        onPress={handleSalvar}
        disabled={loading || !ipServidor || grupoSelecionado === null || !categoria || !valorRaw || parseFloat(valorRaw.replace(',', '.')) <= 0}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.botaoTexto}>Salvar Saída</Text>}
      </TouchableOpacity>
    </>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: tema.backgroundColor }}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={tema.linkColor} />
          <Text style={[styles.loadingText, { color: tema.textColor }]}>Carregando...</Text>
        </View>
      )}

      {networkError && (
        <View style={[styles.errorContainer, { backgroundColor: tema.sectionBoxBackground }]}>
          <Text style={[styles.errorText, { color: 'red' }]}>{networkError}</Text>
          <Text style={[styles.errorHint, { color: tema.textColor }]}>
            Verifique se o seu servidor backend está rodando e se o IP configurado no aplicativo está correto.
            Para emuladores Android, o IP geralmente é `http://10.0.2.2:3000`. Para iOS, `http://localhost:3000`.
          </Text>
        </View>
      )}

      <View style={styles.headerContainer}>
        <Text style={[styles.headerTitle, { color: tema.textColor }]}>Movimentação de Saída</Text>
        <TouchableOpacity onPress={() => setShowValues(!showValues)} style={styles.toggleVisibilityButton}>
          {showValues ? (
            <Feather name="eye" size={24} color={tema.textColor} />
          ) : (
            <Feather name="eye-off" size={24} color={tema.textColor} />
          )}
        </TouchableOpacity>
      </View>
      <View style={{ padding: 24, paddingBottom: 100 }}>
        {renderFormulario()}

        <Text style={[styles.label, { color: tema.textColor, textAlign: 'center', marginTop: 30, fontSize: 18 }]}>
          Histórico de Saídas
        </Text>
        {transacoes.length > 0 ? (
          transacoes.map((item, index) => (
            <View key={item.id || index} style={{ marginTop: 10 }}>
              {renderItem(item)}
            </View>
          ))
        ) : (
          <Text style={[styles.noDataText, { color: tema.textSecondaryColor }]}>Nenhuma saída registrada.</Text>
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
    paddingVertical: 10, // Aumentado para melhor toque
    fontSize: 16,
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
    justifyContent: 'center', // Centraliza o conteúdo verticalmente
    height: 50, // Altura fixa para o picker
  },
  botaoAtualizar: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  botaoSalvar: { // Novo estilo para o botão de salvar
    marginTop: 30,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    elevation: 5, // Sombra para destaque
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  botaoTexto: { fontSize: 16, fontWeight: "bold", color: "#fff" },
  card: {
    padding: 16,
    borderRadius: 10, // Bordas mais arredondadas
    marginVertical: 6, // Espaçamento vertical
    borderWidth: 1, // Adiciona borda
    elevation: 2, // Sombra mais sutil
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.00,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  cardType: {
    fontSize: 14,
    fontWeight: 'bold',
    backgroundColor: '#e0e0e0', // Fundo para o tipo
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    overflow: 'hidden', // Garante que o borderRadius funcione
  },
  cardCategory: {
    fontSize: 14,
    flex: 1, // Ocupa o espaço restante
    textAlign: 'center',
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
    textAlign: 'right',
    marginTop: 5,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  noDataText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  errorContainer: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'red',
  },
  errorText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  errorHint: {
    fontSize: 14,
  },
});
