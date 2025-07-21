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
  valor: number; // Mantemos como number, mas garantiremos que seja um number no runtime
  tipo: string; // Tipo de transação (avista, parcelado, etc.)
  categoria: string; // Nova categoria adicionada aqui
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

// Lista de categorias padrão para saídas (mantida para fallback se não houver categorias do backend)
const CATEGORIAS_SAIDA = [
  "Alimentação",
  "Transporte",
  "Moradia",
  "Lazer",
  "Educação",
  "Saúde",
  "Contas",
  "Compras",
  "Outros",
];

export default function MovimentacaoSaida() {
  const { tema } = useTheme();
  const [valorRaw, setValorRaw] = useState<string>("");
  const [valor, setValor] = useState<string>("0,00"); // Valor formatado para exibição
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

  // Função para formatar valores monetários (com ou sem asteriscos)
  const formatCurrency = useCallback((value: any): string => { // Aceita 'any' para ser mais flexível com o tipo de entrada
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
    try {
      const storedIp = await AsyncStorage.getItem("ipServidor");
      if (storedIp) {
        setIpServidor(storedIp);
      } else {
        Alert.alert("Erro", "IP do servidor não configurado. Por favor, configure o IP na tela de configurações.");
        setLoading(false);
        return;
      }

      const savedUsuarioId = await AsyncStorage.getItem("usuarioId");
      if (savedUsuarioId) {
        setUsuarioId(parseInt(savedUsuarioId));
      } else {
        const userEmail = await AsyncStorage.getItem("usuarioEmail");
        if (userEmail && storedIp) {
          const userRes = await fetch(`${storedIp}/usuario/por-email/${userEmail}`);
          if (userRes.ok) {
            const userData = await userRes.json();
            setUsuarioId(userData.chave);
            await AsyncStorage.setItem("usuarioId", String(userData.chave));
          } else {
            Alert.alert("Erro", "Não foi possível obter o ID do usuário. Faça login novamente.");
          }
        } else {
          Alert.alert("Erro", "ID do usuário ou Email não encontrado. Por favor, faça login novamente.");
        }
      }
    } catch (err: any) {
      console.error("Erro ao carregar configurações:", err.message);
      Alert.alert("Erro", "Não foi possível obter as configurações iniciais.");
      setLoading(false);
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
    try {
      const gruposRes = await fetch(`${ipServidor}/grupo/usuario/${usuarioId}`);
      if (!gruposRes.ok) throw new Error("Erro ao buscar grupos.");
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
      Alert.alert("Erro ao carregar grupos", err.message || "Erro desconhecido.");
    }
  }, [ipServidor, usuarioId]);

  // Função para carregar categorias de SAÍDA do backend
  const carregarCategorias = useCallback(async () => {
    if (!ipServidor || usuarioId === null) {
      return;
    }
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
        throw new Error(data.erro || "Erro ao buscar categorias de saída.");
      }
    } catch (err: any) {
      console.error("Erro ao carregar categorias de saída:", err.message);
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

  // Carrega histórico do servidor após IP, usuárioId e grupo serem definidos
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

      const res = await fetch(`${ipServidor}/saida?chavepessoa=${chavepessoa}`);
      const lista: any[] = await res.json(); // Use any[] para flexibilidade na resposta da API

      if (!res.ok) throw new Error(lista.erro || "Erro ao buscar histórico.");

      const dadosComCategoria: Transacao[] = lista.map(item => ({
        id: item.id || item.chave,
        valor: typeof item.valor === 'number' ? item.valor : parseFloat(String(item.valor || '0').replace(',', '.')),
        tipo: item.tipo || '',
        categoria: item.categoria || "Outros",
        descricao: item.descricao || '',
        data: item.data || item.datacad || new Date().toISOString().slice(0, 10),
      }));
      setTransacoes(dadosComCategoria);
      await salvarHistoricoLocal(dadosComCategoria);
    } catch (e: any) {
      console.error("Erro ao buscar saídas:", e.message);
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
      const val = parseFloat(valorRaw.replace(',', '.')) / 100;
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

  const gerarDescricaoPadrao = (tipo: string, categoria: string, valorFormatado: string) =>
    `Gasto ${categoria} ${tipo === "parcelado" ? "parcelado" : "à vista"} de R$ ${valorFormatado}`;

  const handleSalvar = async () => {
    if (!valorRaw || (tipo === "parcelado" && (!parcelas || parseInt(parcelas) <= 0))) {
      Alert.alert("Erro", "Preencha corretamente os campos obrigatórios.");
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
      if (!usuarioId || !ipServidor) throw new Error("Dados incompletos (usuário ou IP do servidor).");

      const valorNumerico = parseFloat(valorRaw.replace(',', '.')) / 100;
      const valorParcelaNumerico = valorParcela ? parseFloat(valorParcela.replace(',', '.')) : valorNumerico;
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
        throw new Error(resposta.erro || "Erro ao inserir saída");
      }

      const novaTransacao: Transacao = {
        id: resposta.chave,
        valor: resposta.valor,
        tipo: resposta.tipo,
        categoria: resposta.categoria, // Certifique-se de que o backend retorna a categoria
        descricao: resposta.descricao,
        data: resposta.datacad,
      };

      await AsyncStorage.setItem("grupoSelecionado", grupoSelecionado.toString());

      const novaLista = [novaTransacao, ...transacoes];
      setTransacoes(novaLista);
      await salvarHistoricoLocal(novaLista);

      // Limpar formulário
      setValorRaw("");
      setValor("0,00");
      setTipo("avista");
      setCategoria(categoriasDisponiveis.length > 0 ? categoriasDisponiveis[0].nome_categoria : ""); // Resetar para a primeira categoria disponível
      setParcelas("");
      setValorParcela("");
      setDataTermino("");
      setDescricao("");
      setData(new Date().toISOString().slice(0, 10));

      Alert.alert("✅ Sucesso", "Saída registrada com sucesso.");
    } catch (error: any) {
      Alert.alert("Erro", error.message || "Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  };

  const renderItem = (item: Transacao) => (
    <View key={item.id} style={[styles.card, { backgroundColor: tema.sectionBoxBackground }]}>
      <Text style={[styles.cardValor, { color: "#e53935" }]}>
        🔻 {formatCurrency(item.valor)} {/* Aplica formatCurrency aqui */}
      </Text>
      <Text style={[styles.cardInfo, { color: tema.textColor }]}>📝 {item.descricao}</Text>
      <Text style={[styles.cardInfo, { color: tema.textColor }]}>
        📅 {new Date(item.data).toLocaleDateString("pt-BR")}
      </Text>
      <Text style={[styles.cardInfo, { color: tema.textColor }]}>Tipo: {item.tipo}</Text>
      <Text style={[styles.cardInfo, { color: tema.textColor }]}>Categoria: {item.categoria}</Text> {/* Exibe a categoria */}
    </View>
  );

  // FORMULÁRIO
  const renderFormulario = () => (
    <>
      <Text style={[styles.label, { color: tema.textColor }]}>Grupo</Text>
      <View style={[styles.pickerContainer, { borderColor: tema.inputBorderColor }]}>
        <Picker
          selectedValue={grupoSelecionado}
          onValueChange={(itemValue) => setGrupoSelecionado(itemValue)}
          style={{ color: tema.textColor }} // Garante que o texto do Picker seja visível
        >
          {grupos.length > 0 ? (
            grupos.map((grupo) => (
              <Picker.Item key={grupo.chave} label={grupo.nome} value={grupo.chave} />
            ))
          ) : (
            <Picker.Item label="Nenhum grupo disponível" value={null} />
          )}
        </Picker>
      </View>

      <TouchableOpacity
        onPress={carregarGrupos}
        style={[styles.botao, { backgroundColor: "#e53935", marginTop: 10 }]}
        disabled={!ipServidor || usuarioId === null} // Desabilita se IP ou usuário não carregados
      >
        <Text style={styles.botaoTexto}>🔄 Atualizar Grupos</Text>
      </TouchableOpacity>

      <Text style={[styles.label, { color: tema.textColor }]}>Valor da Saída (R$)</Text>
      <TextInput
        style={[styles.input, { borderColor: tema.inputBorderColor, backgroundColor: tema.sectionBoxBackground, color: tema.textColor }]}
        keyboardType="numeric"
        placeholder="0,00"
        placeholderTextColor={tema.itemColor}
        value={valor}
        onChangeText={(text) => {
          const limpo = text.replace(/\D/g, "");
          setValorRaw(limpo);
          setValor(formatarComoMoeda(limpo));
        }}
      />

      <Text style={[styles.label, { color: tema.textColor }]}>Data</Text>
      <TextInput
        style={[styles.input, { borderColor: tema.inputBorderColor, backgroundColor: tema.sectionBoxBackground, color: tema.textColor }]}
        value={data}
        onChangeText={setData}
      />

      <Text style={[styles.label, { color: tema.textColor }]}>Tipo da Transação</Text>
      <View style={[styles.pickerContainer, { borderColor: tema.inputBorderColor, backgroundColor: tema.sectionBoxBackground }]}>
        <Picker selectedValue={tipo} onValueChange={setTipo} style={{ color: tema.textColor }}>
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
        backgroundColor: tema.sectionBoxBackground,
      }]}>
        <Picker
          selectedValue={categoria}
          onValueChange={(itemValue) => setCategoria(itemValue)}
          style={{ color: tema.textColor }}
        >
          {categoriasDisponiveis.length > 0 ? (
            categoriasDisponiveis.map((cat) => (
              <Picker.Item key={cat.chave} label={cat.nome_categoria} value={cat.nome_categoria} />
            ))
          ) : (
            <Picker.Item label="Nenhuma categoria disponível" value="" />
          )}
        </Picker>
      </View>
      {/* --- FIM CAMPO CATEGORIA --- */}

      {tipo === "parcelado" && (
        <>
          <Text style={[styles.label, { color: tema.textColor }]}>Parcelas</Text>
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
            value={valorParcela ? formatCurrency(parseFloat(valorParcela)) : ""} // Aplica formatCurrency aqui
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
        style={[styles.botao, (!valorRaw || loading || !ipServidor || grupoSelecionado === null || !categoria) && { backgroundColor: tema.itemColor }]}
        onPress={handleSalvar}
        disabled={!valorRaw || loading || !ipServidor || grupoSelecionado === null || !categoria}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.botaoTexto}>Salvar Saída</Text>}
      </TouchableOpacity>
    </>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: tema.backgroundColor }}>
      <View style={styles.headerContainer}> {/* Novo container para o cabeçalho */}
        <Text style={[styles.headerTitle, { color: tema.textColor }]}>Movimentação de Saída</Text>
        {/* Botão para esconder/mostrar valores */}
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
        {transacoes.map((item, index) => (
          <View key={item.id || index} style={{ marginTop: 16 }}>
            {renderItem(item)}
          </View>
        ))}
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
    paddingVertical: 8,
    fontSize: 16,
    marginBottom: 8,
  },
  pickerContainer: { borderWidth: 1, borderRadius: 8, marginBottom: 8, overflow: 'hidden' },
  botao: {
    marginTop: 20,
    backgroundColor: "#e53935",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  botaoTexto: { fontSize: 16, fontWeight: "bold", color: "#fff" },
  card: { padding: 16, borderRadius: 8, marginVertical: 8, elevation: 3 },
  cardValor: { fontSize: 18, fontWeight: "bold" },
  cardInfo: { fontSize: 14, marginTop: 4 },
  headerContainer: { // Novo estilo para o container do cabeçalho
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 0, // Ajuste conforme necessário
  },
  headerTitle: { // Estilo para o título da tela
    fontSize: 22,
    fontWeight: "bold",
  },
  toggleVisibilityButton: { // Estilo para o botão de visibilidade
    padding: 5,
  },
});
