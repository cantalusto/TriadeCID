const express = require('express');
const { products } = require('../database');

const router = express.Router();

router.get('/', (_req, res) => {
  const list = [...products.values()].map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    stock: p.stock,
  }));
  res.json(list);
});

// === PILAR: DISPONIBILIDADE ===
// Endpoint de processamento pesado (simula cálculo de relatório/analytics).
// Sem cluster + rate-limiting, uma enxurrada aqui travaria o servidor.
// Retornamos process.pid para evidenciar o balanceamento entre workers.
router.get('/report', (_req, res) => {
  const start = Date.now();
  let acc = 0;
  for (let i = 0; i < 5e7; i++) acc += Math.sqrt(i);

  res.json({
    workerPid: process.pid,
    elapsedMs: Date.now() - start,
    sample: Number(acc.toFixed(2)),
    totalProducts: products.size,
  });
});

module.exports = router;
