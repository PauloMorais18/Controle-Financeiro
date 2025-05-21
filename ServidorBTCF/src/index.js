const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// ===== RAIZ E TESTE =====
app.get('/', (req, res) => {
  res.send('Servidor BTCF está rodando!');
});

app.get('/testdb', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', message: 'Conexão bem-sucedida', timestamp: result.rows[0].now });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Erro na conexão', error: error.message });
  }
});

// ===== GRÁFICO DE GASTOS =====
app.get('/grafico/gastos/:grupoId/:anoMes', async (req, res) => {
  const { grupoId, anoMes } = req.params;
  try {
    const result = await pool.query(
      `SELECT tipo, SUM(valor) AS total
       FROM (
         SELECT 'entrada' AS tipo, valor, datacad, chavepessoa FROM entrada
         UNION ALL
         SELECT 'saida' AS tipo, valor, datacad, chavepessoa FROM saida
       ) AS transacoes
       WHERE to_char(datacad, 'YYYY-MM') = $1
         AND chavepessoa IN (
           SELECT chaveusuario FROM pessoasgrupo WHERE chavegrupo = $2
         )
       GROUP BY tipo`,
      [anoMes, grupoId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar totais', detalhes: err.message });
  }
});

app.get('/transacoes/:grupoId/:anoMes', async (req, res) => {
  const { grupoId, anoMes } = req.params;
  try {
    const result = await pool.query(
      `SELECT tipo, valor, descricao, datacad
       FROM (
         SELECT 'entrada' AS tipo, valor, descricao, datacad, chavepessoa FROM entrada
         UNION ALL
         SELECT 'saida' AS tipo, valor, descricao, datacad, chavepessoa FROM saida
       ) AS transacoes
       WHERE to_char(datacad, 'YYYY-MM') = $1
         AND chavepessoa IN (
           SELECT chaveusuario FROM pessoasgrupo WHERE chavegrupo = $2
         )
       ORDER BY datacad DESC`,
      [anoMes, grupoId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar transações', detalhes: err.message });
  }
});

// ===== ENTRADAS =====
app.get('/entrada', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM entrada ORDER BY chave DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.post('/entrada', async (req, res) => {
  const { tipo, valor, descricao, qtdeparc, valorparc, datafimparc, chavepessoa } = req.body;

  if (typeof chavepessoa !== 'number' || isNaN(chavepessoa)) {
    return res.status(400).json({ erro: "Campo 'chavepessoa' deve ser um número válido." });
  }

  try {
    const grupoRes = await pool.query(
      `SELECT chavegrupo FROM pessoasgrupo
       WHERE chaveusuario = $1
       ORDER BY lider DESC, criado_em ASC
       LIMIT 1`,
      [chavepessoa]
    );

    if (grupoRes.rows.length === 0) {
      return res.status(400).json({ erro: "Usuário não está vinculado a nenhum grupo." });
    }

    const chavegrupo = grupoRes.rows[0].chavegrupo;

    const result = await pool.query(
      `INSERT INTO entrada (tipo, valor, descricao, datacad, qtdeparc, valorparc, datafimparc, chavepessoa, chavegrupo)
       VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8)
       RETURNING *`,
      [tipo, valor, descricao, qtdeparc, valorparc, datafimparc, chavepessoa, chavegrupo]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: "Erro ao inserir entrada", detalhes: err.message });
  }
});

// ===== SAÍDAS =====
app.get('/saida', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM saida ORDER BY chave DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.post('/saida', async (req, res) => {
  const { tipo, valor, descricao, qtdeparc, valorparc, datafimparc, chavepessoa } = req.body;

  if (typeof chavepessoa !== 'number' || isNaN(chavepessoa)) {
    return res.status(400).json({ erro: "Campo 'chavepessoa' deve ser um número válido." });
  }

  try {
    const grupoRes = await pool.query(
      `SELECT chavegrupo FROM pessoasgrupo
       WHERE chaveusuario = $1
       ORDER BY lider DESC, criado_em ASC
       LIMIT 1`,
      [chavepessoa]
    );

    if (grupoRes.rows.length === 0) {
      return res.status(400).json({ erro: "Usuário não está vinculado a nenhum grupo." });
    }

    const chavegrupo = grupoRes.rows[0].chavegrupo;

    const result = await pool.query(
      `INSERT INTO saida (tipo, valor, descricao, datacad, qtdeparc, valorparc, datafimparc, chavepessoa, chavegrupo)
       VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8)
       RETURNING *`,
      [tipo, valor, descricao, qtdeparc, valorparc, datafimparc, chavepessoa, chavegrupo]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: "Erro ao inserir saída", detalhes: err.message });
  }
});

// ===== USUÁRIO =====
app.post('/usuario', async (req, res) => {
  const { nome, email, senha } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO usuario (nome, email, senha) VALUES ($1, $2, $3) RETURNING *`,
      [nome, email, senha]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.post('/usuario/login', async (req, res) => {
  const { email, senha } = req.body;
  try {
    const result = await pool.query(`SELECT * FROM usuario WHERE email = $1 AND senha = $2`, [email, senha]);
    if (result.rows.length === 0) {
      return res.status(401).json({ erro: "E-mail ou senha inválidos" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.get('/usuario/por-email/:email', async (req, res) => {
  const { email } = req.params;
  try {
    const result = await pool.query(
      `SELECT chave, nome, email FROM usuario WHERE email = $1 LIMIT 1`,
      [email]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ erro: "Usuário não encontrado" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ===== ATUALIZAÇÃO DE USUÁRIO (nome e/ou senha) =====
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

    if (nome) {
      campos.push(`nome = $${idx++}`);
      valores.push(nome);
    }
    if (senha) {
      campos.push(`senha = $${idx++}`);
      valores.push(senha);
    }

    valores.push(id);

    const result = await pool.query(
      `UPDATE usuario SET ${campos.join(', ')} WHERE chave = $${idx} RETURNING chave, nome, email`,
      valores
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ erro: "Usuário não encontrado para atualização." });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: "Erro ao atualizar usuário", detalhes: err.message });
  }
});

// ===== GRUPO =====
app.get('/grupo', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM grupo ORDER BY chave DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.get('/grupo/usuario/:usuarioId', async (req, res) => {
  const { usuarioId } = req.params;
  try {
    const result = await pool.query(
      `SELECT DISTINCT g.*, 
              CASE WHEN g.chaveusuariocriou = $1 THEN true ELSE false END AS soucriador
         FROM grupo g
         LEFT JOIN pessoasgrupo pg ON g.chave = pg.chavegrupo
        WHERE g.chaveusuariocriou = $1 OR pg.chaveusuario = $1
        ORDER BY g.chave DESC`,
      [usuarioId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.post('/grupo', async (req, res) => {
  const { nome, descricao, chaveusuario } = req.body;
  try {
    const grupoResult = await pool.query(
      `INSERT INTO grupo (nome, descricao, criado_em, atualizado_em, chaveusuariocriou)
       VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $3) RETURNING *`,
      [nome, descricao, chaveusuario]
    );
    const grupoCriado = grupoResult.rows[0];
    await pool.query(
      `INSERT INTO pessoasgrupo (chaveusuario, chavegrupo, lider)
       VALUES ($1, $2, true)`,
      [chaveusuario, grupoCriado.chave]
    );
    res.status(201).json(grupoCriado);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.post('/grupo/adicionar-pessoa', async (req, res) => {
  const { email, chavegrupo } = req.body;
  try {
    const usuarioResult = await pool.query(
      `SELECT chave FROM usuario WHERE email = $1 LIMIT 1`,
      [email]
    );
    if (usuarioResult.rows.length === 0) {
      return res.status(404).json({ erro: "Usuário não encontrado" });
    }

    const chaveusuario = usuarioResult.rows[0].chave;
    const jaExiste = await pool.query(
      `SELECT 1 FROM pessoasgrupo WHERE chaveusuario = $1 AND chavegrupo = $2`,
      [chaveusuario, chavegrupo]
    );

    if (jaExiste.rows.length > 0) {
      return res.status(409).json({ erro: "Usuário já está no grupo" });
    }

    await pool.query(
      `INSERT INTO pessoasgrupo (chaveusuario, chavegrupo, lider)
       VALUES ($1, $2, false)`,
      [chaveusuario, chavegrupo]
    );

    res.status(201).json({ mensagem: "Usuário adicionado ao grupo com sucesso!" });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.get('/grupo/:grupoId/membros', async (req, res) => {
  const { grupoId } = req.params;
  try {
    const result = await pool.query(
      `SELECT u.nome, u.email, pg.lider FROM usuario u
       JOIN pessoasgrupo pg ON u.chave = pg.chaveusuario
       WHERE pg.chavegrupo = $1`,
      [grupoId]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ===== INICIAR SERVIDOR =====
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🟢 Servidor BTCF rodando na porta ${PORT}`);
  console.log(`    Acesse via: http://localhost:${PORT}`);
});
