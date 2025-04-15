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

// ✅ Rota para testar conexão com o banco de dados
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

app.get('/transacoes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM transacoes');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ➕ Rota para adicionar transações
app.post('/transacoes', async (req, res) => {
  const { tipo, valor, descricao } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO transacoes (tipo, valor, descricao) VALUES ($1, $2, $3) RETURNING *',
      [tipo, valor, descricao]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🟢 Servidor BTCF rodando na porta ${PORT}`);
});
