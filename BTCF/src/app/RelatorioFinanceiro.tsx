import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useTheme } from "./ThemeContext";
import { PieChart, BarChart } from "react-native-chart-kit";
import { Feather } from "@expo/vector-icons";

import * as Print from "expo-print";
import * as MailComposer from "expo-mail-composer";

const screenWidth = Dimensions.get("window").width;

interface ChartDataEntry {
  name: string;
  population: number;
  value: number;
  color: string;
  legendFontColor?: string;
  legendFontSize?: number;
}

interface TransacaoItem {
  tipo: string; // "entrada" | "saida"
  categoria: string;
  valor: number;
  datacad: string;
  descricao?: string;
  nomepessoa?: string;
  formapagamento?: string;
  qtdeparc?: number;
  valorparc?: number;
  taxajuros?: number;
}

export default function RelatorioFinanceiro() {
  const router = useRouter();
  const { tema } = useTheme();

  // ----------------- STATE -----------------
  const [dataAtual, setDataAtual] = useState(new Date());

  const [modalGrupoVisivel, setModalGrupoVisivel] = useState(false);
  const [modalDataVisivel, setModalDataVisivel] = useState(false);

  const [grupos, setGrupos] = useState<any[]>([]);
  const [grupoSelecionado, setGrupoSelecionado] = useState<any>(null);

  const [totais, setTotais] = useState({ entradas: 0, saidas: 0 });

  const [despesasPorCategoria, setDespesasPorCategoria] = useState<
    ChartDataEntry[]
  >([]);
  const [labelsCategorias, setLabelsCategorias] = useState<string[]>([]);
  const [totaisCategorias, setTotaisCategorias] = useState<number[]>([]);
  const [transacoes, setTransacoes] = useState<TransacaoItem[]>([]);

  const [showValues, setShowValues] = useState(true);

  // loading inicial (buscar usuário/grupo)
  const [isBootLoading, setIsBootLoading] = useState(false);
  // loading do relatório (gastos, categorias, transações)
  const [isReportLoading, setIsReportLoading] = useState(false);

  const [networkError, setNetworkError] = useState<string | null>(null);

  // ----------------- CONSTANTES MEMO -----------------
  // memo pra não recriar array em todo render
  const COLORS = useMemo(
    () => [
      "#0088FE",
      "#00C49F",
      "#FFBB28",
      "#FF8042",
      "#AF19FF",
      "#FF19A6",
      "#19FFD4",
      "#FFD700",
    ],
    []
  );

  // anoMes derivado da dataAtual, memoizado
  const anoMes = useMemo(() => {
    // dataAtual.toISOString() muda se dataAtual mudar,
    // mas não muda só porque renderizou novamente
    return dataAtual.toISOString().slice(0, 7); // "2025-10"
  }, [dataAtual]);

  // ----------------- HELPERS -----------------
  const formatCurrency = useCallback(
    (value: number | string) => {
      const num = Number(value);
      if (!Number.isFinite(num)) return "R$ --,--";
      if (!showValues) return "R$ *****";
      const fixed = num.toFixed(2);
      const [int, dec] = fixed.split(".");
      const intWithSep = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      return `R$ ${intWithSep},${dec}`;
    },
    [showValues]
  );

  function formatarMes(data: Date) {
    return data.toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });
  }

  function mudarMes(direcao: number) {
    const nova = new Date(dataAtual);
    nova.setMonth(nova.getMonth() + direcao);
    setDataAtual(nova);
  }

  const saldo = totais.entradas - totais.saidas;

  // ----------------- BOOTSTRAP (carregar usuário e grupos) -----------------
  useEffect(() => {
    async function loadInitialData() {
      setIsBootLoading(true);
      setNetworkError(null);

      try {
        const [email, ip] = await Promise.all([
          AsyncStorage.getItem("usuarioEmail"),
          AsyncStorage.getItem("ipServidor"),
        ]);

        if (!email || !ip) {
          Alert.alert(
            "Erro",
            "Dados de autenticação ausentes. Por favor, faça login novamente."
          );
          router.replace("/login");
          return;
        }

        // busca usuário
        const usuarioRes = await fetch(`${ip}/usuario/por-email/${email}`);
        if (!usuarioRes.ok) throw new Error("Usuário não encontrado.");
        const usuario = await usuarioRes.json();

        // busca grupos do usuário
        const gruposRes = await fetch(`${ip}/grupo/usuario/${usuario.chave}`);
        if (!gruposRes.ok) {
          throw new Error(
            `Erro ao buscar grupos: ${gruposRes.statusText || gruposRes.status}`
          );
        }
        const listaGrupos = await gruposRes.json();
        setGrupos(listaGrupos);

        // tenta reusar seleção anterior
        const grupoSalvo = await AsyncStorage.getItem("grupoSelecionado");
        const grupoAtual = grupoSalvo
          ? listaGrupos.find((g: any) => g.chave === parseInt(grupoSalvo))
          : null;
        setGrupoSelecionado(grupoAtual || listaGrupos[0] || null);
      } catch (err: any) {
        console.error("Erro em loadInitialData:", err);
        setNetworkError(
          `Erro ao iniciar o relatório. Verifique o IP e a conexão. Detalhes: ${err.message}`
        );
        Alert.alert(
          "Erro de Inicialização",
          `Não foi possível carregar os dados iniciais. Verifique se o servidor está rodando e o IP está correto.\n\nDetalhes: ${err.message}`
        );
      } finally {
        setIsBootLoading(false);
      }
    }

    loadInitialData();
  }, [router]);

  // ----------------- BUSCA DOS DADOS DO RELATÓRIO -----------------
  const fetchReportData = useCallback(async () => {
    // só roda se já temos grupo e uma data válida
    if (!grupoSelecionado?.chave || !anoMes) {
      setTotais({ entradas: 0, saidas: 0 });
      setDespesasPorCategoria([]);
      setLabelsCategorias([]);
      setTotaisCategorias([]);
      setTransacoes([]);
      return;
    }

    setIsReportLoading(true);
    setNetworkError(null);

    try {
      const ip = await AsyncStorage.getItem("ipServidor");
      if (!ip) {
        setNetworkError(
          "IP do servidor não configurado. Por favor, configure-o nas configurações."
        );
        Alert.alert(
          "Erro de Configuração",
          "IP do servidor não configurado. Por favor, configure-o nas configurações."
        );
        setIsReportLoading(false);
        return;
      }

      const grupoId = grupoSelecionado.chave;

      // 1) Totais entradas/saídas
      const gastosRes = await fetch(`${ip}/grafico/gastos/${grupoId}/${anoMes}`);
      if (!gastosRes.ok) {
        throw new Error(
          `Erro ao buscar totais de gastos: ${gastosRes.statusText || gastosRes.status}`
        );
      }
      const gastosData = await gastosRes.json();
      let entradas = 0;
      let saidas = 0;
      gastosData.forEach((item: any) => {
        const valor = Number(item.total) || 0;
        if (item.tipo === "entrada") entradas += valor;
        if (item.tipo === "saida") saidas += valor;
      });
      setTotais({ entradas, saidas });

      // 2) Despesas por categoria
      const despesasCategoriaRes = await fetch(
        `${ip}/grafico/despesas-por-categoria/${grupoId}/${anoMes}`
      );
      if (!despesasCategoriaRes.ok) {
        throw new Error(
          `Erro ao buscar despesas por categoria: ${despesasCategoriaRes.statusText || despesasCategoriaRes.status}`
        );
      }
      const despesasCategoriaData = await despesasCategoriaRes.json();

      const pie: ChartDataEntry[] = despesasCategoriaData.map(
        (item: any, index: number) => ({
          name: item.categoria || "Outros",
          population: Number(item.total) || 0,
          value: Number(item.total) || 0,
          color: COLORS[index % COLORS.length],
          legendFontColor: tema.textColor,
          legendFontSize: 14,
        })
      );
      setDespesasPorCategoria(pie);

      const labels = despesasCategoriaData.map(
        (d: any) => d.categoria || "Outros"
      );
      const valores = despesasCategoriaData.map(
        (d: any) => Number(d.total) || 0
      );
      setLabelsCategorias(labels);
      setTotaisCategorias(valores);

      // 3) Histórico detalhado
      const transacoesRes = await fetch(
        `${ip}/transacoes/${grupoId}/${anoMes}`
      );
      if (!transacoesRes.ok) {
        throw new Error(
          `Erro ao buscar transações: ${transacoesRes.statusText || transacoesRes.status}`
        );
      }
      const transacoesData: TransacaoItem[] = await transacoesRes.json();
      setTransacoes(transacoesData);
    } catch (error: any) {
      console.error("Erro em fetchReportData:", error);
      setNetworkError(
        `Não foi possível carregar os dados do relatório. Verifique o IP e a conexão. Detalhes: ${error.message}`
      );
      Alert.alert(
        "Erro de Conexão",
        `Não foi possível carregar os dados do relatório. Verifique se o servidor está rodando e o IP está correto.\n\nDetalhes: ${error.message}`
      );
    } finally {
      setIsReportLoading(false);
    }
  }, [grupoSelecionado?.chave, anoMes, COLORS, tema.textColor]);

  // chama fetchReportData sempre que grupoSelecionado ou anoMes mudarem
  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // ----------------- GRÁFICOS -----------------
  const barChartData = useMemo(
    () => ({
      labels: ["Receitas", "Despesas"],
      datasets: [{ data: [totais.entradas, totais.saidas] }],
    }),
    [totais]
  );

  const barChartCategorias = useMemo(
    () => ({
      labels: labelsCategorias,
      datasets: [{ data: totaisCategorias }],
    }),
    [labelsCategorias, totaisCategorias]
  );

  const chartConfig = useMemo(
    () => ({
      backgroundColor: tema.sectionBoxBackground,
      backgroundGradientFrom: tema.sectionBoxBackground,
      backgroundGradientTo: tema.sectionBoxBackground,
      decimalPlaces: 2,
      color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
      labelColor: (_opacity = 1) => tema.textColor,
      // @ts-ignore
      propsForLabels: { fill: tema.textColor },
      // @ts-ignore
      propsForBackgroundLines: {
        strokeDasharray: "",
        stroke: tema.inputBorderColor,
      },
      fillShadowGradient: tema.linkColor,
      fillShadowGradientOpacity: 0.5,
      formatYLabel: (yValue: string) => formatCurrency(yValue),
    }),
    [tema.sectionBoxBackground, tema.textColor, tema.inputBorderColor, tema.linkColor, formatCurrency]
  );

  // ----------------- RELATÓRIO / EMAIL -----------------
  const buildReportHtml = useCallback(() => {
    const grupoNome = grupoSelecionado?.nome || "—";

    const linhasCategorias = labelsCategorias
      .map((nome, i) => {
        const val = formatCurrency(totaisCategorias[i] || 0);
        return `<tr>
          <td style="padding:8px;border:1px solid #ddd;">${nome}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:right;">${val}</td>
        </tr>`;
      })
      .join("");

    const linhasDetalhes = transacoes
      .map((t) => {
        const nomePessoa = t.nomepessoa || "-";
        const tipoMov = t.tipo || "-";
        const forma = t.formapagamento || "-";
        const categoria = t.categoria || "-";
        const descricao = (t.descricao || "").trim() || "-";

        const dataFmt = t.datacad
          ? new Date(t.datacad).toLocaleDateString("pt-BR")
          : "-";

        const valorFmt = formatCurrency(t.valor || 0);

        let extraParcelamento = "";
        const parcelaValida =
          t.qtdeparc && t.qtdeparc > 1 && t.valorparc && t.valorparc > 0;
        if (parcelaValida) {
          const vParc = formatCurrency(t.valorparc || 0);
          extraParcelamento = `${t.qtdeparc}x de ${vParc}`;
        }

        let extraJuros = "";
        if (t.taxajuros && Number(t.taxajuros) > 0) {
          extraJuros = `Juros: ${Number(t.taxajuros)
            .toFixed(2)
            .replace(".", ",")}%`;
        }

        const extras = [extraParcelamento, extraJuros]
          .filter(Boolean)
          .join(" | ");

        return `
          <tr>
            <td style="padding:6px;border:1px solid #ddd;font-size:12px;">${nomePessoa}</td>
            <td style="padding:6px;border:1px solid #ddd;font-size:12px;">${tipoMov}</td>
            <td style="padding:6px;border:1px solid #ddd;font-size:12px;">${forma}</td>
            <td style="padding:6px;border:1px solid #ddd;font-size:12px;">${categoria}</td>
            <td style="padding:6px;border:1px solid #ddd;font-size:12px;">${descricao}</td>
            <td style="padding:6px;border:1px solid #ddd;font-size:12px;text-align:right;">${valorFmt}</td>
            <td style="padding:6px;border:1px solid #ddd;font-size:12px;text-align:center;">${dataFmt}</td>
            <td style="padding:6px;border:1px solid #ddd;font-size:12px;">${extras || "-"}</td>
          </tr>
        `;
      })
      .join("");

    const totalLancamentos = transacoes.length;
    const totalEntradas = totais.entradas;
    const totalSaidas = totais.saidas;
    const saldoFinal = saldo;

    let qtdEntradas = 0;
    let qtdSaidas = 0;
    transacoes.forEach((t) => {
      if (t.tipo === "entrada") qtdEntradas += 1;
      if (t.tipo === "saida") qtdSaidas += 1;
    });

    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Relatório Financeiro</title>
          <style>
            body { font-family: Arial, sans-serif; color: #222; font-size:14px; }
            h1, h2, h3 { margin: 0; padding: 0; }
            .cabecalho { margin-bottom: 16px; }
            .box { border:1px solid #ddd; border-radius:8px; padding:12px; margin: 12px 0; }
            .totais { display:flex; justify-content:space-between; gap:12px; flex-wrap: wrap; }
            .tag { padding:4px 8px; border-radius:6px; font-size:13px; display:inline-block; }
            .verde { background:#e6ffe6; }
            .vermelho { background:#ffe6e6; }
            table { width:100%; border-collapse:collapse; margin-top:8px; }
            th, td { font-size: 12px; }
            th { background:#f8f8f8; text-align:left; padding:6px; border:1px solid #ddd; }
            .rodape { margin-top: 12px; font-size: 11px; color:#555; }
            .subinfo { font-size: 12px; color: #444; margin-top:6px; }
            .totResumoValor { font-weight:bold; }
          </style>
        </head>
        <body>
          <div class="cabecalho">
            <h1>Relatório Financeiro</h1>
            <div>Grupo: <b>${grupoNome}</b></div>
            <div>Período: <b>${formatarMes(dataAtual)}</b></div>
          </div>

          <div class="box">
            <h2>Resumo</h2>
            <div class="totais">
              <div>Entradas:
                <span class="tag verde">${formatCurrency(totalEntradas)}</span>
              </div>
              <div>Saídas:
                <span class="tag vermelho">${formatCurrency(totalSaidas)}</span>
              </div>
              <div>Saldo:
                <b>${formatCurrency(saldoFinal)}</b>
              </div>
            </div>
            <div class="subinfo">
              Lançamentos no período: <span class="totResumoValor">${totalLancamentos}</span><br/>
              • Entradas: ${qtdEntradas} &nbsp; • Saídas: ${qtdSaidas}
            </div>
          </div>

          <div class="box">
            <h2>Totais por Categoria</h2>
            <table>
              <thead>
                <tr>
                  <th style="text-align:left;">Categoria</th>
                  <th style="text-align:right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${
                  linhasCategorias ||
                  '<tr><td colspan="2" style="padding:8px;border:1px solid #ddd;text-align:center;">Sem dados</td></tr>'
                }
              </tbody>
            </table>
          </div>

          <div class="box">
            <h2>Movimentações Detalhadas</h2>
            <table>
              <thead>
                <tr>
                  <th>Responsável</th>
                  <th>Tipo</th>
                  <th>Forma</th>
                  <th>Categoria</th>
                  <th>Descrição</th>
                  <th style="text-align:right;">Valor</th>
                  <th style="text-align:center;">Data</th>
                  <th>Parcelas/Juros</th>
                </tr>
              </thead>
              <tbody>
                ${
                  linhasDetalhes ||
                  '<tr><td colspan="8" style="padding:8px;border:1px solid #ddd;text-align:center;">Nenhuma transação</td></tr>'
                }
              </tbody>
            </table>
          </div>

          <div class="box">
            <h2>Totalizadores Finais</h2>
            <div class="subinfo">
              <div>Total de Entradas: <b>${formatCurrency(totalEntradas)}</b></div>
              <div>Total de Saídas: <b>${formatCurrency(totalSaidas)}</b></div>
              <div>Saldo do Período: <b>${formatCurrency(saldoFinal)}</b></div>
              <div>Quantidade Total de Lançamentos: <b>${totalLancamentos}</b></div>
              <div>Entradas: ${qtdEntradas} | Saídas: ${qtdSaidas}</div>
            </div>
          </div>

          <div class="rodape">
            Gerado em ${new Date().toLocaleString("pt-BR")}
          </div>
        </body>
      </html>
    `;
  }, [
    dataAtual,
    grupoSelecionado,
    labelsCategorias,
    totaisCategorias,
    totais,
    saldo,
    transacoes,
    formatCurrency,
  ]);

  const generatePdfReport = useCallback(async () => {
    try {
      const html = buildReportHtml();
      const { uri } = await Print.printToFileAsync({ html });
      return uri;
    } catch (e: any) {
      Alert.alert("Erro", "Falha ao gerar PDF: " + e.message);
      return null;
    }
  }, [buildReportHtml]);

  const handleSendEmail = useCallback(async () => {
    const email = await AsyncStorage.getItem("usuarioEmail");
    if (!email) {
      Alert.alert(
        "Atenção",
        "E-mail do usuário não encontrado. Faça login novamente."
      );
      return;
    }
    const pdfUri = await generatePdfReport();
    if (!pdfUri) return;

    const available = await MailComposer.isAvailableAsync();
    if (!available) {
      Alert.alert(
        "Atenção",
        "Envio de e-mail não está disponível neste dispositivo."
      );
      return;
    }

    await MailComposer.composeAsync({
      recipients: [email],
      subject: "Relatório Financeiro Detalhado",
      body:
        "Segue em anexo o relatório financeiro detalhado do período selecionado.",
      attachments: [pdfUri],
    });
  }, [generatePdfReport]);

  // ----------------- RENDER -----------------
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: tema.backgroundColor }]}
    >
      {(isBootLoading || isReportLoading) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={tema.linkColor} />
          <Text style={[styles.loadingText, { color: tema.textColor }]}>
            Carregando dados...
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
          <Text style={[styles.errorHint, { color: tema.textColor }]}>
            Verifique se o seu servidor backend está rodando e se o IP
            configurado no aplicativo está correto. Para emuladores Android, o
            IP geralmente é `http://10.0.2.2:3000`. Para iOS,
            `http://localhost:3000`.
          </Text>
        </View>
      )}

      <Text style={[styles.title, { color: tema.textColor }]}>
        Relatório Financeiro
      </Text>

      {/* Filtros */}
      <View style={styles.filtrosRow}>
        <TouchableOpacity
          onPress={() => setModalGrupoVisivel(true)}
          style={[
            styles.filtroBotao,
            { borderColor: tema.inputBorderColor },
          ]}
        >
          <Text style={[styles.filtroTexto, { color: tema.textColor }]}>
            👥 {grupoSelecionado?.nome || "Grupo"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setModalDataVisivel(true)}
          style={[
            styles.filtroBotao,
            { borderColor: tema.inputBorderColor },
          ]}
        >
          <Text style={[styles.filtroTexto, { color: tema.textColor }]}>
            📅 {formatarMes(dataAtual)}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={fetchReportData} // agora chama direto a função estável
          style={[
            styles.filtroBotao,
            {
              backgroundColor: tema.buttonBackground,
              borderColor: tema.buttonBackground,
            },
          ]}
        >
          <Text
            style={[
              styles.filtroTexto,
              { color: tema.buttonTextColor },
            ]}
          >
            🔄 Atualizar
          </Text>
        </TouchableOpacity>
      </View>

      {/* Botão de e-mail */}
      <View style={styles.exportRow}>
        <TouchableOpacity
          style={[styles.exportBtn, { backgroundColor: tema.linkColor }]}
          onPress={handleSendEmail}
        >
          <Feather name="mail" size={18} color="#fff" />
          <Text style={styles.exportBtnText}>Enviar por e-mail</Text>
        </TouchableOpacity>
      </View>

      {/* Card Totais */}
      <View
        style={[
          styles.cardTotais,
          { backgroundColor: tema.sectionBoxBackground },
        ]}
      >
        <View style={styles.saldoHeader}>
          <Text style={[styles.valorTotal, { color: tema.textColor }]}>
            Saldo Total
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

        <Text style={[styles.valorSaldo, { color: tema.textColor }]}>
          {formatCurrency(saldo)}
        </Text>

        <View style={styles.totaisBox}>
          <Text style={{ color: "green" }}>
            Entradas: {formatCurrency(totais.entradas)}
          </Text>
          <Text style={{ color: "red" }}>
            Saídas: {formatCurrency(totais.saidas)}
          </Text>
        </View>
      </View>

      {/* Gráficos */}
      <Text
        style={[styles.sectionTitle, { color: tema.textColor }]}
      >
        Gráficos do Período
      </Text>

      {/* Pizza: Despesas por Categoria */}
      <View
        style={[
          styles.chartContainer,
          { backgroundColor: tema.sectionBoxBackground },
        ]}
      >
        <Text style={[styles.chartTitle, { color: tema.textColor }]}>
          Despesas por Categoria
        </Text>
        {despesasPorCategoria.length > 0 &&
        despesasPorCategoria.some((d) => d.population > 0) ? (
          <PieChart
            data={despesasPorCategoria as any}
            width={screenWidth - 64}
            height={220}
            chartConfig={chartConfig as any}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute={false}
            hasLegend={true}
          />
        ) : (
          <Text
            style={[styles.noDataText, { color: tema.textColor }]}
          >
            Nenhuma despesa por categoria para este período.
          </Text>
        )}
      </View>

      {/* Totais por Categoria (BarChart) */}
      <View
        style={[
          styles.chartContainer,
          { backgroundColor: tema.sectionBoxBackground },
        ]}
      >
        <Text style={[styles.chartTitle, { color: tema.textColor }]}>
          Totais por Categoria
        </Text>
        {totaisCategorias.length > 0 &&
        totaisCategorias.some((v) => v > 0) ? (
          <BarChart
            data={barChartCategorias as any}
            width={screenWidth - 64}
            height={260}
            chartConfig={chartConfig as any}
            verticalLabelRotation={45}
            fromZero
          />
        ) : (
          <Text
            style={[styles.noDataText, { color: tema.textColor }]}
          >
            Sem totais por categoria para o período.
          </Text>
        )}
      </View>

      {/* Receitas vs. Despesas */}
      <View
        style={[
          styles.chartContainer,
          { backgroundColor: tema.sectionBoxBackground },
        ]}
      >
        <Text style={[styles.chartTitle, { color: tema.textColor }]}>
          Receitas vs. Despesas
        </Text>
        {totais.entradas > 0 || totais.saidas > 0 ? (
          <BarChart
            data={barChartData as any}
            width={screenWidth - 64}
            height={220}
            chartConfig={chartConfig as any}
            fromZero
          />
        ) : (
          <Text
            style={[styles.noDataText, { color: tema.textColor }]}
          >
            Nenhum dado de receita ou despesa para este período.
          </Text>
        )}
      </View>

      {/* Histórico de Transações */}
      <Text
        style={[styles.sectionTitle, { color: tema.textColor }]}
      >
        Histórico de Transações
      </Text>
      <View
        style={[
          styles.transactionsContainer,
          { backgroundColor: tema.sectionBoxBackground },
        ]}
      >
        {transacoes.length > 0 ? (
          <ScrollView style={styles.transactionsScroll}>
            <View
              style={[
                styles.transactionHeader,
                { borderBottomColor: tema.inputBorderColor },
              ]}
            >
              <Text
                style={[
                  styles.headerText,
                  { color: tema.textColor, flex: 1.2 },
                ]}
              >
                Categoria
              </Text>
              <Text
                style={[
                  styles.headerText,
                  { color: tema.textColor, flex: 1, textAlign: "right" },
                ]}
              >
                Valor
              </Text>
              <Text
                style={[
                  styles.headerText,
                  { color: tema.textColor, flex: 1, textAlign: "right" },
                ]}
              >
                Data
              </Text>
            </View>

            {transacoes.map((t, index) => {
              const isEntrada = t.tipo === "entrada";
              return (
                <View
                  key={index}
                  style={[
                    styles.transactionItem,
                    {
                      borderBottomColor: tema.inputBorderColor,
                      backgroundColor: tema.sectionBoxBackground,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.transactionCategory,
                      { color: tema.textColor },
                    ]}
                  >
                    {t.categoria || "N/A"}
                  </Text>

                  <Text
                    style={[
                      styles.transactionValue,
                      {
                        color: isEntrada ? "green" : "red",
                        fontWeight: "bold",
                      },
                    ]}
                  >
                    {formatCurrency(t.valor)}
                  </Text>

                  <Text
                    style={[
                      styles.transactionDate,
                      { color: tema.textSecondaryColor },
                    ]}
                  >
                    {t.datacad
                      ? new Date(t.datacad).toLocaleDateString("pt-BR")
                      : "-"}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        ) : (
          <Text style={[styles.noDataText, { color: tema.textColor }]}>
            Nenhuma transação encontrada para este período.
          </Text>
        )}
      </View>

      {/* Modal: Grupo */}
      <Modal visible={modalGrupoVisivel} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View
            style={[
              styles.modalBox,
              { backgroundColor: tema.sectionBoxBackground },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text
                style={[styles.modalTitulo, { color: tema.textColor }]}
              >
                Selecionar Grupo
              </Text>
              <TouchableOpacity
                onPress={() => setModalGrupoVisivel(false)}
              >
                <Text
                  style={[styles.fecharBotao, { color: tema.textColor }]}
                >
                  ✖
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView>
              {grupos.map((grupo) => (
                <Pressable
                  key={grupo.chave}
                  onPress={async () => {
                    setGrupoSelecionado(grupo);
                    await AsyncStorage.setItem(
                      "grupoSelecionado",
                      String(grupo.chave)
                    );
                    setModalGrupoVisivel(false);
                  }}
                  style={[
                    styles.modalItem,
                    { borderBottomColor: tema.inputBorderColor },
                  ]}
                >
                  <Text style={{ color: tema.textColor }}>
                    {grupo.nome}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal: Data / Mês */}
      <Modal visible={modalDataVisivel} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View
            style={[
              styles.modalBox,
              { backgroundColor: tema.sectionBoxBackground },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text
                style={[styles.modalTitulo, { color: tema.textColor }]}
              >
                Selecionar Mês
              </Text>
              <TouchableOpacity
                onPress={() => setModalDataVisivel(false)}
              >
                <Text
                  style={[styles.fecharBotao, { color: tema.textColor }]}
                >
                  ✖
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.mesSelector}>
              <TouchableOpacity
                style={styles.mesBotao}
                onPress={() => {
                  mudarMes(-1);
                }}
              >
                <Text
                  style={[
                    styles.mesBotaoTexto,
                    { color: tema.textColor },
                  ]}
                >
                  ◀
                </Text>
              </TouchableOpacity>

              <Text
                style={[styles.mesAtual, { color: tema.textColor }]}
              >
                {formatarMes(dataAtual)}
              </Text>

              <TouchableOpacity
                style={styles.mesBotao}
                onPress={() => {
                  mudarMes(1);
                }}
              >
                <Text
                  style={[
                    styles.mesBotaoTexto,
                    { color: tema.textColor },
                  ]}
                >
                  ▶
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => setModalDataVisivel(false)}
              style={[
                styles.confirmButton,
                { backgroundColor: tema.linkColor },
              ]}
            >
              <Text style={styles.confirmButtonText}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// ----------------- STYLES -----------------
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  loadingText: { marginTop: 10, fontSize: 16 },

  errorContainer: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "red",
  },
  errorText: { fontSize: 16, fontWeight: "bold", marginBottom: 5 },
  errorHint: { fontSize: 14 },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },

  filtrosRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 8,
  },
  filtroBotao: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  filtroTexto: { fontSize: 14, fontWeight: "500", textAlign: "center" },

  exportRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  exportBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  exportBtnText: { color: "#fff", fontWeight: "bold" },

  cardTotais: {
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  saldoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 10,
  },
  valorTotal: { fontSize: 16, flex: 1 },
  valorSaldo: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 10,
  },
  totaisBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 10,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    marginTop: 20,
    textAlign: "center",
  },

  chartContainer: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  chartTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  noDataText: {
    textAlign: "center",
    paddingVertical: 20,
    fontSize: 16,
  },

  transactionsContainer: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  transactionsScroll: { maxHeight: 300 },
  transactionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    marginBottom: 5,
  },
  headerText: { fontWeight: "bold", fontSize: 14 },
  transactionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  transactionCategory: { fontSize: 14, flex: 1.2 },
  transactionValue: { fontSize: 14, flex: 1, textAlign: "right" },
  transactionDate: {
    fontSize: 12,
    flex: 1,
    textAlign: "right",
  },

  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: "85%",
    borderRadius: 12,
    padding: 24,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  modalTitulo: { fontSize: 20, fontWeight: "bold" },
  fecharBotao: { fontSize: 22, fontWeight: "bold" },
  modalItem: { paddingVertical: 12, borderBottomWidth: 1 },

  mesSelector: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  mesBotao: { paddingHorizontal: 20, paddingVertical: 10 },
  mesBotaoTexto: { fontSize: 24 },
  mesAtual: { fontSize: 18, fontWeight: "bold", marginHorizontal: 10 },

  toggleVisibilityButton: { padding: 5 },

  confirmButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  confirmButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
