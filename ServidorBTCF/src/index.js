const express = require('express');
const cors = require('cors');
const pool = require('./db'); // Certifique-se de que seu arquivo db.js está configurado corretamente

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

// ===== GRÁFICO DE GASTOS (AGRUPADO POR TIPO) =====
app.get('/grafico/gastos/:grupoId/:anoMes', async (req, res) => {
    const { grupoId, anoMes } = req.params;
    try {
        const result = await pool.query(
            `SELECT tipo, SUM(valor) AS total
             FROM (
                SELECT 'entrada' AS tipo, valor, datacad, chavegrupo FROM entrada
                UNION ALL
                SELECT 'saida' AS tipo, valor, datacad, chavegrupo FROM saida
             ) AS transacoes
             WHERE to_char(datacad, 'YYYY-MM') = $1
               AND chavegrupo = $2
             GROUP BY tipo`,
            [anoMes, grupoId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ erro: 'Erro ao buscar totais', detalhes: err.message });
    }
});

// GET /grafico/despesas-por-categoria/:grupoId/:anoMes
// Busca despesas agrupadas por categoria para o gráfico de pizza
app.get('/grafico/despesas-por-categoria/:grupoId/:anoMes', async (req, res) => {
    const { grupoId, anoMes } = req.params;
    try {
        const result = await pool.query(
            `SELECT categoria, SUM(valor) AS total
             FROM saida
             WHERE to_char(datacad, 'YYYY-MM') = $1
               AND chavegrupo = $2
             GROUP BY categoria`,
            [anoMes, grupoId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Erro ao buscar despesas por categoria:", err);
        res.status(500).json({ erro: 'Erro ao buscar despesas por categoria', detalhes: err.message });
    }
});

// ===== HISTÓRICO DE TRANSAÇÕES DO GRUPO =====
app.get('/transacoes/:grupoId/:anoMes', async (req, res) => {
    const { grupoId, anoMes } = req.params;
    try {
        const result = await pool.query(
            `SELECT tipo, valor, descricao, datacad
             FROM (
                SELECT 'entrada' AS tipo, valor, descricao, datacad, chavegrupo FROM entrada
                UNION ALL
                SELECT 'saida' AS tipo, valor, descricao, datacad, chavegrupo FROM saida
             ) AS transacoes
             WHERE to_char(datacad, 'YYYY-MM') = $1
               AND chavegrupo = $2
             ORDER BY datacad DESC`,
            [anoMes, grupoId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ erro: 'Erro ao buscar transações', detalhes: err.message });
    }
});

// ===== ENTRADAS =====
// GET /entrada - Retorna todas as entradas de uma pessoa, incluindo a categoria
app.get('/entrada', async (req, res) => {
    const { chavepessoa } = req.query;

    if (!chavepessoa) {
        return res.status(400).json({ erro: "Parâmetro 'chavepessoa' é obrigatório." });
    }

    try {
        const result = await pool.query(
            'SELECT *, categoria FROM entrada WHERE chavepessoa = $1 ORDER BY chave DESC',
            [chavepessoa]
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Erro ao buscar entradas:", err); // Adicionado log de erro
        res.status(500).json({ erro: err.message });
    }
});

// POST /entrada - Insere uma nova entrada, incluindo a categoria
app.post('/entrada', async (req, res) => {
    const {
        tipo, valor, descricao, qtdeparc, valorparc,
        datafimparc, chavepessoa, chavegrupo, categoria // Categoria adicionada aqui
    } = req.body;

    console.log("📥 Dados recebidos em /entrada:", {
        tipo, valor, descricao, qtdeparc, valorparc,
        datafimparc, chavepessoa, chavegrupo, categoria
    });

    // Verificação de tipos
    const chavePessoaNum = Number(chavepessoa);
    const chaveGrupoNum = Number(chavegrupo);

    if (!Number.isInteger(chavePessoaNum)) {
        return res.status(400).json({ erro: "Campo 'chavepessoa' deve ser um número inteiro." });
    }

    if (!Number.isInteger(chaveGrupoNum)) {
        return res.status(400).json({ erro: "Campo 'chavegrupo' deve ser um número inteiro." });
    }

    try {
        const verifica = await pool.query(
            `SELECT 1 FROM pessoasgrupo WHERE chaveusuario = $1 AND chavegrupo = $2`,
            [chavePessoaNum, chaveGrupoNum]
        );

        if (verifica.rows.length === 0) {
            console.warn("⚠️ Usuário não pertence ao grupo:", { chavePessoaNum, chaveGrupoNum });
            return res.status(403).json({ erro: "Usuário não pertence ao grupo informado." });
        }

        const resultado = await pool.query(
            `INSERT INTO entrada
             (tipo, valor, descricao, datacad, qtdeparc, valorparc, datafimparc, chavepessoa, chavegrupo, categoria)
             VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [tipo, valor, descricao, qtdeparc, valorparc, datafimparc, chavePessoaNum, chaveGrupoNum, categoria]
        );

        console.log("✅ Entrada salva com sucesso:", resultado.rows[0]);
        res.status(201).json(resultado.rows[0]);

    } catch (err) {
        console.error("❌ Erro ao salvar entrada:", err);
        res.status(500).json({ erro: "Erro ao salvar entrada", detalhes: err.message });
    }
});


// ===== SAÍDAS =====
// GET /saida - Retorna todas as saídas de uma pessoa, incluindo a categoria
app.get('/saida', async (req, res) => {
    const { chavepessoa } = req.query;

    if (!chavepessoa) {
        return res.status(400).json({ erro: "Parâmetro 'chavepessoa' é obrigatório." });
    }

    try {
        const result = await pool.query(
            'SELECT *, categoria FROM saida WHERE chavepessoa = $1 ORDER BY chave DESC', // Categoria adicionada aqui
            [chavepessoa]
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Erro ao buscar saídas:", err); // Adicionado log de erro
        res.status(500).json({ erro: err.message });
    }
});

// POST /saida - Insere uma nova saída, incluindo a categoria
app.post('/saida', async (req, res) => {
    const {
        tipo, valor, descricao, qtdeparc, valorparc,
        datafimparc, chavepessoa, chavegrupo, categoria // Categoria adicionada aqui
    } = req.body;

    // Verificação de tipos (mantida a validação de 'number' para chavepessoa/chavegrupo)
    if (typeof chavepessoa !== 'number' || isNaN(chavepessoa)) {
        return res.status(400).json({ erro: "Campo 'chavepessoa' deve ser um número válido." });
    }

    if (typeof chavegrupo !== 'number' || isNaN(chavegrupo)) {
        return res.status(400).json({ erro: "Campo 'chavegrupo' deve ser um número válido." });
    }

    try {
        const verifica = await pool.query(
            `SELECT 1 FROM pessoasgrupo WHERE chaveusuario = $1 AND chavegrupo = $2`,
            [chavepessoa, chavegrupo]
        );

        if (verifica.rows.length === 0) {
            return res.status(403).json({ erro: "Usuário não pertence ao grupo informado." });
        }

        const result = await pool.query(
            `INSERT INTO saida
             (tipo, valor, descricao, datacad, qtdeparc, valorparc, datafimparc, chavepessoa, chavegrupo, categoria) // Categoria adicionada aqui
             VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [tipo, valor, descricao, qtdeparc, valorparc, datafimparc, chavepessoa, chavegrupo, categoria] // Categoria como $9
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("Erro ao inserir saída:", err); // Adicionado log de erro
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
        console.error("Erro ao criar usuário:", err); // Adicionado log de erro
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
        console.error("Erro no login do usuário:", err); // Adicionado log de erro
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
        console.error("Erro ao buscar usuário por email:", err); // Adicionado log de erro
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
        console.error("Erro ao atualizar usuário:", err); // Adicionado log de erro
        res.status(500).json({ erro: "Erro ao atualizar usuário", detalhes: err.message });
    }
});

// --- ROTAS PARA CATEGORIAS ---

// GET /categorias/:usuarioId/:tipo
// Busca categorias por usuário e tipo (entrada/saida)
app.get('/categorias/:usuarioId/:tipo', async (req, res) => {
    const { usuarioId, tipo } = req.params;
    try {
        const result = await pool.query(
            `SELECT chave, nome_categoria, tipo_transacao
             FROM categorias_usuario
             WHERE chaveusuario = $1 AND tipo_transacao = $2
             ORDER BY nome_categoria ASC`,
            [usuarioId, tipo]
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Erro ao buscar categorias:", err);
        res.status(500).json({ erro: 'Erro ao buscar categorias', detalhes: err.message });
    }
});

// POST /categorias
// Adiciona uma nova categoria
app.post('/categorias', async (req, res) => {
    const { chaveusuario, nome_categoria, tipo_transacao } = req.body;
    if (!chaveusuario || !nome_categoria || !tipo_transacao) {
        return res.status(400).json({ erro: "Campos 'chaveusuario', 'nome_categoria' e 'tipo_transacao' são obrigatórios." });
    }
    if (!['entrada', 'saida'].includes(tipo_transacao)) {
        return res.status(400).json({ erro: "Tipo de transação inválido. Deve ser 'entrada' ou 'saida'." });
    }

    try {
        const result = await pool.query(
            `INSERT INTO categorias_usuario (chaveusuario, nome_categoria, tipo_transacao)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [chaveusuario, nome_categoria, tipo_transacao]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') { // Código de erro para violação de UNIQUE constraint
            return res.status(409).json({ erro: "Categoria com este nome já existe para este tipo e usuário." });
        }
        console.error("Erro ao adicionar categoria:", err);
        res.status(500).json({ erro: 'Erro ao adicionar categoria', detalhes: err.message });
    }
});

// DELETE /categorias/:chave
// Deleta uma categoria
app.delete('/categorias/:chave', async (req, res) => {
    const { chave } = req.params;
    const { chaveusuario } = req.body; // Para validação de segurança

    if (!chaveusuario) {
        return res.status(400).json({ erro: "ID do usuário é obrigatório para exclusão." });
    }

    try {
        const result = await pool.query(
            `DELETE FROM categorias_usuario
             WHERE chave = $1 AND chaveusuario = $2
             RETURNING *`,
            [chave, chaveusuario]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ erro: "Categoria não encontrada ou você não tem permissão para excluí-la." });
        }
        res.status(200).json({ mensagem: "Categoria excluída com sucesso." });
    } catch (err) {
        console.error("Erro ao deletar categoria:", err);
        res.status(500).json({ erro: 'Erro ao deletar categoria', detalhes: err.message });
    }
});

// PUT /categorias/:chave
// Atualiza uma categoria existente
app.put('/categorias/:chave', async (req, res) => {
    const { chave } = req.params;
    const { nome_categoria, tipo_transacao, chaveusuario } = req.body;

    if (!nome_categoria || !tipo_transacao || !chaveusuario) {
        return res.status(400).json({ erro: "Campos 'nome_categoria', 'tipo_transacao' e 'chaveusuario' são obrigatórios para atualização." });
    }
    if (!['entrada', 'saida'].includes(tipo_transacao)) {
        return res.status(400).json({ erro: "Tipo de transação inválido. Deve ser 'entrada' ou 'saida'." });
    }

    try {
        const result = await pool.query(
            `UPDATE categorias_usuario
             SET nome_categoria = $1, tipo_transacao = $2
             WHERE chave = $3 AND chaveusuario = $4
             RETURNING *`,
            [nome_categoria, tipo_transacao, chave, chaveusuario]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ erro: "Categoria não encontrada ou você não tem permissão para atualizá-la." });
        }
        res.status(200).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') { // Código de erro para violação de UNIQUE constraint
            return res.status(409).json({ erro: "Categoria com este nome já existe para este tipo e usuário." });
        }
        console.error("Erro ao atualizar categoria:", err);
        res.status(500).json({ erro: 'Erro ao atualizar categoria', detalhes: err.message });
    }
});

// ===== GRUPO =====
// ✅ Rota para buscar grupos do usuário
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
        console.error("Erro ao buscar grupos do usuário:", err); // Adicionado log de erro
        res.status(500).json({ erro: err.message });
    }
});

// ✅ Criar novo grupo e adicionar criador como membro e líder
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
        console.error("Erro ao criar grupo:", err); // Adicionado log de erro
        res.status(500).json({ erro: err.message });
    }
});

// ✅ Adicionar pessoa a um grupo por e-mail
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
        console.error("Erro ao adicionar pessoa ao grupo:", err); // Adicionado log de erro
        res.status(500).json({ erro: err.message });
    }
});

// ✅ Listar membros de um grupo
app.get('/grupo/:grupoId/membros', async (req, res) => {
    const { grupoId } = req.params;
    try {
        const result = await pool.query(
            `SELECT u.nome, u.email, pg.lider
             FROM usuario u
             JOIN pessoasgrupo pg ON u.chave = pg.chaveusuario
             WHERE pg.chavegrupo = $1`,
            [grupoId]
        );
        res.status(200).json(result.rows);
    } catch (err) {
        console.error("Erro ao listar membros do grupo:", err); // Adicionado log de erro
        res.status(500).json({ erro: err.message });
    }
});

// ===== INICIAR SERVIDOR =====
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🟢 Servidor BTCF rodando na porta ${PORT}`);
    console.log(`     Acesse via: http://localhost:${PORT}`);
});
