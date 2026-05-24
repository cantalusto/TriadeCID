# Segurança em Sistemas da Informação — Demonstração Prática

Material de aula para o módulo **Segurança em Sistemas da Informação**.
Cada conceito dos slides vira uma rota clicável no navegador.

## O que está coberto

| Slide | Tema | Onde mexer no código |
|---|---|---|
| 4 | Tríade CID | `routes/checkout.js`, `middleware/errorHandler.js`, `cluster.js` |
| 8-10 | UX defensiva (máscaras, popups, botão desabilitado, CSP) | `frontend/index.html` + helmet em `server.js` |
| 13 | Rate limiting (geral + anti-força-bruta) | `middleware/rateLimiter.js`, `routes/auth.js` |
| 14 | Tríade CID no back-end | rotas + `cluster.js` |
| 15-16 | Autenticação com JWT (Header.Payload.Signature + RBAC) | `middleware/auth.js`, `routes/auth.js` |
| 17 | SQL Injection: ataque vs Prepared Statement | `routes/auth.js` (rotas `login-vulneravel` e `login-seguro`) |
| **21 (3º ciclo)** | **Data Masking** atravessando front + back + banco | `dbMasking.js`, `routes/customers.js` |
| **22 (3º ciclo)** | **Auditoria e Logs** (forense de acessos) | tabela `data_access_log`, `GET /api/customers/audit-log` |

## Estrutura

```text
backend/
├── cluster.js              # Disponibilidade: fork de workers
├── server.js               # App Express + helmet + rotas
├── database.js             # Catálogo (Map em memória)
├── usersDb.js              # SQLite com tabelas users, customers, audit_log
├── dbMasking.js            # (3º ciclo) Funções de máscara (CPF, cartão, etc.)
├── middleware/
│   ├── errorHandler.js     # Confidencialidade: redação de segredos
│   ├── rateLimiter.js      # Disponibilidade: anti-abuso
│   └── auth.js             # JWT: signToken, requireAuth, requireRole
└── routes/
    ├── products.js         # GET / e GET /report (CPU-bound)
    ├── checkout.js         # POST / com recálculo autoritativo
    ├── auth.js             # login-vulneravel, login-seguro, me, secrets, admin
    └── customers.js        # (3º ciclo) /customers + /customers/audit-log
frontend/
└── index.html              # Demos clicáveis para cada pilar
```

## Como rodar

```bash
cd backend
npm install
npm run dev      # modo simples (1 processo)
# ou
npm start        # modo cluster (N workers)
```

Abra <http://localhost:3000>.

> Se `npm install` falhar em `better-sqlite3`, instale Build Tools do
> Visual Studio (C++) ou use Node 18 LTS — há prebuilds prontos.

## Roteiro de aula sugerido

1. **Slide 4 — Confidencialidade.** Clique em "Disparar erro com segredos".
   No console do servidor aparece o erro completo; no navegador, só
   `[REDACTED]`. Mostre `middleware/errorHandler.js`.
2. **Slide 4 — Integridade.** Clique em "Tentar fraudar total". Mostre
   no JSON o `clientTriedTotal: 0.03` e o `total` real calculado pelo
   servidor. Abra `routes/checkout.js`.
3. **Slide 14 — Disponibilidade.** Clique em "Rodar 8x /report" várias
   vezes. Note PIDs diferentes — é o `cluster` distribuindo. Force o
   limite clicando em "Checar /api/health" muitas vezes para ver 429.
4. **Slide 17 — SQL Injection.** Os campos já vêm preenchidos com o
   payload de ataque (`' OR 1=1 --`).
   - "Logar na rota VULNERÁVEL" → login feito sem senha real.
     A `sqlExecutada` mostra como o input virou comando.
   - "Logar na rota SEGURA" → o mesmo input falha. O `?` impediu
     o input de virar SQL.
5. **Slides 15-16 — JWT.** Use `professor / admin`. Após o passo 1
   (login), passe pelos botões 2-4 e mostre o token em <https://jwt.io>
   (cole o conteúdo). Botão 5 adultera o `role` para `professor` sem
   reassinar — servidor rejeita.
6. **Slides 8-10 — UX defensiva.** Preencha CPF e telefone sem digitar
   pontuação (a máscara aplica). Clique em "Enviar com confirmação"
   para ver popup + botão desabilitando.
7. **Slides 21-22 — Data Masking + Auditoria (3º ciclo).** Logue como
   `aluno` na seção JWT, vá na seção "Data Masking". Liste clientes:
   CPF e cartão aparecem mascarados. Tente "Revelar" — ignorado.
   Faça logout, logue como `professor`, repita. Agora "Revelar" mostra
   dados completos. Clique em "Ver log de auditoria" para ver a
   trilha de acessos.

## Endpoints

| Método | Rota | Descrição |
|---|---|---|
| GET  | `/api/health` | status + PID do worker |
| GET  | `/api/products` | catálogo |
| GET  | `/api/products/report` | rota pesada (rate-limited) |
| POST | `/api/checkout` | recalcula total no servidor |
| GET  | `/api/leak-demo` | erro com segredos (redigidos) |
| POST | `/api/login-vulneravel` | **slide 17** — concatena SQL (didático) |
| POST | `/api/login-seguro` | **slide 17** — Prepared Statement |
| GET  | `/api/me` | **slide 16** — exige Bearer token |
| GET  | `/api/secrets` | RBAC: aluno vê só as próprias notas |
| GET  | `/api/admin` | só `role=professor` |
| GET  | `/api/customers` | **slide 21** — dados mascarados |
| GET  | `/api/customers?reveal=true` | **slide 21** — completo (só professor, auditado) |
| GET  | `/api/customers/audit-log` | **slide 22** — log forense |

## Usuários pré-cadastrados (banco zera a cada restart)

| username | senha | role |
|---|---|---|
| `aluno` | `123456` | aluno |
| `professor` | `admin` | professor |

## Segurança das demos

A rota `/api/login-vulneravel` é **proposital** e **não deve** existir
em código real. Está aqui apenas para que o aluno veja o ataque
funcionar em uma máquina local. Em produção, todas as queries usam
Prepared Statements.

## Licença

Projeto acadêmico/demonstrativo.
