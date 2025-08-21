import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useTheme } from "./ThemeContext";
import { Feather } from "@expo/vector-icons";

const screenWidth = Dimensions.get("window").width;

type Grupo = { chave: number; nome: string; [k: string]: any };
type Usuario = { chave: number; nome: string; email: string; lider?: boolean };
type Movimento = {
  chave: number;
  tipo: "aporte" | "retirada";
  valor: number;
  datacad: string;
  taxajuros: number | null;
  descricao: string | null;
  chaveusuario: number;
  nomeusuario: string;
  chavegrupo: number;
};

type ResumoLinha = {
  mes: string; // 'YYYY-MM-01'
  total_por_usuario: Record<string, number>;
  total_geral: number;
  cartao_credito: number;
  rendimento_valor: number;
  rendimento_percent_mes: number;
  rendimento_por_usuario: Record<string, number>;
  gastos_por_usuario: Record<string, number>;
  aportes_por_usuario: Record<string, number>;
};

export default function Investimentos() {
  const router = useRouter();
  const { tema } = useTheme();

  // Filtros
  const [dataRef, setDataRef] = useState<Date>(new Date()); // mês selecionado
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [grupoSelecionado, setGrupoSelecionado] = useState<Grupo | null>(null);
  const [membros, setMembros] = useState<Usuario[]>([]);
  const [usuarioFiltro, setUsuarioFiltro] = useState<number | null>(null); // null = todos

  // UI/estado
  const [loading, setLoading] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [modGrupo, setModGrupo] = useState(false);
  const [modData, setModData] = useState(false);
  const [modUsuario, setModUsuario] = useState(false);
  const [showValues, setShowValues] = useState(true);

  // Dados carregados
  const [movs, setMovs] = useState<Movimento[]>([]);
  const [resumo, setResumo] = useState<ResumoLinha | null>(null);
  const [saldosMes, setSaldosMes] = useState<{
    saldosAteMes: { usuarioid: number; nome: string; saldo: number }[];
    aportesMes: { usuarioid: number; nome: string; total: number }[];
    retiradasMes: { usuarioid: number; nome: string; total: number }[];
  } | null>(null);

  // Form de novo movimento
  const [novoTipo, setNovoTipo] = useState<"aporte" | "retirada">("aporte");
  const [novoValor, setNovoValor] = useState<string>("");
  const [novoTaxa, setNovoTaxa] = useState<string>(""); // % ao mês para aporte (opcional)
  const [novoDescricao, setNovoDescricao] = useState<string>("");

  // Helpers de formatação
  const formatCurrency = useCallback(
    (value: number | string) => {
      const n = Number(value);
      if (!Number.isFinite(n)) return showValues ? "R$ 0,00" : "R$ *****";
      if (!showValues) return "R$ *****";
      const fixed = n.toFixed(2);
      const [i, d] = fixed.split(".");
      const iSep = i.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      return `R$ ${iSep},${d}`;
    },
    [showValues]
  );
  const ym = useMemo(() => dataRef.toISOString().slice(0, 7), [dataRef]); // 'YYYY-MM'
  const ymLabel = useMemo(
    () => dataRef.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
    [dataRef]
  );

  // ===== Carregamento inicial: IP, usuário, grupos
  const carregarInicial = useCallback(async () => {
    setLoading(true);
    setNetworkError(null);
    try {
      const [email, ip] = await Promise.all([
        AsyncStorage.getItem("usuarioEmail"),
        AsyncStorage.getItem("ipServidor"),
      ]);
      if (!email || !ip) {
        Alert.alert("Erro", "Sem autenticação ou IP. Faça login novamente.");
        router.replace("/login");
        return;
      }

      // usuário
      const uRes = await fetch(`${ip}/usuario/por-email/${email}`);
      if (!uRes.ok) throw new Error("Usuário não encontrado.");
      const usuario = await uRes.json();

      // grupos
      const gRes = await fetch(`${ip}/grupo/usuario/${usuario.chave}`);
      if (!gRes.ok) throw new Error("Falha ao buscar grupos.");
      const gs = (await gRes.json()) as Grupo[];
      setGrupos(gs);

      const grupoSalvo = await AsyncStorage.getItem("grupoSelecionado");
      const gAtual =
        (grupoSalvo && gs.find((g) => g.chave === parseInt(grupoSalvo))) || gs[0] || null;
      setGrupoSelecionado(gAtual);

      if (gAtual) {
        await carregarMembros(ip, gAtual.chave);
      }
    } catch (e: any) {
      setNetworkError(e.message);
      Alert.alert("Erro", e.message);
    } finally {
      setLoading(false);
    }
  }, [router]);

  const carregarMembros = useCallback(async (ip: string, grupoId: number) => {
    const r = await fetch(`${ip}/grupo/${grupoId}/membros`);
    if (!r.ok) throw new Error("Falha ao listar membros do grupo.");
    const rows = (await r.json()) as { nome: string; email: string; lider: boolean }[];
    setMembros(
      rows.map((m, i) => ({
        chave: i + 1, // placeholder; nomes serão usados no filtro rápido
        nome: m.nome,
        email: m.email,
        lider: m.lider,
      }))
    );
  }, []);

  // ===== Carregar dados do mês
  const carregarDados = useCallback(async () => {
    if (!grupoSelecionado) return;
    setLoading(true);
    setNetworkError(null);
    try {
      const ip = await AsyncStorage.getItem("ipServidor");
      if (!ip) throw new Error("IP do servidor não configurado.");

      // resumo mensal (mês único)
      const rResumo = await fetch(
        `${ip}/investimentos/resumo-mensal/${grupoSelecionado.chave}?inicio=${ym}&fim=${ym}`
      );
      if (!rResumo.ok) throw new Error("Falha ao carregar resumo mensal.");
      const linhas = (await rResumo.json()) as ResumoLinha[];
      const linhaMes = linhas[0] || null;
      setResumo(linhaMes);

      // saldos/aportes/retiradas do mês
      const rSaldos = await fetch(
        `${ip}/investimentos/saldos/${grupoSelecionado.chave}/${ym}`
      );
      if (!rSaldos.ok) throw new Error("Falha ao carregar saldos do mês.");
      const saldos = await rSaldos.json();
      setSaldosMes(saldos);

      // movimentações (com filtro de usuário se houver)
      const qsUsuario = usuarioFiltro ? `&usuarioId=${usuarioFiltro}` : "";
      const rMov = await fetch(
        `${ip}/investimentos?grupoId=${grupoSelecionado.chave}&inicio=${ym}&fim=${ym}${qsUsuario}`
      );
      if (!rMov.ok) throw new Error("Falha ao carregar movimentações.");
      const lista = (await rMov.json()) as Movimento[];
      setMovs(lista);
    } catch (e: any) {
      setNetworkError(e.message);
      Alert.alert("Erro", e.message);
    } finally {
      setLoading(false);
    }
  }, [grupoSelecionado, ym, usuarioFiltro]);

  // ===== Efeitos
  useFocusEffect(
    useCallback(() => {
      carregarInicial();
    }, [carregarInicial])
  );
  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // ===== Ações UI
  const mudarMes = (delta: number) => {
    const d = new Date(dataRef);
    d.setMonth(d.getMonth() + delta);
    setDataRef(d);
  };

  // Lançar movimento
  const salvarMovimento = useCallback(async () => {
    try {
      if (!grupoSelecionado) return;
      const ip = await AsyncStorage.getItem("ipServidor");
      const email = await AsyncStorage.getItem("usuarioEmail");
      if (!ip || !email) throw new Error("Sem IP ou sessão.");

      // pegar id do usuário logado
      const uRes = await fetch(`${ip}/usuario/por-email/${email}`);
      if (!uRes.ok) throw new Error("Usuário não encontrado.");
      const user = await uRes.json();

      const valor = Number(novoValor.replace(",", "."));
      if (!(valor > 0)) {
        Alert.alert("Validação", "Informe um valor válido (> 0).");
        return;
      }

      const body: any = {
        tipo: novoTipo,
        valor,
        descricao: novoDescricao || null,
        chaveusuario: user.chave,
        chavegrupo: grupoSelecionado.chave,
      };
      if (novoTipo === "aporte") {
        body.taxajuros = novoTaxa ? Number(novoTaxa.replace(",", ".")) : 0;
      }

      setLoading(true);
      const r = await fetch(`${ip}/investimentos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.erro || "Falha ao salvar movimento.");
      }
      // limpa form e recarrega
      setNovoValor("");
      setNovoTaxa("");
      setNovoDescricao("");
      await carregarDados();
      Alert.alert("Sucesso", "Movimento registrado!");
    } catch (e: any) {
      Alert.alert("Erro", e.message);
    } finally {
      setLoading(false);
    }
  }, [grupoSelecionado, novoTipo, novoValor, novoTaxa, novoDescricao, carregarDados]);

  // ===== Helpers de render
  const usuariosDoResumo = useMemo(() => {
    if (!resumo) return [];
    // as chaves dos jsons (ids em string)
    const ids = Object.keys(resumo.total_por_usuario || {});
    // mapear para {id, nome}
    // tentamos casar por nome da lista de membros (quando disponível, pode não bater 100% se emails diferentes)
    return ids.map((idStr) => {
      const id = Number(idStr);
      // nome placeholder caso não haja na lista de membros
      let nome = `Usuário ${id}`;
      const peloNome = membros.find((m) =>
        m.nome?.trim()
      );
      if (peloNome) nome = peloNome.nome; // melhor que nada; se quiser, troque por um dicionário de id->nome vindo do backend
      return { id, nome };
    });
  }, [resumo, membros]);

  const getByUser = (
    bucket: Record<string, number> | undefined,
    userId: number
  ) => (bucket ? Number(bucket[String(userId)] || 0) : 0);

  // CORREÇÃO: Usar valor padrão 0 para evitar .toFixed() em undefined
  const totalGeral = resumo?.total_geral || 0;
  const rendaValor = resumo?.rendimento_valor || 0;
  const rendaPct = resumo?.rendimento_percent_mes || 0;
  const cartao = resumo?.cartao_credito || 0;

  return (
    <ScrollView style={[styles.container, { backgroundColor: tema.backgroundColor }]}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={tema.linkColor} />
          <Text style={[styles.loadingText, { color: tema.textColor }]}>Carregando…</Text>
        </View>
      )}

      {networkError && (
        <View style={[styles.errorBox, { borderColor: "red", backgroundColor: tema.sectionBoxBackground }]}>
          <Text style={{ color: "red", fontWeight: "bold" }}>{networkError}</Text>
          <Text style={{ color: tema.textColor, marginTop: 6 }}>
            Verifique o IP do servidor em “Servidor” no menu e se o backend está ativo.
          </Text>
        </View>
      )}

      <Text style={[styles.title, { color: tema.textColor }]}>Investimentos</Text>

      {/* Filtros */}
      <View style={styles.filtersRow}>
        <TouchableOpacity
          onPress={() => setModGrupo(true)}
          style={[styles.filterBtn, { borderColor: tema.inputBorderColor }]}
        >
          <Text style={[styles.filterText, { color: tema.textColor }]}>
            👥 {grupoSelecionado?.nome || "Grupo"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setModData(true)}
          style={[styles.filterBtn, { borderColor: tema.inputBorderColor }]}
        >
          <Text style={[styles.filterText, { color: tema.textColor }]}>📅 {ymLabel}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setModUsuario(true)}
          style={[styles.filterBtn, { borderColor: tema.inputBorderColor }]}
        >
          <Text style={[styles.filterText, { color: tema.textColor }]}>
            🙍 {usuarioFiltro ? "1 usuário" : "Todos"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={carregarDados}
          style={[
            styles.filterBtn,
            { backgroundColor: tema.buttonBackground, borderColor: tema.buttonBackground },
          ]}
        >
          <Text style={[styles.filterText, { color: tema.buttonTextColor }]}>🔄 Atualizar</Text>
        </TouchableOpacity>
      </View>

      {/* Cards principais */}
      <View style={styles.row}>
        <View style={[styles.card, { backgroundColor: tema.sectionBoxBackground }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: tema.textColor }]}>Total (Grupo)</Text>
            <TouchableOpacity onPress={() => setShowValues((s) => !s)}>
              <Feather name={showValues ? "eye" : "eye-off"} size={20} color={tema.textColor} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.cardValue, { color: tema.textColor }]}>
            {formatCurrency(totalGeral)}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: tema.sectionBoxBackground }]}>
          <Text style={[styles.cardTitle, { color: tema.textColor }]}>Rend. Valor</Text>
          <Text style={[styles.cardValue, { color: tema.textColor }]}>
            {formatCurrency(rendaValor)}
          </Text>
        </View>
      </View>

      <View style={styles.row}>
        <View style={[styles.card, { backgroundColor: tema.sectionBoxBackground }]}>
          <Text style={[styles.cardTitle, { color: tema.textColor }]}>Rend. % / mês</Text>
          <Text style={[styles.cardValue, { color: tema.textColor }]}>
            {/* CORREÇÃO: Usar Number() para garantir que rendaPct seja um número */}
            {showValues ? `${Number(rendaPct).toFixed(2)} %` : "*****"}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: tema.sectionBoxBackground }]}>
          <Text style={[styles.cardTitle, { color: tema.textColor }]}>Cart. Créd.</Text>
          <Text style={[styles.cardValue, { color: tema.textColor }]}>{formatCurrency(cartao)}</Text>
        </View>
      </View>

      {/* Tabela no formato do Sheet */}
      <View style={[styles.tableBox, { backgroundColor: tema.sectionBoxBackground }]}>
        <Text style={[styles.sectionTitle, { color: tema.textColor }]}>Resumo do mês</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View>
            {/* Cabeçalho */}
            <View style={[styles.tr, { borderBottomColor: tema.inputBorderColor }]}>
              <Text style={[styles.th, { minWidth: 120, color: tema.textColor }]}>Mês</Text>

              {/* Totais por usuário */}
              {usuariosDoResumo.map((u) => (
                <Text key={`th-total-${u.id}`} style={[styles.th, { minWidth: 160, color: tema.textColor }]}>
                  Total inv. {u.nome}
                </Text>
              ))}
              <Text style={[styles.th, { minWidth: 120, color: tema.textColor }]}>Total</Text>
              <Text style={[styles.th, { minWidth: 120, color: tema.textColor }]}>Cart. Créd.</Text>
              <Text style={[styles.th, { minWidth: 140, color: tema.textColor }]}>Rend. Valor</Text>
              <Text style={[styles.th, { minWidth: 120, color: tema.textColor }]}>Rend. % / mês</Text>

              {/* Rendimentos por usuário */}
              {usuariosDoResumo.map((u) => (
                <Text key={`th-rend-${u.id}`} style={[styles.th, { minWidth: 140, color: tema.textColor }]}>
                  Rend. {u.nome}
                </Text>
              ))}

              {/* Gastos por usuário */}
              {usuariosDoResumo.map((u) => (
                <Text key={`th-gasto-${u.id}`} style={[styles.th, { minWidth: 140, color: tema.textColor }]}>
                  Gastos {u.nome}
                </Text>
              ))}

              {/* Aportes por usuário */}
              {usuariosDoResumo.map((u) => (
                <Text key={`th-aporte-${u.id}`} style={[styles.th, { minWidth: 140, color: tema.textColor }]}>
                  Aporte {u.nome}
                </Text>
              ))}
            </View>

            {/* Linha do mês atual */}
            <View style={[styles.tr, { borderBottomColor: tema.inputBorderColor }]}>
              <Text style={[styles.td, { minWidth: 120, color: tema.textColor }]}>{ymLabel}</Text>

              {usuariosDoResumo.map((u) => (
                <Text key={`td-total-${u.id}`} style={[styles.td, { minWidth: 160, color: tema.textColor }]}>
                  {formatCurrency(getByUser(resumo?.total_por_usuario, u.id))}
                </Text>
              ))}
              <Text style={[styles.td, { minWidth: 120, color: tema.textColor }]}>
                {formatCurrency(totalGeral)}
              </Text>
              <Text style={[styles.td, { minWidth: 120, color: tema.textColor }]}>{formatCurrency(cartao)}</Text>
              <Text style={[styles.td, { minWidth: 140, color: tema.textColor }]}>
                {formatCurrency(rendaValor)}
              </Text>
              <Text style={[styles.td, { minWidth: 120, color: tema.textColor }]}>
                {showValues ? `${Number(rendaPct).toFixed(2)} %` : "*****"}
              </Text>

              {usuariosDoResumo.map((u) => (
                <Text key={`td-rend-${u.id}`} style={[styles.td, { minWidth: 140, color: tema.textColor }]}>
                  {formatCurrency(getByUser(resumo?.rendimento_por_usuario, u.id))}
                </Text>
              ))}

              {usuariosDoResumo.map((u) => (
                <Text key={`td-gasto-${u.id}`} style={[styles.td, { minWidth: 140, color: tema.textColor }]}>
                  {formatCurrency(getByUser(resumo?.gastos_por_usuario, u.id))}
                </Text>
              ))}

              {usuariosDoResumo.map((u) => (
                <Text key={`td-aporte-${u.id}`} style={[styles.td, { minWidth: 140, color: tema.textColor }]}>
                  {formatCurrency(getByUser(resumo?.aportes_por_usuario, u.id))}
                </Text>
              ))}
            </View>
          </View>
        </ScrollView>

        {!!saldosMes && (
          <Text style={[styles.obs, { color: tema.textColor }]}>
            obs: os gastos com cartão de crédito são rateados entre os membros com base no total do mês
            anterior.
          </Text>
        )}
      </View>

      {/* Movimentações */}
      <View style={[styles.tableBox, { backgroundColor: tema.sectionBoxBackground }]}>
        <Text style={[styles.sectionTitle, { color: tema.textColor }]}>Movimentações</Text>

        {movs.length === 0 ? (
          <Text style={{ color: tema.textColor, textAlign: "center", paddingVertical: 12 }}>
            Nenhuma movimentação no período.
          </Text>
        ) : (
          <View>
            <View style={[styles.tr, { borderBottomColor: tema.inputBorderColor }]}>
              <Text style={[styles.th, { flex: 1.2, color: tema.textColor }]}>Usuário</Text>
              <Text style={[styles.th, { flex: 0.9, color: tema.textColor, textAlign: "center" }]}>
                Tipo
              </Text>
              <Text style={[styles.th, { flex: 1, color: tema.textColor, textAlign: "right" }]}>
                Valor
              </Text>
              <Text style={[styles.th, { flex: 0.9, color: tema.textColor, textAlign: "right" }]}>
                Data
              </Text>
            </View>
            {movs.map((m) => (
              <View
                key={m.chave}
                style={[styles.tr, { borderBottomColor: tema.inputBorderColor }]}
              >
                <Text style={[styles.td, { flex: 1.2, color: tema.textColor }]}>
                  {m.nomeusuario}
                </Text>
                <Text
                  style={[
                    styles.td,
                    { flex: 0.9, color: m.tipo === "aporte" ? "green" : "red", textTransform: "capitalize", textAlign: "center" },
                  ]}
                >
                  {m.tipo}
                </Text>
                <Text style={[styles.td, { flex: 1, color: tema.textColor, textAlign: "right" }]}>
                  {formatCurrency(m.valor)}
                </Text>
                <Text
                  style={[styles.td, { flex: 0.9, color: tema.textSecondaryColor, textAlign: "right" }]}
                >
                  {new Date(m.datacad).toLocaleDateString("pt-BR")}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Lançar novo movimento */}
      <View style={[styles.formBox, { backgroundColor: tema.sectionBoxBackground }]}>
        <Text style={[styles.sectionTitle, { color: tema.textColor }]}>Novo lançamento</Text>

        <View style={styles.row}>
          <TouchableOpacity
            onPress={() => setNovoTipo("aporte")}
            style={[
              styles.pill,
              {
                backgroundColor: novoTipo === "aporte" ? tema.linkColor : "transparent",
                borderColor: tema.inputBorderColor,
              },
            ]}
          >
            <Text
              style={{
                color: novoTipo === "aporte" ? "#fff" : tema.textColor,
                fontWeight: "bold",
              }}
            >
              Aporte
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setNovoTipo("retirada")}
            style={[
              styles.pill,
              {
                backgroundColor: novoTipo === "retirada" ? tema.linkColor : "transparent",
                borderColor: tema.inputBorderColor,
              },
            ]}
          >
            <Text
              style={{
                color: novoTipo === "retirada" ? "#fff" : tema.textColor,
                fontWeight: "bold",
              }}
            >
              Retirada
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          <TextInput
            placeholder="Valor"
            placeholderTextColor={tema.itemColor}
            keyboardType="decimal-pad"
            value={novoValor}
            onChangeText={setNovoValor}
            style={[
              styles.input,
              { color: tema.textColor, borderColor: tema.inputBorderColor, backgroundColor: tema.backgroundColor },
            ]}
          />
          <TextInput
            placeholder="Taxa % a.m. (opcional)"
            placeholderTextColor={tema.itemColor}
            keyboardType="decimal-pad"
            value={novoTaxa}
            onChangeText={setNovoTaxa}
            editable={novoTipo === "aporte"}
            style={[
              styles.input,
              {
                color: tema.textColor,
                borderColor: tema.inputBorderColor,
                backgroundColor: novoTipo === "aporte" ? tema.backgroundColor : "#00000011",
              },
            ]}
          />
        </View>

        <TextInput
          placeholder="Descrição (opcional)"
          placeholderTextColor={tema.itemColor}
          value={novoDescricao}
          onChangeText={setNovoDescricao}
          style={[
            styles.input,
            { color: tema.textColor, borderColor: tema.inputBorderColor, backgroundColor: tema.backgroundColor },
          ]}
        />

        <TouchableOpacity
          onPress={salvarMovimento}
          style={[styles.btn, { backgroundColor: tema.buttonBackground }]}
        >
          <Text style={[styles.btnText, { color: tema.buttonTextColor }]}>Salvar</Text>
        </TouchableOpacity>
      </View>

      {/* Modais */}
      <Modal visible={modGrupo} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={[styles.modalBox, { backgroundColor: tema.sectionBoxBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: tema.textColor }]}>Selecionar Grupo</Text>
              <TouchableOpacity onPress={() => setModGrupo(false)}>
                <Text style={{ color: tema.textColor, fontSize: 18 }}>✖</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              {grupos.map((g) => (
                <Pressable
                  key={g.chave}
                  onPress={async () => {
                    setGrupoSelecionado(g);
                    await AsyncStorage.setItem("grupoSelecionado", String(g.chave));
                    setUsuarioFiltro(null);
                    setModGrupo(false);
                    carregarDados();
                  }}
                  style={[styles.modalItem, { borderBottomColor: tema.inputBorderColor }]}
                >
                  <Text style={{ color: tema.textColor }}>{g.nome}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={modData} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={[styles.modalBox, { backgroundColor: tema.sectionBoxBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: tema.textColor }]}>Selecionar Mês</Text>
              <TouchableOpacity onPress={() => setModData(false)}>
                <Text style={{ color: tema.textColor, fontSize: 18 }}>✖</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.monthRow}>
              <TouchableOpacity onPress={() => mudarMes(-1)} style={styles.monthBtn}>
                <Text style={[styles.monthBtnText, { color: tema.textColor }]}>◀</Text>
              </TouchableOpacity>
              <Text style={[styles.monthNow, { color: tema.textColor }]}>{ymLabel}</Text>
              <TouchableOpacity onPress={() => mudarMes(1)} style={styles.monthBtn}>
                <Text style={[styles.monthBtnText, { color: tema.textColor }]}>▶</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={() => setModData(false)}
              style={[styles.btn, { backgroundColor: tema.linkColor }]}
            >
              <Text style={styles.btnText}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={modUsuario} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={[styles.modalBox, { backgroundColor: tema.sectionBoxBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: tema.textColor }]}>Filtrar Usuário</Text>
              <TouchableOpacity onPress={() => setModUsuario(false)}>
                <Text style={{ color: tema.textColor, fontSize: 18 }}>✖</Text>
              </TouchableOpacity>
            </View>

            <Pressable
              onPress={() => {
                setUsuarioFiltro(null);
                setModUsuario(false);
                carregarDados();
              }}
              style={[styles.modalItem, { borderBottomColor: tema.inputBorderColor }]}
            >
              <Text style={{ color: tema.textColor }}>Todos</Text>
            </Pressable>

            {membros.map((m, idx) => (
              <Pressable
                key={`${m.email}-${idx}`}
                onPress={() => {
                  setUsuarioFiltro(m.chave);
                  setModUsuario(false);
                  carregarDados();
                }}
                style={[styles.modalItem, { borderBottomColor: tema.inputBorderColor }]}
              >
                <Text style={{ color: tema.textColor }}>{m.nome}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

/* ===================== STYLES ===================== */
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  loadingText: { marginTop: 10, fontSize: 16 },
  errorBox: { padding: 14, borderWidth: 1, borderRadius: 10, marginBottom: 14 },
  title: { fontSize: 26, fontWeight: "bold", textAlign: "center", marginBottom: 14 },
  filtersRow: { flexDirection: "row", gap: 8, marginBottom: 12, flexWrap: "wrap" },
  filterBtn: {
    flexGrow: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  filterText: { fontSize: 14, fontWeight: "600" },
  row: { flexDirection: "row", gap: 12, marginBottom: 12 },
  card: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontSize: 14, fontWeight: "600", marginBottom: 6 },
  cardValue: { fontSize: 22, fontWeight: "bold" },

  tableBox: {
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 8, textAlign: "center" },
  tr: { flexDirection: "row", paddingVertical: 10, borderBottomWidth: 1 },
  th: { fontSize: 13, fontWeight: "bold", paddingHorizontal: 8 },
  td: { fontSize: 13, paddingHorizontal: 8 },
  obs: { marginTop: 8, fontSize: 12 },

  formBox: {
    borderRadius: 14,
    padding: 12,
    marginBottom: 40,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    marginBottom: 10,
    marginRight: 8,
  },
  pill: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 999,
    alignItems: "center",
    marginBottom: 10,
  },
  btn: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 4,
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },

  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: Math.min(screenWidth - 40, 420),
    borderRadius: 12,
    padding: 20,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  modalTitle: { fontSize: 18, fontWeight: "bold" },
  modalItem: { paddingVertical: 12, borderBottomWidth: 1 },
  monthRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginVertical: 10 },
  monthBtn: { paddingHorizontal: 20, paddingVertical: 10 },
  monthBtnText: { fontSize: 24 },
  monthNow: { fontSize: 18, fontWeight: "bold", marginHorizontal: 10 },
});
