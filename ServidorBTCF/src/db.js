const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'BTCF',
  password: 'BT_2025$',
  port: 5432,
});

pool.connect()
  .then(() => {
    console.log('🟢 Conexão com PostgreSQL bem-sucedida!');
  })
  .catch((err) => {
    console.error('🔴 Erro ao conectar ao PostgreSQL:', err.message);
  });

module.exports = pool;
