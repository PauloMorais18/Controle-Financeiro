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
import { Feather } from '@expo/vector-icons'; // Importa ícones de olho aberto e fechado

// --- Definições de Tipo para TypeScript ---
type Transacao = {
  id: number;
  valor: number; // Mantemos como number, mas garantiremos que seja um number no runtime
  tipo: string; // Tipo de transação (avista, parcelado, etc.)
  categoria: string; // Categoria da transação
  descricao: string;
  data: string;
};

// Interface para a categoria retornada do backend
interface Categoria {
  chave: number;
  nome_categoria: string;
  tipo_transacao: 'entrada' | 'saida';
  chaveusuario: number;
}

export default function MovimentacaoEntrada() {
  const { tema } = useTheme();
  const [valorRaw, setValorRaw] = useState<string>("");
  const [tipo, setTipo] = useState<string>("avista"); // Tipo de transação (à vista, parcelado, etc.)
  const [categoria, setCategoria] = useState<string>(""); // Estado para a categoria selecionada (agora dinâmica)
  const [parcelas, setParcelas] = useState<string>("");
  const [valorParcela, setValorParcela] = useState<string>("");
  const [dataTermino, setDataTermino] = useState<string>("");
  const [data, setData] = useState<string>(new Date().toISOString().slice(0, 10));
  const [descricao, setDescricao] = useState<string>("");
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [grupos, setGrupos] = useState<any[]>([]);
  const [grupoSelecionado, setGrupoSelecionado] = useState<number | null>(null);
  const CHAVE_HISTORICO = "historico_entradas";

  // Estado para o IP do servidor e ID do usuário (carregados do AsyncStorage)
  const [ipServidor, setIpServidor] = useState<string | null>(null);
  const [usuarioId, setUsuarioId] = useState<number | null>(null);

  // Estado para as categorias disponíveis (carregadas do backend)
  const [categoriasDisponiveis, setCategoriasDisponiveis] = useState<Categoria[]>([]);

  // Novo estado para controlar a visibilidade dos valores
  const [showValues, setShowValues] = useState(true);

  // Função para formatar valores monetários (com ou sem asteriscos)
  const formatCurrency = useCallback((value: any): string => { // Aceita 'any' para ser mais flexível com o tipo de entrada
    // Garante que o valor não é null ou undefined antes de qualquer operação
    if (value === null || value === undefined) {
      return "R$ 0,00";
    }

    let numericValue: number;

    // Tenta converter para número, tratando strings (ex: "1.234,56")
    if (typeof value === 'string') {
      numericValue = parseFloat(value.replace(',', '.'));
    } else if (typeof value === 'number') {
      numericValue = value;
    } else {
      // Fallback para tipos inesperados, garantindo que numericValue seja um número
      numericValue = 0;
    }

    // Verifica se o valor é NaN após a conversão
    if (isNaN(numericValue)) {
      numericValue = 0;
    }

    // Aplica a lógica de esconder/mostrar valores
    if (!showValues) {
      return "R$ *****";
    }

    // Garante que o valor é um número finito antes de chamar toFixed
    if (!Number.isFinite(numericValue)) {
        return "R$ 0,00"; // Ou outro valor padrão para casos como Infinity
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
        // Tenta buscar o ID do usuário pelo email se não estiver salvo
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

  // Função para carregar categorias do backend
  const carregarCategorias = useCallback(async () => {
    if (!ipServidor || usuarioId === null) {
      return;
    }
    try {
      const response = await fetch(`${ipServidor}/categorias/${usuarioId}/entrada`);
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
        throw new Error(data.erro || "Erro ao buscar categorias.");
      }
    } catch (err: any) {
      console.error("Erro ao carregar categorias:", err.message);
      Alert.alert("Erro", "Não foi possível carregar as categorias personalizadas.");
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
      if (!usuarioId || !ipServidor) throw new Error("Usuário ou IP não encontrado.");

      const response = await fetch(`${ipServidor}/entrada?chavepessoa=${usuarioId}`);
      const dados: any[] = await response.json(); // Use any[] para flexibilidade na resposta da API

      if (!response.ok) throw new Error(dados.erro || "Erro ao buscar histórico.");

      const dadosComCategoria: Transacao[] = dados.map(item => ({
        id: item.id || item.chave, // Garante que 'id' exista, pode ser 'chave' do backend
        valor: typeof item.valor === 'number' ? item.valor : parseFloat(item.valor?.replace(',', '.') || '0'), // Garante que valor é number
        tipo: item.tipo || '',
        categoria: item.categoria || "Outros", // Define um valor padrão se não existir
        descricao: item.descricao || '',
        data: item.data || item.datacad || new Date().toISOString().slice(0, 10), // Garante que data exista
      }));
      setTransacoes(dadosComCategoria);
      await salvarHistoricoLocal(dadosComCategoria);
    } catch (err: any) {
      console.error("Erro ao carregar histórico do servidor:", err.message);
      // Não exibe Alert aqui para não ser muito intrusivo no carregamento inicial
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
    `Ganho ${categoria} ${tipo === "parcelado" ? "parcelado" : "à vista"} de R$ ${valorFormatado}`;

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
        categoria,
        valor: valorNumerico,
        descricao: descricao.trim() || gerarDescricaoPadrao(tipo, categoria, valorFormatado),
        qtdeparc: tipo === "parcelado" ? parseInt(parcelas) : 1,
        valorparc: valorParcelaNumerico,
        datafimparc: dataFimParcelas,
        chavepessoa: usuarioId,
        chavegrupo: grupoSelecionado,
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

      const novaTransacao: Transacao = {
        id: resposta.chave,
        valor: resposta.valor,
        tipo: resposta.tipo,
        categoria: resposta.categoria,
        descricao: resposta.descricao,
        data: resposta.datacad,
      };

      await AsyncStorage.setItem("grupoSelecionado", grupoSelecionado.toString());

      const novaLista = [novaTransacao, ...transacoes];
      setTransacoes(novaLista);
      await salvarHistoricoLocal(novaLista);

      // Limpar formulário
      setValorRaw("");
      setTipo("avista");
      setCategoria(categoriasDisponiveis.length > 0 ? categoriasDisponiveis[0].nome_categoria : ""); // Resetar para a primeira categoria disponível
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
        💰 {formatCurrency(item.valor)} {/* Aplica formatCurrency aqui */}
      </Text>
      <Text style={[styles.cardInfo, { color: tema.textColor }]}>📝 {item.descricao}</Text>
      <Text style={[styles.cardInfo, { color: tema.textColor }]}>
        📅 {new Date(item.data).toLocaleDateString("pt-BR")}
      </Text>
      <Text style={[styles.cardInfo, { color: tema.textColor }]}>Tipo: {item.tipo}</Text>
      <Text style={[styles.cardInfo, { color: tema.textColor }]}>Categoria: {item.categoria}</Text>
    </View>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: tema.backgroundColor }}>
      <View style={styles.headerContainer}> {/* Novo container para o cabeçalho */}
        <Text style={[styles.headerTitle, { color: tema.textColor }]}>Movimentação de Entrada</Text>
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
            onValueChange={(itemValue) => setGrupoSelecionado(itemValue)}
            style={{ color: tema.textColor }}
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
          style={[styles.botao, { backgroundColor: "#2196F3", marginTop: 10 }]}
          disabled={!ipServidor || usuarioId === null}
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
          style={[styles.input, {
            borderColor: tema.inputBorderColor,
            backgroundColor: tema.sectionBoxBackground,
            color: tema.textColor,
          }]}
          value={data}
          onChangeText={setData}
        />

        <Text style={[styles.label, { color: tema.textColor }]}>Tipo da Transação</Text>
        <View style={[styles.pickerContainer, {
          borderColor: tema.inputBorderColor,
          backgroundColor: tema.sectionBoxBackground,
        }]}>
          <Picker selectedValue={tipo} onValueChange={(itemValue) => setTipo(itemValue)} style={{ color: tema.textColor }}>
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
              style={[styles.input, {
                borderColor: tema.inputBorderColor,
                backgroundColor: tema.sectionBoxBackground,
                color: tema.textColor,
              }]}
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
          style={[styles.input, {
            borderColor: tema.inputBorderColor,
            backgroundColor: tema.sectionBoxBackground,
            color: tema.textColor,
          }]}
          value={descricao}
          onChangeText={setDescricao}
        />

        <TouchableOpacity
          style={[styles.botao, (!valorRaw || loading || !ipServidor || grupoSelecionado === null || !categoria) && { backgroundColor: tema.itemColor }]}
          onPress={handleSalvar}
          disabled={!valorRaw || loading || !ipServidor || grupoSelecionado === null || !categoria}
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
  pickerContainer: { borderWidth: 1, borderRadius: 8, marginBottom: 8, overflow: 'hidden' },
  botao: { marginTop: 20, backgroundColor: "#4CAF50", paddingVertical: 12, borderRadius: 8, alignItems: "center" },
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
