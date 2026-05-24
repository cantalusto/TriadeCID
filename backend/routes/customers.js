// === SLIDE 21 — DATA MASKING ===
// === SLIDE 22 — AUDITORIA E LOGS ===
//
// Esta rota mostra a TÉCNICA DE MÁSCARA atravessando as 3 camadas:
//
//   1. BANCO DE DADOS (camada 3)  — guarda o dado completo.
//   2. BACK-END        (camada 2) — aplica a máscara (dbMasking.js).
//   3. FRONT-END       (camada 1) — só recebe e exibe o dado mascarado;
//                                   tem botão "revelar" para professor,
//                                   que dispara uma nova requisição
//                                   autenticada e auditada.
//
// O Princípio do Menor Privilégio (slide 21) vive aqui também:
//   - Aluno: jamais vê dado completo, mesmo com query string adulterada.
//   - Professor: só vê completo se pedir explicitamente (?reveal=true)
//                E cada revelação fica registrada na audit_log.

const express = require('express');
const { db, logAccess } = require('../usersDb');
const { maskCustomer } = require('../dbMasking');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/customers              → mascarado para todos
// GET /api/customers?reveal=true  → completo, SÓ professor, registra log
router.get('/', requireAuth, (req, res) => {
  const wantsReveal = req.query.reveal === 'true';

  const rows = db.prepare('SELECT * FROM customers').all();

  // ALUNO: não tem direito de revelar. Mesmo que mande ?reveal=true
  // na URL, ignoramos no servidor — front-end NUNCA é fonte de verdade
  // para regras de autorização (mesmo princípio do checkout).
  if (req.user.role !== 'professor') {
    logAccess({
      username: req.user.username,
      role: req.user.role,
      action: 'LIST_MASKED',
      target: `${rows.length} customers`,
    });
    return res.json({
      visaoDe: 'aluno',
      mascarado: true,
      explicacao: 'Aluno vê apenas dados mascarados — princípio do menor privilégio.',
      customers: rows.map(maskCustomer),
    });
  }

  // PROFESSOR: por padrão também recebe mascarado. Só ao pedir
  // explicitamente é que vê os dados completos — e o acesso fica
  // registrado na auditoria.
  if (!wantsReveal) {
    logAccess({
      username: req.user.username,
      role: req.user.role,
      action: 'LIST_MASKED',
      target: `${rows.length} customers`,
    });
    return res.json({
      visaoDe: 'professor',
      mascarado: true,
      dica: 'Adicione ?reveal=true para ver dados completos (será auditado).',
      customers: rows.map(maskCustomer),
    });
  }

  // PROFESSOR + reveal=true: dados completos + log de auditoria
  logAccess({
    username: req.user.username,
    role: req.user.role,
    action: 'LIST_REVEALED',
    target: `${rows.length} customers (cpf, credit_card, phone em texto pleno)`,
  });

  res.json({
    visaoDe: 'professor',
    mascarado: false,
    aviso: 'Dados sensíveis em texto pleno. Acesso registrado na auditoria.',
    customers: rows,
  });
});

// GET /api/audit-log  →  só professor.
// Painel forense (slide 22): "se ocorrer um vazamento, os logs do
// banco de dados são fundamentais para a investigação".
router.get('/audit-log', requireAuth, requireRole('professor'), (_req, res) => {
  const rows = db
    .prepare('SELECT * FROM data_access_log ORDER BY id DESC LIMIT 50')
    .all();
  res.json({
    total: rows.length,
    entries: rows,
  });
});

module.exports = router;
