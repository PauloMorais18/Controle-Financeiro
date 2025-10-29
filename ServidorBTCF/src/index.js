// index.js (servidor)

const express = require('express');
const cors = require('cors');
const os = require('os');
const pool = require('./db'); // conexão com Postgres

const app = express();
const PORT = 3000;

/**
 * Descobre o IP local da máquina para exibir no console,
 * útil pra você configurar no app mobile.
 */
function getLocalIp() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return 'localhost';
}

// ===== Middlewares base =====
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Healthcheck rápido
app.get('/health', (req, res) => res.status(200).send('ok'));

// Rota raiz
app.get('/', (req, res) => {
  res.send('Servidor BTCF está rodando!');
});

// Debug de conexão DB
app.get('/testdb', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      status: 'ok',
      message: 'Conexão bem-sucedida',
      timestamp: result.rows[0].now,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Erro na conexão',
      error: error.message,
    });
  }
});

// =====================
// ROTAS PARA RELATÓRIO
// =====================

/**
 * /grafico/gastos/:grupoId/:anoMes
 * Retorna soma de entradas e saídas do grupo em um mês (YYYY-MM).
 */
app.get('/grafico/gastos/:grupoId/:anoMes', async (req, res) => {
  const { grupoId, anoMes } = req.params;
  const grupoIdNum = parseInt(grupoId, 10);

  console.log('[GET /grafico/gastos]', { grupoId, anoMes });

  if (!grupoIdNum || !/^\d{4}-\d{2}$/.test(anoMes)) {
    return res.status(400).json({ erro: "Parâmetros inválidos. Use grupoId numérico e anoMes=YYYY-MM." });
  }

  try {
    const result = await pool.query(
      `SELECT tipo, SUM(valor) AS total
       FROM (
         SELECT 'entrada' AS tipo, valor, datacad, chavegrupo FROM entrada
         UNION ALL
         SELECT 'saida'   AS tipo, valor, datacad, chavegrupo FROM saida
       ) AS transacoes
       WHERE to_char(datacad, 'YYYY-MM') = $1
         AND chavegrupo = $2
       GROUP BY tipo`,
      [anoMes, grupoIdNum]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Erro /grafico/gastos:', err);
    res.status(500).json({
      erro: 'Erro ao buscar totais de gastos',
      detalhes: err.message,
    });
  }
});

/**
 * /grafico/despesas-por-categoria/:grupoId/:anoMes
 * Retorna soma das saídas por categoria no mês.
 */
app.get('/grafico/despesas-por-categoria/:grupoId/:anoMes', async (req, res) => {
  const { grupoId, anoMes } = req.params;
  const grupoIdNum = parseInt(grupoId, 10);

  console.log('[GET /grafico/despesas-por-categoria]', { grupoId, anoMes });

  if (!grupoIdNum || !/^\d{4}-\d{2}$/.test(anoMes)) {
    return res.status(400).json({ erro: "Parâmetros inválidos. Use grupoId numérico e anoMes=YYYY-MM." });
  }

  try {
    const result = await pool.query(
      `SELECT categoria, SUM(valor) AS total
       FROM saida
       WHERE to_char(datacad, 'YYYY-MM') = $1
         AND chavegrupo = $2
       GROUP BY categoria`,
      [anoMes, grupoIdNum]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar despesas por categoria:", err);
    res.status(500).json({
      erro: 'Erro ao buscar despesas por categoria',
      detalhes: err.message,
    });
  }
});

/**
 * /transacoes/:grupoId/:anoMes
 * Retorna histórico (entradas e saídas) do grupo no mês, ordenado por data desc.
 * Campos esperados pelo app: tipo, valor, descricao, datacad, categoria
 */
app.get('/transacoes/:grupoId/:anoMes', async (req, res) => {
  const { grupoId, anoMes } = req.params;
  const grupoIdNum = parseInt(grupoId, 10);

  console.log('[GET /transacoes]', { grupoId, anoMes });

  if (!grupoIdNum || !/^\d{4}-\d{2}$/.test(anoMes)) {
    return res.status(400).json({ erro: "Parâmetros inválidos. Use grupoId numérico e anoMes=YYYY-MM." });
  }

  try {
    const result = await pool.query(
      `SELECT tipo, valor, descricao, datacad, categoria
       FROM (
         SELECT 'entrada' AS tipo, valor, descricao, datacad, chavegrupo, categoria FROM entrada
         UNION ALL
         SELECT 'saida'   AS tipo, valor, descricao, datacad, chavegrupo, categoria FROM saida
       ) AS transacoes
       WHERE to_char(datacad, 'YYYY-MM') = $1
         AND chavegrupo = $2
       ORDER BY datacad DESC`,
      [anoMes, grupoIdNum]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Erro /transacoes:', err);
    res.status(500).json({
      erro: 'Erro ao buscar transações',
      detalhes: err.message,
    });
  }
});

// =====================
// ROTAS DE ENTRADA
// =====================

/**
 * GET /entrada?chavepessoa=ID
 * Lista entradas da pessoa.
 */
app.get('/entrada', async (req, res) => {
  const { chavepessoa } = req.query;
  const chavePessoaNum = parseInt(chavepessoa, 10);

  if (!chavePessoaNum) {
    return res.status(400).json({ erro: "Parâmetro 'chavepessoa' é obrigatório e deve ser numérico." });
  }

  try {
    const result = await pool.query(
      `SELECT *, categoria, taxajuros
       FROM entrada
       WHERE chavepessoa = $1
       ORDER BY chave DESC`,
      [chavePessoaNum]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar entradas:", err);
    res.status(500).json({ erro: err.message });
  }
});

/**
 * POST /entrada
 * Insere uma entrada financeira.
 */
app.post('/entrada', async (req, res) => {
  const {
    tipo,
    valor,
    descricao,
    qtdeparc,
    valorparc,
    datafimparc,
    chavepessoa,
    chavegrupo,
    categoria,
    taxajuros
  } = req.body;

  const chavePessoaNum = Number(chavepessoa);
  const chaveGrupoNum  = Number(chavegrupo);

  if (!Number.isInteger(chavePessoaNum)) {
    return res.status(400).json({ erro: "Campo 'chavepessoa' deve ser um número inteiro." });
  }
  if (!Number.isInteger(chaveGrupoNum)) {
    return res.status(400).json({ erro: "Campo 'chavegrupo' deve ser um número inteiro." });
  }

  try {
    // Confirma se o usuário pertence ao grupo
    const verifica = await pool.query(
      `SELECT 1 FROM pessoasgrupo WHERE chaveusuario = $1 AND chavegrupo = $2`,
      [chavePessoaNum, chaveGrupoNum]
    );
    if (verifica.rows.length === 0) {
      return res.status(403).json({ erro: "Usuário não pertence ao grupo informado." });
    }

    const resultado = await pool.query(
      `INSERT INTO entrada
         (tipo, valor, descricao, datacad, qtdeparc, valorparc, datafimparc,
          chavepessoa, chavegrupo, categoria, taxajuros)
       VALUES ($1,   $2,    $3,        NOW(),   $4,       $5,        $6,
               $7,         $8,         $9,       $10)
       RETURNING *`,
      [
        tipo,
        valor,
        descricao,
        qtdeparc,
        valorparc,
        datafimparc,
        chavePessoaNum,
        chaveGrupoNum,
        categoria,
        taxajuros
      ]
    );

    res.status(201).json(resultado.rows[0]);
  } catch (err) {
    console.error("Erro ao salvar entrada:", err);
    res.status(500).json({
      erro: "Erro ao salvar entrada",
      detalhes: err.message,
    });
  }
});

// =====================
// ROTAS DE SAÍDA
// =====================

/**
 * GET /saida?chavepessoa=ID
 * Lista saídas da pessoa.
 */
app.get('/saida', async (req, res) => {
  const { chavepessoa } = req.query;
  const chavePessoaNum = parseInt(chavepessoa, 10);

  if (!chavePessoaNum) {
    return res.status(400).json({ erro: "Parâmetro 'chavepessoa' é obrigatório e deve ser numérico." });
  }

  try {
    const result = await pool.query(
      `SELECT *, categoria, taxajuros
       FROM saida
       WHERE chavepessoa = $1
       ORDER BY chave DESC`,
      [chavePessoaNum]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar saídas:", err);
    res.status(500).json({ erro: err.message });
  }
});

/**
 * POST /saida
 * Insere uma saída financeira.
 */
app.post('/saida', async (req, res) => {
  const {
    tipo,
    valor,
    descricao,
    qtdeparc,
    valorparc,
    datafimparc,
    chavepessoa,
    chavegrupo,
    categoria,
    taxajuros
  } = req.body;

  const chavePessoaNum = Number(chavepessoa);
  const chaveGrupoNum  = Number(chavegrupo);

  if (!Number.isInteger(chavePessoaNum)) {
    return res.status(400).json({ erro: "Campo 'chavepessoa' deve ser um número válido." });
  }
  if (!Number.isInteger(chaveGrupoNum)) {
    return res.status(400).json({ erro: "Campo 'chavegrupo' deve ser um número válido." });
  }

  try {
    // Confirma se o usuário pertence ao grupo
    const verifica = await pool.query(
      `SELECT 1 FROM pessoasgrupo WHERE chaveusuario = $1 AND chavegrupo = $2`,
      [chavePessoaNum, chaveGrupoNum]
    );
    if (verifica.rows.length === 0) {
      return res.status(403).json({ erro: "Usuário não pertence ao grupo informado." });
    }

    const result = await pool.query(
      `INSERT INTO saida
         (tipo, valor, descricao, datacad, qtdeparc, valorparc, datafimparc,
          chavepessoa, chavegrupo, categoria, taxajuros)
       VALUES ($1,   $2,    $3,        NOW(),   $4,       $5,        $6,
               $7,         $8,         $9,       $10)
       RETURNING *`,
      [
        tipo,
        valor,
        descricao,
        qtdeparc,
        valorparc,
        datafimparc,
        chavePessoaNum,
        chaveGrupoNum,
        categoria,
        taxajuros
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao inserir saída:", err);
    res.status(500).json({
      erro: "Erro ao inserir saída",
      detalhes: err.message,
    });
  }
});

// =====================
// ROTAS DE CATEGORIAS
// =====================

/**
 * GET /categorias/:usuarioId/:tipo
 * tipo = 'entrada' | 'saida'
 */
app.get('/categorias/:usuarioId/:tipo', async (req, res) => {
  const { usuarioId, tipo } = req.params;
  const usuarioNum = parseInt(usuarioId, 10);

  if (!usuarioNum || !['entrada', 'saida'].includes(tipo)) {
    return res.status(400).json({
      erro: "Parâmetros inválidos. Informe usuarioId numérico e tipo = 'entrada' | 'saida'."
    });
  }

  try {
    const result = await pool.query(
      `SELECT chave, nome_categoria, tipo_transacao
       FROM categorias_usuario
       WHERE chaveusuario = $1 AND tipo_transacao = $2
       ORDER BY nome_categoria ASC`,
      [usuarioNum, tipo]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar categorias:", err);
    res.status(500).json({
      erro: 'Erro ao buscar categorias',
      detalhes: err.message,
    });
  }
});

app.post('/categorias', async (req, res) => {
  const { chaveusuario, nome_categoria, tipo_transacao } = req.body;

  if (!chaveusuario || !nome_categoria || !tipo_transacao) {
    return res.status(400).json({
      erro: "Campos 'chaveusuario', 'nome_categoria' e 'tipo_transacao' são obrigatórios."
    });
  }
  if (!['entrada', 'saida'].includes(tipo_transacao)) {
    return res.status(400).json({
      erro: "Tipo de transação inválido. Deve ser 'entrada' ou 'saida'."
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO categorias_usuario (chaveusuario, nome_categoria, tipo_transacao)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [Number(chaveusuario), nome_categoria, tipo_transacao]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({
        erro: "Categoria com este nome já existe para este tipo e usuário."
      });
    }
    console.error("Erro ao adicionar categoria:", err);
    res.status(500).json({
      erro: 'Erro ao adicionar categoria',
      detalhes: err.message,
    });
  }
});

app.delete('/categorias/:chave', async (req, res) => {
  const { chave } = req.params;
  const { chaveusuario } = req.body;

  if (!chaveusuario) {
    return res.status(400).json({ erro: "ID do usuário é obrigatório para exclusão." });
  }

  try {
    const result = await pool.query(
      `DELETE FROM categorias_usuario
       WHERE chave = $1 AND chaveusuario = $2
       RETURNING *`,
      [parseInt(chave, 10), Number(chaveusuario)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        erro: "Categoria não encontrada ou você não tem permissão para excluí-la."
      });
    }

    res.status(200).json({ mensagem: "Categoria excluída com sucesso." });
  } catch (err) {
    console.error("Erro ao deletar categoria:", err);
    res.status(500).json({
      erro: 'Erro ao deletar categoria',
      detalhes: err.message,
    });
  }
});

app.put('/categorias/:chave', async (req, res) => {
  const { chave } = req.params;
  const { nome_categoria, tipo_transacao, chaveusuario } = req.body;

  if (!nome_categoria || !tipo_transacao || !chaveusuario) {
    return res.status(400).json({
      erro: "Campos 'nome_categoria', 'tipo_transacao' e 'chaveusuario' são obrigatórios para atualização."
    });
  }
  if (!['entrada', 'saida'].includes(tipo_transacao)) {
    return res.status(400).json({
      erro: "Tipo de transação inválido. Deve ser 'entrada' ou 'saida'."
    });
  }

  try {
    const result = await pool.query(
      `UPDATE categorias_usuario
       SET nome_categoria = $1, tipo_transacao = $2
       WHERE chave = $3 AND chaveusuario = $4
       RETURNING *`,
      [nome_categoria, tipo_transacao, parseInt(chave, 10), Number(chaveusuario)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        erro: "Categoria não encontrada ou você não tem permissão para atualizá-la."
      });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({
        erro: "Categoria com este nome já existe para este tipo e usuário."
      });
    }
    console.error("Erro ao atualizar categoria:", err);
    res.status(500).json({
      erro: 'Erro ao atualizar categoria',
      detalhes: err.message,
    });
  }
});

// =====================
// INVESTIMENTOS
// =====================

function parseAnoMesOuThrow(anoMes) {
  if (typeof anoMes !== 'string' || !/^\d{4}-\d{2}$/.test(anoMes)) {
    const err = new Error("Parâmetro 'anoMes' inválido. Use o padrão YYYY-MM.");
    err.statusCode = 400;
    throw err;
  }
  const inicio = new Date(`${anoMes}-01T00:00:00.000Z`);
  const fim = new Date(inicio);
  fim.setMonth(fim.getMonth() + 1); // exclusivo
  return { inicio, fim };
}

function parsePeriodoYMOrThrow(inicioYM, fimYM) {
  if (!inicioYM || !fimYM) {
    const err = new Error("Informe 'inicio' e 'fim' no formato YYYY-MM.");
    err.statusCode = 400;
    throw err;
  }
  const { inicio } = parseAnoMesOuThrow(inicioYM);
  const { fim } = parseAnoMesOuThrow(fimYM);
  if (inicio > fim) {
    const err = new Error("Período inválido: 'inicio' > 'fim'.");
    err.statusCode = 400;
    throw err;
  }
  return { inicio, fim, inicioYM, fimYM };
}

async function assertUsuarioNoGrupo(poolConn, chaveusuario, chavegrupo) {
  const r = await poolConn.query(
    `SELECT 1 FROM pessoasgrupo WHERE chaveusuario = $1 AND chavegrupo = $2`,
    [chaveusuario, chavegrupo]
  );
  if (r.rows.length === 0) {
    const err = new Error("Usuário não pertence ao grupo informado.");
    err.statusCode = 403;
    throw err;
  }
}

const TIPOS_INV = new Set(['aporte', 'retirada']);

/**
 * GET /investimentos/resumo-mensal/:grupoId?inicio=YYYY-MM&fim=YYYY-MM
 * Agrupa aportes, retiradas, gastos etc. por mês.
 */
app.get('/investimentos/resumo-mensal/:grupoId', async (req, res) => {
  try {
    const { grupoId } = req.params;
    const { inicio, fim } = req.query;

    const { inicioYM, fimYM } = parsePeriodoYMOrThrow(inicio, fim);
    const grupoIdNum = Number(grupoId);

    const sql = `
      WITH meses AS (
        SELECT generate_series(
          date_trunc('month', to_date($2, 'YYYY-MM')),
          date_trunc('month', to_date($3, 'YYYY-MM')),
          interval '1 month'
        )::date AS mes
      ),
      saldos AS (
        SELECT
          m.mes,
          i.chaveusuario,
          SUM(CASE WHEN i.tipo='aporte'  THEN i.valor ELSE 0 END)
        - SUM(CASE WHEN i.tipo='retirada' THEN i.valor ELSE 0 END) AS saldo
        FROM meses m
        LEFT JOIN investimentos i
          ON i.chavegrupo = $1
         AND i.datacad < (m.mes + interval '1 month')
        GROUP BY m.mes, i.chaveusuario
      ),
      total_por_usuario_json AS (
        SELECT
          mes,
          COALESCE(
            jsonb_object_agg(chaveusuario::text, COALESCE(saldo,0))
            FILTER (WHERE chaveusuario IS NOT NULL),
            '{}'::jsonb
          ) AS total_por_usuario
        FROM saldos
        GROUP BY mes
      ),
      total_geral_mes AS (
        SELECT mes, COALESCE(SUM(saldo),0) AS total_geral
        FROM saldos
        GROUP BY mes
      ),
      aportes_mes AS (
        SELECT m.mes, i.chaveusuario, SUM(i.valor) AS total_aportes
        FROM meses m
        LEFT JOIN investimentos i
          ON i.chavegrupo = $1
         AND i.tipo = 'aporte'
         AND i.datacad >= m.mes
         AND i.datacad < (m.mes + interval '1 month')
        GROUP BY m.mes, i.chaveusuario
      ),
      aportes_json AS (
        SELECT mes,
        COALESCE(
          jsonb_object_agg(chaveusuario::text, COALESCE(total_aportes,0))
          FILTER (WHERE chaveusuario IS NOT NULL),
          '{}'::jsonb
        ) AS aportes_por_usuario
        FROM aportes_mes
        GROUP BY mes
      ),
      retiradas_mes AS (
        SELECT m.mes, i.chaveusuario, SUM(i.valor) AS total_retiradas
        FROM meses m
        LEFT JOIN investimentos i
          ON i.chavegrupo = $1
         AND i.tipo = 'retirada'
         AND i.datacad >= m.mes
         AND i.datacad < (m.mes + interval '1 month')
        GROUP BY m.mes, i.chaveusuario
      ),
      gastos_mes AS (
        SELECT m.mes, s.chavepessoa AS chaveusuario, SUM(s.valor) AS total_gastos
        FROM meses m
        LEFT JOIN saida s
          ON s.chavegrupo = $1
         AND s.datacad >= m.mes
         AND s.datacad < (m.mes + interval '1 month')
        GROUP BY m.mes, s.chavepessoa
      ),
      gastos_json AS (
        SELECT mes,
        COALESCE(
          jsonb_object_agg(chaveusuario::text, COALESCE(total_gastos,0))
          FILTER (WHERE chaveusuario IS NOT NULL),
          '{}'::jsonb
        ) AS gastos_por_usuario
        FROM gastos_mes
        GROUP BY mes
      ),
      cartao_mes AS (
        SELECT m.mes, COALESCE(SUM(s.valor),0) AS cartao_credito
        FROM meses m
        LEFT JOIN saida s
          ON s.chavegrupo = $1
         AND s.datacad >= m.mes
         AND s.datacad < (m.mes + interval '1 month')
         AND (s.categoria ILIKE '%cart%' OR s.categoria ILIKE '%créd%')
        GROUP BY m.mes
      ),
      base_rend AS (
        SELECT
          m.mes,
          COALESCE(sf.chaveusuario, si.chaveusuario) AS chaveusuario,
          COALESCE(sf.saldo,0) AS saldo_final,
          COALESCE(si.saldo,0) AS saldo_inicial,
          COALESCE(a.total_aportes,0) AS aportes,
          COALESCE(r.total_retiradas,0) AS retiradas
        FROM meses m
        LEFT JOIN saldos sf
          ON sf.mes = m.mes
        LEFT JOIN saldos si
          ON si.mes = (m.mes - interval '1 month')
         AND si.chaveusuario = sf.chaveusuario
        LEFT JOIN aportes_mes a
          ON a.mes = m.mes
         AND a.chaveusuario = sf.chaveusuario
        LEFT JOIN retiradas_mes r
          ON r.mes = m.mes
         AND r.chaveusuario = sf.chaveusuario
      ),
      rend_user AS (
        SELECT mes, chaveusuario,
        (saldo_final - saldo_inicial) - (aportes - retiradas) AS rend_valor
        FROM base_rend
      ),
      rend_user_json AS (
        SELECT mes,
        COALESCE(
          jsonb_object_agg(chaveusuario::text, COALESCE(rend_valor,0))
          FILTER (WHERE chaveusuario IS NOT NULL),
          '{}'::jsonb
        ) AS rendimento_por_usuario
        FROM rend_user
        GROUP BY mes
      ),
      total_prev AS (
        SELECT t.mes,
               LAG(t.total_geral) OVER (ORDER BY t.mes) AS total_geral_prev
        FROM total_geral_mes t
      ),
      rend_geral AS (
        SELECT t.mes, t.total_geral,
               COALESCE(tp.total_geral_prev,0) AS total_prev,
               COALESCE( (SELECT SUM(total_aportes)
                          FROM aportes_mes a
                          WHERE a.mes = t.mes), 0) AS ap_mes,
               COALESCE( (SELECT SUM(total_retiradas)
                          FROM retiradas_mes r
                          WHERE r.mes = t.mes), 0) AS rt_mes
        FROM total_geral_mes t
        LEFT JOIN total_prev tp ON tp.mes = t.mes
      )
      SELECT m.mes,
             tpu.total_por_usuario,
             tgm.total_geral,
             cm.cartao_credito,
             (rg.total_geral - rg.total_prev) - (rg.ap_mes - rg.rt_mes) AS rendimento_valor,
             CASE
               WHEN (rg.total_prev + rg.ap_mes) > 0
               THEN (
                 (
                   (rg.total_geral - rg.total_prev) - (rg.ap_mes - rg.rt_mes)
                 )
                 / (rg.total_prev + rg.ap_mes)
               ) * 100
               ELSE 0
             END AS rendimento_percent_mes,
             ruj.rendimento_por_usuario,
             gj.gastos_por_usuario,
             aj.aportes_por_usuario
      FROM meses m
      LEFT JOIN total_por_usuario_json tpu ON tpu.mes = m.mes
      LEFT JOIN total_geral_mes          tgm ON tgm.mes = m.mes
      LEFT JOIN cartao_mes               cm  ON cm.mes  = m.mes
      LEFT JOIN rend_user_json           ruj ON ruj.mes = m.mes
      LEFT JOIN gastos_json              gj  ON gj.mes  = m.mes
      LEFT JOIN aportes_json             aj  ON aj.mes  = m.mes
      LEFT JOIN rend_geral               rg  ON rg.mes  = m.mes
      ORDER BY m.mes
    `;

    const r = await pool.query(sql, [grupoIdNum, inicioYM, fimYM]);
    res.json(r.rows);
  } catch (e) {
    console.error('Erro em GET /investimentos/resumo-mensal/:grupoId:', e);
    res.status(e.statusCode || 500).json({ erro: e.message });
  }
});

/**
 * GET /investimentos/saldos/:grupoId/:anoMes
 * Saldo acumulado de cada usuário até o mês, aportes/retiradas no mês etc.
 */
app.get('/investimentos/saldos/:grupoId/:anoMes', async (req, res) => {
  try {
    const { grupoId, anoMes } = req.params;
    const { inicio, fim } = parseAnoMesOuThrow(anoMes);

    const grupoIdNum = Number(grupoId);

    // saldo acumulado até fim do mês
    const saldos = await pool.query(
      `
      WITH mov AS (
        SELECT i.*
        FROM investimentos i
        WHERE i.chavegrupo = $1
          AND i.datacad < $2
      )
      SELECT u.chave AS usuarioid,
             u.nome,
             COALESCE(SUM(CASE WHEN m.tipo='aporte'   THEN m.valor ELSE 0 END),0)
           - COALESCE(SUM(CASE WHEN m.tipo='retirada' THEN m.valor ELSE 0 END),0) AS saldo
      FROM usuario u
      LEFT JOIN mov m ON m.chaveusuario = u.chave
      GROUP BY u.chave, u.nome
      ORDER BY u.nome ASC
      `,
      [grupoIdNum, fim.toISOString()]
    );

    // aportes no mês
    const aportesMes = await pool.query(
      `
      SELECT i.chaveusuario AS usuarioid, u.nome,
             COALESCE(SUM(i.valor),0) AS total
      FROM investimentos i
      JOIN usuario u ON u.chave = i.chaveusuario
      WHERE i.chavegrupo = $1
        AND i.tipo = 'aporte'
        AND i.datacad >= $2 AND i.datacad < $3
      GROUP BY i.chaveusuario, u.nome
      ORDER BY u.nome ASC
      `,
      [grupoIdNum, inicio.toISOString(), fim.toISOString()]
    );

    // retiradas no mês
    const retiradasMes = await pool.query(
      `
      SELECT i.chaveusuario AS usuarioid, u.nome,
             COALESCE(SUM(i.valor),0) AS total
      FROM investimentos i
      JOIN usuario u ON u.chave = i.chaveusuario
      WHERE i.chavegrupo = $1
        AND i.tipo = 'retirada'
        AND i.datacad >= $2 AND i.datacad < $3
      GROUP BY i.chaveusuario, u.nome
      ORDER BY u.nome ASC
      `,
      [grupoIdNum, inicio.toISOString(), fim.toISOString()]
    );

    res.json({
      saldosAteMes: saldos.rows,
      aportesMes: aportesMes.rows,
      retiradasMes: retiradasMes.rows,
    });
  } catch (e) {
    console.error('Erro em GET /investimentos/saldos/:grupoId/:anoMes:', e);
    res.status(e.statusCode || 500).json({ erro: e.message });
  }
});

// =====================
// ROTAS DE USUÁRIO
// =====================

app.post('/usuario', async (req, res) => {
  const { nome, email, senha } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO usuario (nome, email, senha)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [nome, email, senha]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao criar usuário:", err);
    res.status(500).json({ erro: err.message });
  }
});

app.post('/usuario/login', async (req, res) => {
  const { email, senha } = req.body;
  try {
    const result = await pool.query(
      `SELECT * FROM usuario WHERE email = $1 AND senha = $2`,
      [email, senha]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ erro: "E-mail ou senha inválidos" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Erro no login do usuário:", err);
    res.status(500).json({ erro: err.message });
  }
});

app.get('/usuario/por-email/:email', async (req, res) => {
  const { email } = req.params;
  try {
    const result = await pool.query(
      `SELECT chave, nome, email
       FROM usuario
       WHERE email = $1
       LIMIT 1`,
      [email]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ erro: "Usuário não encontrado" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao buscar usuário por email:", err);
    res.status(500).json({ erro: err.message });
  }
});

app.put('/usuario/:id', async (req, res) => {
  const { id } = req.params;
  const { nome, senha } = req.body;

  if (!nome && !senha) {
    return res.status(400).json({ erro: "Informe ao menos um campo para atualizar (nome ou senha)." });
  }

  try {
    const campos = [];
    const valores = [];
    let idx = 1;

    if (nome)  { campos.push(`nome = $${idx++}`);  valores.push(nome);  }
    if (senha) { campos.push(`senha = $${idx++}`); valores.push(senha); }

    valores.push(id);

    const result = await pool.query(
      `UPDATE usuario
       SET ${campos.join(', ')}
       WHERE chave = $${idx}
       RETURNING chave, nome, email`,
      valores
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ erro: "Usuário não encontrado para atualização." });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao atualizar usuário:", err);
    res.status(500).json({
      erro: "Erro ao atualizar usuário",
      detalhes: err.message,
    });
  }
});

// =====================
// ROTAS DE GRUPO
// =====================

/**
 * Retorna os grupos em que o usuário participa ou criou.
 * Também marca `soucriador` = true/false.
 */
app.get('/grupo/usuario/:usuarioId', async (req, res) => {
  const { usuarioId } = req.params;
  const usuarioNum = parseInt(usuarioId, 10);

  if (!usuarioNum) {
    return res.status(400).json({ erro: "Parametro 'usuarioId' inválido." });
  }

  try {
    const result = await pool.query(
      `SELECT DISTINCT g.*,
              CASE WHEN g.chaveusuariocriou = $1 THEN true ELSE false END AS soucriador
       FROM grupo g
       LEFT JOIN pessoasgrupo pg ON g.chave = pg.chavegrupo
       WHERE g.chaveusuariocriou = $1 OR pg.chaveusuario = $1
       ORDER BY g.chave DESC`,
      [usuarioNum]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar grupos do usuário:", err);
    res.status(500).json({ erro: err.message });
  }
});

app.post('/grupo', async (req, res) => {
  const { nome, descricao, chaveusuario } = req.body;
  const chaveUsuarioNum = Number(chaveusuario);

  if (!chaveUsuarioNum || !nome) {
    return res.status(400).json({ erro: "Informe 'nome' e 'chaveusuario'." });
  }

  try {
    // cria grupo
    const grupoResult = await pool.query(
      `INSERT INTO grupo (nome, descricao, criado_em, atualizado_em, chaveusuariocriou)
       VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $3)
       RETURNING *`,
      [nome, descricao || '', chaveUsuarioNum]
    );
    const grupoCriado = grupoResult.rows[0];

    // coloca criador como líder no grupo
    await pool.query(
      `INSERT INTO pessoasgrupo (chaveusuario, chavegrupo, lider)
       VALUES ($1, $2, true)`,
      [chaveUsuarioNum, grupoCriado.chave]
    );

    res.status(201).json(grupoCriado);
  } catch (err) {
    console.error("Erro ao criar grupo:", err);
    res.status(500).json({ erro: err.message });
  }
});

app.post('/grupo/adicionar-pessoa', async (req, res) => {
  const { email, chavegrupo } = req.body;
  const grupoNum = Number(chavegrupo);

  if (!email || !grupoNum) {
    return res.status(400).json({ erro: "Informe 'email' e 'chavegrupo'." });
    }

  try {
    // procura usuário pelo e-mail
    const usuarioResult = await pool.query(
      `SELECT chave FROM usuario WHERE email = $1 LIMIT 1`,
      [email]
    );
    if (usuarioResult.rows.length === 0) {
      return res.status(404).json({ erro: "Usuário não encontrado" });
    }
    const chaveusuario = usuarioResult.rows[0].chave;

    // já está no grupo?
    const jaExiste = await pool.query(
      `SELECT 1 FROM pessoasgrupo WHERE chaveusuario = $1 AND chavegrupo = $2`,
      [chaveusuario, grupoNum]
    );
    if (jaExiste.rows.length > 0) {
      return res.status(409).json({ erro: "Usuário já está no grupo" });
    }

    // adiciona
    await pool.query(
      `INSERT INTO pessoasgrupo (chaveusuario, chavegrupo, lider)
       VALUES ($1, $2, false)`,
      [chaveusuario, grupoNum]
    );

    res.status(201).json({ mensagem: "Usuário adicionado ao grupo com sucesso!" });
  } catch (err) {
    console.error("Erro ao adicionar pessoa ao grupo:", err);
    res.status(500).json({ erro: err.message });
  }
});

app.get('/grupo/:grupoId/membros', async (req, res) => {
  const { grupoId } = req.params;
  const grupoNum = parseInt(grupoId, 10);

  if (!grupoNum) {
    return res.status(400).json({ erro: "Parametro 'grupoId' inválido." });
  }

  try {
    const result = await pool.query(
      `SELECT u.nome, u.email, pg.lider
       FROM usuario u
       JOIN pessoasgrupo pg ON u.chave = pg.chaveusuario
       WHERE pg.chavegrupo = $1`,
      [grupoNum]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Erro ao listar membros do grupo:", err);
    res.status(500).json({ erro: err.message });
  }
});

// =====================
// INICIAR SERVIDOR
// =====================
app.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIp();
  console.log(`🟢 Servidor BTCF rodando na porta ${PORT}`);
  console.log(`     Acesse via: http://${ip}:${PORT}`);
});

// opcional, útil para testes automatizados
module.exports = app;
