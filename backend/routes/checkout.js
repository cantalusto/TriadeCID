const express = require('express');
const { products, coupons } = require('../database');

const router = express.Router();

// === PILAR: INTEGRIDADE ===
// Regra de ouro: o servidor NUNCA confia em preços, totais ou descontos
// enviados pelo cliente. Ele recebe apenas { id, quantity } e recalcula
// tudo com base no banco de dados.
// Se o front-end mandar "total: 0.01" tentando fraudar, é ignorado.

router.post('/', (req, res) => {
  const { items, couponCode } = req.body || {};

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Carrinho vazio ou inválido.' });
  }

  const validated = [];
  let subtotal = 0;

  for (const raw of items) {
    const qty = Number.isInteger(raw?.quantity) ? raw.quantity : 0;
    if (qty <= 0 || qty > 100) {
      return res.status(400).json({
        error: `Quantidade inválida para o item "${raw?.id}".`,
      });
    }

    const product = products.get(String(raw?.id));
    if (!product) {
      return res.status(404).json({
        error: `Produto não encontrado: "${raw?.id}".`,
      });
    }
    if (product.stock < qty) {
      return res.status(409).json({
        error: `Estoque insuficiente para "${product.name}".`,
      });
    }

    const lineTotal = product.price * qty;
    subtotal += lineTotal;

    validated.push({
      id: product.id,
      name: product.name,
      unitPrice: product.price, // preço do BANCO, não do cliente
      quantity: qty,
      lineTotal: Number(lineTotal.toFixed(2)),
    });
  }

  let discount = 0;
  let appliedCoupon = null;
  if (couponCode) {
    const coupon = coupons.get(String(couponCode).toUpperCase());
    if (!coupon) {
      return res.status(400).json({ error: 'Cupom inválido.' });
    }
    discount = subtotal * coupon.discount;
    appliedCoupon = coupon.code;
  }

  const total = subtotal - discount;

  // O que o cliente enviou em `req.body.total` é ignorado de propósito.
  // A resposta carrega apenas o valor autoritativo calculado pelo servidor.
  res.json({
    items: validated,
    subtotal: Number(subtotal.toFixed(2)),
    discount: Number(discount.toFixed(2)),
    appliedCoupon,
    total: Number(total.toFixed(2)),
    clientTriedTotal: req.body?.total ?? null, // só para a demonstração visual
    calculatedBy: 'server',
  });
});

module.exports = router;
