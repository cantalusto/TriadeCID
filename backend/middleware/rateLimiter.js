// === PILAR: DISPONIBILIDADE (apoio) ===
// Rate limiting bloqueia abuso (força-bruta, scraping, DoS leve) antes
// que ele derrube o servidor. Combinado ao cluster (cluster.js), forma
// a camada de disponibilidade.

const rateLimit = require('express-rate-limit');

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente em 1 minuto.' },
});

const heavyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Limite de operações pesadas atingido.' },
});

module.exports = { globalLimiter, heavyLimiter };
