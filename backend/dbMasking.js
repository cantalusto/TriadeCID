// === SLIDE 21: DATA MASKING (Mascaramento de Dados) ===
//
// A camada de armazenamento (banco) guarda o dado COMPLETO.
// A camada de back-end aplica a máscara ANTES de devolver para o front,
// conforme o papel (role) do usuário.
//
// Em produção isso é fundamental: desenvolvedores, suporte e analistas
// não precisam — e não devem — ver o CPF ou cartão de crédito de um
// cliente em texto pleno só porque estão olhando uma tela.
//
// Cada função abaixo trata um tipo de dado. Mostram a parte mínima
// necessária para identificar o registro (últimos 2 dígitos do CPF,
// últimos 4 do cartão) e ocultam o resto com '*'.

function maskCPF(cpf) {
  // 12345678901 → ***.***.***-01
  const digits = String(cpf).replace(/\D/g, '').padStart(11, '0');
  return `***.***.***-${digits.slice(-2)}`;
}

function maskCreditCard(card) {
  // 4539578763621486 → **** **** **** 1486
  const digits = String(card).replace(/\D/g, '');
  const last4 = digits.slice(-4);
  return `**** **** **** ${last4}`;
}

function maskEmail(email) {
  // ana.souza@email.com → a***@email.com
  const [local, domain] = String(email).split('@');
  if (!domain) return '***';
  const visible = local.slice(0, 1);
  return `${visible}***@${domain}`;
}

function maskPhone(phone) {
  // 11987654321 → (11) ****-4321
  const digits = String(phone).replace(/\D/g, '');
  const ddd = digits.slice(0, 2);
  const last4 = digits.slice(-4);
  return `(${ddd}) ****-${last4}`;
}

// Aplica a máscara em um cliente inteiro. Sempre retorna nome e e-mail
// visíveis (nome quase nunca é considerado dado sensível e e-mail é só
// parcialmente mascarado para preservar contato).
function maskCustomer(customer) {
  return {
    id: customer.id,
    name: customer.name,
    email: maskEmail(customer.email),
    cpf: maskCPF(customer.cpf),
    phone: maskPhone(customer.phone),
    credit_card: maskCreditCard(customer.credit_card),
    masked: true,
  };
}

module.exports = {
  maskCPF,
  maskCreditCard,
  maskEmail,
  maskPhone,
  maskCustomer,
};
