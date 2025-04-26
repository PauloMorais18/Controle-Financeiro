const express = require('express');
const cors = require('cors');
const pool = require('./db');

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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🟢 Servidor BTCF rodando na porta ${PORT}`);
});
