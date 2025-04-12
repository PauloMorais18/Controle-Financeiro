const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Teste de rota
app.get('/', (req, res) => {
  res.send('Servidor rodando!');
});

// Exemplo de SELECT
app.get('/transacoes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM transacoes');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

// Exemplo de INSERT
app.post('/transacoes', async (req, res) => {
  const { tipo, valor, descricao } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO transacoes (tipo, valor, descricao) VALUES ($1, $2, $3) RETURNING *',
      [tipo, valor, descricao]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
