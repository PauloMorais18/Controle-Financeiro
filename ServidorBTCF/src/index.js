const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Servidor BTCF está rodando!');
});

app.get('/testdb', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      status: 'ok',
      message: 'Conexão com o banco bem-sucedida!',
      timestamp: result.rows[0].now,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Erro na conexão com o banco',
      error: error.message,
    });
  }
});

app.get('/entrada', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "entrada" ORDER BY chave DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.post('/entrada', async (req, res) => {
  const { tipo, valor, descricao, qtdeparc, valorparc, datafimparc } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO "entrada" (tipo, valor, descricao, datacad, qtdeparc, valorparc, datafimparc)
       VALUES ($1, $2, $3, NOW(), $4, $5, $6) RETURNING *`,
      [tipo, valor, descricao, qtdeparc, valorparc, datafimparc]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.get('/saida', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "saida" ORDER BY chave DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.post('/saida', async (req, res) => {
  const { tipo, valor, descricao, qtdeparc, valorparc, datafimparc } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO "saida" (tipo, valor, descricao, datacad, qtdeparc, valorparc, datafimparc)
       VALUES ($1, $2, $3, NOW(), $4, $5, $6) RETURNING *`,
      [tipo, valor, descricao, qtdeparc, valorparc, datafimparc]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.post('/usuario', async (req, res) => {
  const { nome, email, senha } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO "usuario" (nome, email, senha)
       VALUES ($1, $2, $3) RETURNING *`,
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
    const result = await pool.query(
      `SELECT * FROM "usuario" WHERE email = $1 AND senha = $2`,
      [email, senha]
    );
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
      `SELECT chave FROM "usuario" WHERE email = $1 LIMIT 1`,
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

app.get('/grupo', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "grupo" ORDER BY chave DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.get('/grupo/usuario/:usuarioId', async (req, res) => {
  const { usuarioId } = req.params;
  try {
    const result = await pool.query(
      `SELECT g.* FROM "grupo" g
       JOIN "pessoasgrupo" pg ON g.chave = pg.chavegrupo
       WHERE pg.chaveusuario = $1 ORDER BY g.chave DESC`,
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
      `INSERT INTO "grupo" (nome, descricao, criado_em, atualizado_em)
       VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING *`,
      [nome, descricao]
    );

    const grupoCriado = grupoResult.rows[0];

    await pool.query(
      `INSERT INTO "pessoasgrupo" (chaveusuario, chavegrupo, lider)
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
      `SELECT chave FROM "usuario" WHERE email = $1 LIMIT 1`,
      [email]
    );

    if (usuarioResult.rows.length === 0) {
      return res.status(404).json({ erro: "Usuário não encontrado" });
    }

    const chaveusuario = usuarioResult.rows[0].chave;

    const jaExiste = await pool.query(
      `SELECT * FROM "pessoasgrupo" WHERE chaveusuario = $1 AND chavegrupo = $2`,
      [chaveusuario, chavegrupo]
    );

    if (jaExiste.rows.length > 0) {
      return res.status(409).json({ erro: "Usuário já está no grupo" });
    }

    await pool.query(
      `INSERT INTO "pessoasgrupo" (chaveusuario, chavegrupo, lider)
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
      `SELECT u.nome, u.email, pg.lider FROM "usuario" u
       JOIN "pessoasgrupo" pg ON u.chave = pg.chaveusuario
       WHERE pg.chavegrupo = $1`,
      [grupoId]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🟢 Servidor BTCF rodando na porta ${PORT}`);
});
