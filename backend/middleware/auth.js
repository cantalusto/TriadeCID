// === SLIDE 16: AUTENTICAÇÃO COM JWT ===
// Fluxo: Login → Emissão (servidor assina) → Uso (browser envia no header)
// → Validação (servidor confere a assinatura).
//
// Estrutura do token: Header.Payload.Signature
//   - Header: algoritmo (HS256)
//   - Payload: dados públicos (id, username, role) — NUNCA senha
//   - Signature: HMAC com JWT_SECRET — só o servidor consegue gerar
//
// Se alguém alterar o payload (ex: trocar role:"aluno" por "professor"),
// a assinatura quebra e o token é rejeitado.

const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'aula-fallback-trocar-em-prod';
const EXPIRES_IN = '15m';

function signToken(user) {
  // Payload: SOMENTE dados que podem ser públicos. Qualquer um consegue
  // ler o payload de um JWT (basta um Base64 decode); a assinatura
  // garante apenas que o conteúdo não foi alterado.
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    SECRET,
    { expiresIn: EXPIRES_IN }
  );
}

// Middleware: protege rotas. Exige Authorization: Bearer <token>.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Token ausente. Envie Authorization: Bearer <token>.' });
  }

  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch (e) {
    // Não revelamos o motivo exato (expirado vs assinatura inválida)
    // para não dar pistas a quem está tentando forjar tokens.
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
}

// Middleware adicional: exige role específico (RBAC — slide 12).
function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.role !== role) {
      return res.status(403).json({ error: `Acesso restrito a ${role}.` });
    }
    next();
  };
}

module.exports = { signToken, requireAuth, requireRole, SECRET };
