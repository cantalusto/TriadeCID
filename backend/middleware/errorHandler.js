// === PILAR: CONFIDENCIALIDADE ===
// Garante que nenhuma chave de API, senha, token ou URL de conexão
// vaze para o cliente em mensagens de erro. O erro completo fica SOMENTE
// no log do servidor; o usuário recebe uma mensagem genérica e sanitizada.

const SECRET_PATTERNS = [
  /api[_-]?key\s*[:=]\s*[^\s,'"`]+/gi,
  /password\s*[:=]\s*[^\s,'"`]+/gi,
  /secret\s*[:=]\s*[^\s,'"`]+/gi,
  /token\s*[:=]\s*[^\s,'"`]+/gi,
  /bearer\s+[\w\-\.]+/gi,
  /postgres:\/\/[^\s]+/gi,
  /mongodb(\+srv)?:\/\/[^\s]+/gi,
  /mysql:\/\/[^\s]+/gi,
  /sk-[a-zA-Z0-9\-]+/g,
];

function sanitize(text) {
  if (typeof text !== 'string') return text;
  let out = text;
  for (const re of SECRET_PATTERNS) out = out.replace(re, '[REDACTED]');
  return out;
}

function errorHandler(err, req, res, _next) {
  // Log completo só no servidor.
  console.error(
    `[${new Date().toISOString()}] ${req.method} ${req.path} — ${err.stack || err.message}`
  );

  const status = err.status || err.statusCode || 500;

  // Resposta ao cliente: SEM stack trace, SEM detalhes de infraestrutura.
  const clientMessage =
    status >= 500
      ? 'Erro interno do servidor. Tente novamente mais tarde.'
      : sanitize(err.message || 'Requisição inválida');

  res.status(status).json({
    error: clientMessage,
    status,
  });
}

module.exports = { errorHandler, sanitize };
