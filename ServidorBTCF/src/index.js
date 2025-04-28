const express = require('express');
const cors = require('cors');
const pool = require('./db'); // conexão com PostgreSQL

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// 🌐 Rota de teste
app.get('/', (req, res) => {
  res.send('Servidor BTCF está rodando!');
});

// ✅ Teste de conexão com o banco
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

// 🔄 GET - Listar todas as entradas
app.get('/entrada', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "entrada" ORDER BY chave DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ➕ POST - Inserir nova entrada
app.post('/entrada', async (req, res) => {
  const { tipo, valor, descricao, qtdeparc, valorparc, datafimparc } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO "entrada" 
        (tipo, valor, descricao, datacad, qtdeparc, valorparc, datafimparc)
       VALUES ($1, $2, $3, NOW(), $4, $5, $6)
       RETURNING *`,
      [tipo, valor, descricao, qtdeparc, valorparc, datafimparc]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: err.message });
  }
});

// 🔄 GET - Listar todas as saídas
app.get('/saida', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "saida" ORDER BY chave DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ➕ POST - Inserir nova saída
app.post('/saida', async (req, res) => {
  const { tipo, valor, descricao, qtdeparc, valorparc, datafimparc } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO "saida" 
        (tipo, valor, descricao, datacad, qtdeparc, valorparc, datafimparc)
       VALUES ($1, $2, $3, NOW(), $4, $5, $6)
       RETURNING *`,
      [tipo, valor, descricao, qtdeparc, valorparc, datafimparc]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: err.message });
  }
});

// ➕ POST - Cadastrar novo usuário
app.post('/usuario', async (req, res) => {
  const { nome, email, senha } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO "usuario" (nome, email, senha)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [nome, email, senha]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: err.message });
  }
});

// 🔑 POST - Login do usuário
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

    const usuario = result.rows[0];
    res.json(usuario);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: err.message });
  }
});

// 🟢 Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🟢 Servidor BTCF rodando na porta ${PORT}`);
});
