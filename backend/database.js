// "Banco de dados" simulado em memória.
// IMPORTANTE (Integridade): os preços existem APENAS aqui no servidor.
// O front-end nunca é fonte de verdade para valores monetários.

const products = new Map([
  ['p1', { id: 'p1', name: 'Notebook',         price: 3500.00, stock: 10 }],
  ['p2', { id: 'p2', name: 'Mouse Gamer',      price:  150.00, stock: 50 }],
  ['p3', { id: 'p3', name: 'Teclado Mecânico', price:  450.00, stock: 25 }],
  ['p4', { id: 'p4', name: 'Monitor 27"',      price: 1800.00, stock:  8 }],
  ['p5', { id: 'p5', name: 'Headset',          price:  320.00, stock: 15 }],
]);

const coupons = new Map([
  ['DESCONTO10',  { code: 'DESCONTO10',  discount: 0.10 }],
  ['BLACKFRIDAY', { code: 'BLACKFRIDAY', discount: 0.25 }],
]);

module.exports = { products, coupons };
