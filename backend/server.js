require('dotenv').config();

const path = require('path');
const express = require('express');
const helmet = require('helmet');

const { errorHandler } = require('./middleware/errorHandler');
const { globalLimiter, heavyLimiter } = require('./middleware/rateLimiter');
const productsRoute = require('./routes/products');
const checkoutRoute = require('./routes/checkout');
const authRoute = require('./routes/auth');
const { init: initUsersDb } = require('./usersDb');

const app = express();

// helmet define headers de segurança (CSP, X-Frame-Options, etc.)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // inline só para a página de demo
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  })
);
app.use(express.json({ limit: '10kb' })); // limite protege contra payload abuse
app.use(globalLimiter);

// Página de demonstração (front-end).
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', workerPid: process.pid, uptime: process.uptime() });
});

// === DEMO DE CONFIDENCIALIDADE ===
// Rota que DE PROPÓSITO lança um erro contendo segredos. O errorHandler
// precisa redigi-los. Sem sanitização, esse texto apareceria no browser.
app.get('/api/leak-demo', (_req, _res, next) => {
  const err = new Error(
    `DB connection failed at postgres://admin:${process.env.DB_PASSWORD}@db.local:5432/app | ` +
      `api_key=${process.env.API_KEY} | ` +
      `Authorization: Bearer ${process.env.JWT_SECRET}`
  );
  err.status = 500;
  next(err);
});

// === DEMO DE DISPONIBILIDADE (rota pesada) ===
// Limite extra específico para a rota que gasta CPU.
app.use('/api/products/report', heavyLimiter);

app.use('/api/products', productsRoute);
app.use('/api/checkout', checkoutRoute);
app.use('/api', authRoute); // /api/login-vulneravel, /api/login-seguro, /api/me, /api/secrets, /api/admin

// 404 genérico (sem revelar rotas internas).
app.use((_req, res) => {
  res.status(404).json({ error: 'Recurso não encontrado.' });
});

// Handler de erros central — SEMPRE por último.
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 3000;

// Inicializa o SQLite (WASM) ANTES de aceitar conexões. Caso contrário
// as rotas /api/login-* tentariam consultar um db ainda não criado.
initUsersDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`[worker ${process.pid}] escutando em http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Falha ao inicializar o banco SQLite:', err);
    process.exit(1);
  });

module.exports = app;
