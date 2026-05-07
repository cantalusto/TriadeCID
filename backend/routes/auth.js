// === SLIDE 17: SQL INJECTION (ATAQUE E DEFESA) ===
// Aqui vivem DUAS rotas de login lado a lado, propositalmente:
//
//   POST /api/login-vulneravel  → concatena strings na query (ERRADO)
//   POST /api/login-seguro      → usa prepared statement (CORRETO)
//
// O aluno ataca a primeira com `admin' --` e vê funcionar.
// Tenta o mesmo na segunda e vê ser bloqueado. É a aula do slide 17
// virando código rodando.

const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');

const { db } = require('../usersDb');
const { signToken, requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Rate limit específico de autenticação (slide 13: anti-força-bruta).
// 10 tentativas por minuto por IP. O `globalLimiter` já roda antes;
// este aqui é a camada extra que o slide pede.
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de login. Aguarde 1 minuto.' },
});

// ======================================================================
// ROTA 1 — VULNERÁVEL (NÃO FAÇA ISSO EM PRODUÇÃO)
// ======================================================================
// O servidor monta a query SQL concatenando o que o cliente digitou.
// Para o atacante, os campos do formulário deixam de ser "texto" e
// passam a ser parte do COMANDO SQL.
//
// Ataque clássico: username = `admin' --`
//   SELECT * FROM users WHERE username='admin' --' AND password_hash='qualquer'
//   → o `--` comenta o resto. O filtro de senha some. Login feito sem senha.
router.post('/login-vulneravel', loginLimiter, (req, res) => {
  const { username, password } = req.body || {};

  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Credenciais inválidas.' });
  }

  // ⚠️ A linha abaixo é a falha. Concatenação direta = porta aberta.
  const sql = `SELECT id, username, role FROM users WHERE username='${username}' AND password_hash='${password}'`;

  let row;
  try {
    row = db.prepare(sql).get();
  } catch (e) {
    return res.status(400).json({
      error: 'Erro ao executar SQL.',
      sqlExecutada: sql,        // exposto DE PROPÓSITO para a aula
      detalhe: e.message,
    });
  }

  if (!row) {
    return res.status(401).json({
      error: 'Usuário ou senha inválidos.',
      sqlExecutada: sql,        // exposto DE PROPÓSITO para a aula
    });
  }

  const token = signToken(row);
  return res.json({
    ok: true,
    aviso: 'LOGIN POR ROTA VULNERÁVEL — nunca use em produção.',
    sqlExecutada: sql,
    user: row,
    token,
  });
});

// ======================================================================
// ROTA 2 — SEGURA (Prepared Statement + hash de senha)
// ======================================================================
// O `?` é um placeholder. O banco trata o valor SEMPRE como dado, nunca
// como comando. Mesmo que o usuário digite `admin' --`, o banco vai
// procurar literalmente um username chamado `admin' --` (e não achar).
router.post('/login-seguro', loginLimiter, (req, res) => {
  const { username, password } = req.body || {};

  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Credenciais inválidas.' });
  }

  const sqlMolde = 'SELECT id, username, role, password_hash FROM users WHERE username = ?';
  const row = db.prepare(sqlMolde).get(username);

  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    return res.status(401).json({
      error: 'Usuário ou senha inválidos.',
      sqlMolde,                 // mostra o molde, sem o dado interpolado
      dadoSeparado: username,   // o dado vai pelo "outro canal"
    });
  }

  const safeUser = { id: row.id, username: row.username, role: row.role };
  const token = signToken(safeUser);
  return res.json({
    ok: true,
    sqlMolde,
    user: safeUser,
    token,
  });
});

// ======================================================================
// SLIDE 16: USO E VALIDAÇÃO DO JWT
// ======================================================================

// Devolve o que o servidor "leu" do token. Útil para o aluno comparar
// com o payload decodificado em jwt.io.
router.get('/me', requireAuth, (req, res) => {
  res.json({
    mensagem: 'Token validado pela assinatura.',
    payloadDecodificado: req.user,
  });
});

// Rota protegida + RBAC (slide 12). Aluno vê só as próprias notas;
// professor vê todas.
router.get('/secrets', requireAuth, (req, res) => {
  if (req.user.role === 'professor') {
    const rows = db.prepare('SELECT id, owner, content FROM secret_notes').all();
    return res.json({ visaoDe: 'professor', notas: rows });
  }
  const rows = db
    .prepare('SELECT id, owner, content FROM secret_notes WHERE owner = ?')
    .all(req.user.username);
  res.json({ visaoDe: 'aluno', notas: rows });
});

// Rota só para professor — demonstra requireRole.
router.get('/admin', requireAuth, requireRole('professor'), (_req, res) => {
  res.json({ mensagem: 'Bem-vindo, professor. Área restrita.' });
});

module.exports = router;
