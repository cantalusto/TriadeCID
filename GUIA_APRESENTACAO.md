# Guia de Apresentação — Segurança em Sistemas da Informação

Este documento é o seu **roteiro completo** para apresentar o projeto.
Cobre cada slide do PDF do professor Wagner, explica o que cada parte
do código faz, e mostra exatamente o que clicar e o que falar.

---

## 1. Como subir o projeto antes da apresentação

```bash
cd backend
npm install        # só na primeira vez
npm run dev        # modo simples — recomendado para apresentar
```

Abra <http://localhost:3000> no navegador. Pronto.

> **Por que `npm run dev` e não `npm start`?**
> `npm start` sobe o modo cluster (vários workers). É bom para
> demonstrar disponibilidade, mas dificulta ler os logs em sala.
> Use `dev` para tudo, e troque para `start` só na demo de
> disponibilidade se quiser mostrar mais workers.

---

## 2. Visão geral da arquitetura

O projeto segue a **pirâmide de 4 camadas** do slide 5:

```
┌─────────────────────────────┐
│ 1. INTERFACE (Front-End)    │  ← frontend/index.html
├─────────────────────────────┤
│ 2. ESTRUTURA (Back-End)     │  ← backend/server.js + routes/
├─────────────────────────────┤
│ 3. ARMAZENAMENTO (BD)       │  ← backend/usersDb.js (SQLite)
├─────────────────────────────┤
│ 4. INFRAESTRUTURA           │  ← backend/cluster.js
└─────────────────────────────┘
```

Cada camada tem proteções específicas. A apresentação percorre as
quatro.

---

## 3. Estrutura de arquivos (o que é cada coisa)

```
TriadeCID-main/
│
├── frontend/
│   └── index.html                ← Página única com TODAS as demos
│
├── backend/
│   ├── server.js                 ← Configura Express, helmet, rotas
│   ├── cluster.js                ← Disponibilidade: cria múltiplos workers
│   ├── database.js               ← Catálogo de produtos (Map em memória)
│   ├── usersDb.js                ← SQLite (WASM) com tabela de usuários
│   │
│   ├── middleware/
│   │   ├── errorHandler.js       ← Confidencialidade: redige segredos em erros
│   │   ├── rateLimiter.js        ← Disponibilidade: limita requisições
│   │   └── auth.js               ← JWT: emite e valida tokens
│   │
│   ├── routes/
│   │   ├── products.js           ← GET /api/products + /report (pesado)
│   │   ├── checkout.js           ← Integridade: recalcula preço no servidor
│   │   └── auth.js               ← Login (vulnerável + seguro), /me, RBAC
│   │
│   ├── package.json              ← Dependências (express, helmet, sql.js…)
│   └── .env.example              ← Variáveis de ambiente de exemplo
│
└── README.md                     ← Documentação técnica
```

---

## 4. Mapeamento Slide → Código

| Slide do PDF | Conceito | Onde está no código |
|---|---|---|
| **Slide 4** | Tríade CID (visão geral) | Distribuído nos 3 pilares abaixo |
| **Slide 4** | Confidencialidade | `middleware/errorHandler.js` |
| **Slide 4** | Integridade | `routes/checkout.js` |
| **Slide 4** | Disponibilidade | `cluster.js` + `middleware/rateLimiter.js` |
| **Slide 8** | Limite caracteres / tipagem inputs | `frontend/index.html` (formulário cadastro) |
| **Slide 9** | Máscara senha / popup confirmação / botão desabilitado | `frontend/index.html` (modal + função `confirmar`) |
| **Slide 10** | CSP / páginas erro custom | `helmet()` em `server.js` + `errorHandler.js` |
| **Slide 13** | Rate limit anti-força-bruta | `middleware/rateLimiter.js` + `loginLimiter` em `routes/auth.js` |
| **Slide 14** | Tríade CID no back-end | mesma divisão da slide 4 |
| **Slides 15-16** | JWT (Header.Payload.Signature, Login → Emissão → Uso → Validação) | `middleware/auth.js` + `routes/auth.js` |
| **Slide 17** | SQL Injection vs Prepared Statement | `routes/auth.js` (rotas `login-vulneravel` e `login-seguro`) |
| **Slide 18** | Armazenamento (banco real) | `usersDb.js` (SQLite via sql.js/WASM) |
| **Slide 19** | Infraestrutura | `cluster.js` (load balancer com Node cluster) |

---

## 5. Roteiro de Apresentação (passo a passo)

A página tem **6 seções**, cada uma alinhada a um conceito do PDF.
Apresente nesta ordem:

### Seção 1 — Confidencialidade *(Slide 4 / Slide 14)*

**O que clicar:** botão "Disparar erro com segredos".

**O que dizer:**
> "Esse endpoint é proposital: ele lança um erro que contém senha do
> banco, API key e JWT secret. Em um sistema mal-feito, isso apareceria
> no console do navegador. No nosso, o middleware `errorHandler.js`
> intercepta o erro, redige os segredos com regex, e devolve só uma
> mensagem genérica."

**Onde mostrar o código:** `backend/middleware/errorHandler.js`,
linhas 6-16 (lista de regex), linha 26 em diante (função
`errorHandler`).

**Pontos a destacar:**
- O log completo continua no terminal do servidor (use interno).
- O cliente vê só `"Erro interno do servidor. Tente novamente mais tarde."`
- Sem essa proteção, qualquer erro inesperado pode vazar a infraestrutura.

---

### Seção 2 — Integridade *(Slide 4 / Slide 14)*

**O que clicar:** primeiro "Tentar fraudar total", depois "Checkout honesto".

**O que dizer:**
> "O front-end mente e diz que um Notebook + 2 mouses custam R$ 0,03.
> O servidor IGNORA o `total` e os `price` enviados — recalcula tudo
> a partir do banco de dados. Repare no campo `clientTriedTotal: 0.03`
> ao lado do `total: 3800`. É a prova visual de que o servidor não
> confia no cliente."

**Onde mostrar o código:** `backend/routes/checkout.js`, linhas 22-52
(loop que recalcula `subtotal` baseado no banco).

**Pontos a destacar:**
- Regra de ouro: **front-end NUNCA é fonte de verdade para valores monetários.**
- O cliente envia só `{ id, quantity }`. Tudo o mais é recalculado.
- Se um atacante interceptar a requisição e mudar valores, o servidor
  ainda cobra o preço correto.

---

### Seção 3 — Disponibilidade *(Slide 4 / Slide 14)*

**O que clicar:** "Rodar 8x /api/products/report" — repita 2-3 vezes.

**O que dizer:**
> "O endpoint `/report` simula uma operação pesada de CPU (loop de 50
> milhões de iterações). Sem balanceamento, oito requisições em
> paralelo travariam o servidor. Com `cluster`, o Node cria um processo
> por núcleo da CPU. Olhem os PIDs únicos: cada requisição foi para um
> worker diferente."

**Bônus para reforçar:** clique no botão "Checar /api/health" várias
vezes seguidas. Em algum momento aparece **HTTP 429** — é o
`rate-limiter` recusando o abuso.

**Onde mostrar o código:**
- `backend/cluster.js` linhas 15-31 (fork de workers + respawn).
- `backend/middleware/rateLimiter.js` (limites global e pesado).

**Pontos a destacar:**
- Disponibilidade tem **duas camadas**: cluster (escala) + rate limit
  (defesa contra abuso).
- Se um worker cair, o `cluster.on('exit')` faz respawn automático.

---

### Seção 4 — SQL Injection *(Slide 17 — DEMO MAIS VISUAL)*

**Esta é a demo principal.** O professor Wagner dedica um slide
inteiro a esse tema, com diagramas. Aqui ela vira código rodando.

**Setup inicial:** os campos já vêm preenchidos com:
- Username: `' OR 1=1 --`
- Senha: `qualquer`

**O que clicar primeiro:** botão **vermelho** "Logar na rota VULNERÁVEL".

**O que dizer:**
> "Acabei de fazer login sem senha. Olhem o campo `sqlExecutada` na
> resposta:
> ```sql
> SELECT * FROM users WHERE username='' OR 1=1 --' AND password_hash='qualquer'
> ```
> O `--` é um comentário em SQL. O filtro de senha foi anulado.
> O banco devolveu o primeiro usuário da tabela e o servidor emitiu
> um JWT como se a autenticação tivesse passado."

**O que clicar em seguida:** botão **verde** "Logar na rota SEGURA".

**O que dizer:**
> "Mesmo input, comportamento diferente. Olhem o `sqlMolde`:
> ```sql
> SELECT ... FROM users WHERE username = ?
> ```
> O `?` é um placeholder. O banco sabe que o conteúdo é DADO, não
> COMANDO. Mesmo que o usuário escreva `' OR 1=1 --`, o banco vai
> procurar literalmente um username com esse texto — e não acha.
> Ataque bloqueado."

**Onde mostrar o código:** `backend/routes/auth.js`
- Linhas ~33-63 — rota vulnerável (concatenação de string).
- Linhas ~70-95 — rota segura (Prepared Statement).

**Pontos a destacar:**
- A **única diferença** entre as duas rotas é como a query é construída.
- Em produção, **toda** consulta usa Prepared Statements. A rota
  vulnerável existe só para a aula.
- Frase para fechar: *"O atacante não está digitando um nome — está
  digitando um comando. Prepared Statements impedem que o input
  escape do quadradinho dele."* (referência direta à analogia do
  slide 17, "formulário com quadradinhos").

---

### Seção 5 — JWT *(Slides 15-16)*

Esta seção tem **5 botões em sequência**. Faça na ordem:

**Setup:** selecione `professor` e digite a senha `admin`.

**Passo 1 — "Login (gera token)"**
> "Login pela rota segura. O servidor verifica usuário/senha, e se
> bater, assina um JWT com a chave secreta. O token tem três partes
> separadas por ponto: Header, Payload, Signature."

Mostre o token na resposta. **Abra <https://jwt.io> em outra aba** e
cole o token. Os três blocos coloridos aparecem decodificados.
> "Header diz o algoritmo. Payload tem `id`, `username`, `role`.
> Signature é um HMAC com a chave do servidor — quem não tem a chave,
> não consegue gerar."

**Passo 2 — "GET /api/me"**
> "O navegador agora envia o token no header `Authorization: Bearer ...`.
> O servidor valida a assinatura e me devolve o que conseguiu ler do
> payload. É a etapa de **Validação** do slide 16."

**Passo 3 — "GET /api/secrets" (RBAC)**
> "Esta rota usa o `role` do payload para decidir o que mostrar.
> Como logamos como professor, vemos as 3 notas da tabela. Se eu
> fizer logout e logar como aluno, vejo apenas 1."

**Passo 4 — "GET /api/admin" (só professor)**
> "Aqui o `requireRole('professor')` bloqueia qualquer outro role.
> Como sou professor, passo. Se fosse aluno, viria 403."

**Passo 5 — "Adulterar token e tentar /me"** ⭐ **(o ponto alto)**
> "Aqui o navegador faz o seguinte: pega o token, decodifica o
> payload em Base64, troca `role: 'aluno'` por `role: 'professor'`,
> reencoda — mas **NÃO recalcula a assinatura**, porque só o servidor
> tem a chave secreta. O servidor recebe o token adulterado, vê que
> a assinatura não bate com o conteúdo, e rejeita.
> É exatamente o que o slide 16 promete: 'se ninguém alterou o texto,
> o acesso é liberado'."

**Onde mostrar o código:**
- `backend/middleware/auth.js` — funções `signToken` (linha 19) e
  `requireAuth` (linha 28).
- `backend/routes/auth.js` linhas finais — rotas `/me`, `/secrets`,
  `/admin`.

**Pontos a destacar:**
- O payload é **legível por qualquer um** — não coloque senha lá.
- A assinatura é o que garante **integridade**.
- Token expira em 15 minutos (`EXPIRES_IN` em `auth.js`).

---

### Seção 6 — UX Defensiva *(Slides 8, 9, 10)*

**O que fazer:**
1. Digite no campo CPF: `12345678901` — vira `123.456.789-01` (máscara).
2. Digite no telefone: `11987654321` — vira `(11) 98765-4321`.
3. Clique em "Enviar com confirmação" — abre o **modal**.
4. Confirme — o botão fica cinza com texto "Enviando..." (desabilitado).

**O que dizer:**
> "Pequenas decisões de interface reduzem erro humano e superfície de
> ataque:
> - **Máscaras** evitam dado fora do padrão chegando no servidor.
> - **`maxlength` no input** evita payload absurdo (slide 8).
> - **`type='email'` e `type='password'`** ativam validação do navegador
>   e ocultam senha contra shoulder surfing (slide 9).
> - **Popup de confirmação** evita clique acidental em ações sensíveis (slide 9).
> - **Desabilitar o botão após clique** previne duplo submit (slide 9).
> - **CSP via Helmet** (header HTTP) bloqueia execução de scripts
>   externos (slide 10) — mostre o cabeçalho na aba Network do navegador."

**Onde mostrar o código:**
- `frontend/index.html` — função `confirmar()` (modal), `maskCPF()`,
  `maskTel()`, e o `setTimeout` que reabilita o botão.
- `backend/server.js` linhas 16-25 — configuração do Helmet com CSP.

---

## 6. Tira-dúvidas técnico (caso o professor pergunte)

### "Por que SQLite e não MySQL/PostgreSQL?"
SQLite é embutido (não exige servidor separado), funciona em arquivo
ou em memória, e suporta SQL padrão — incluindo prepared statements e
todos os ataques clássicos de injection. Para uma aula, é o ambiente
mais reproduzível: `npm install` e pronto. Em produção, a mesma lógica
vale para qualquer banco SQL.

### "Por que `sql.js` em vez de `better-sqlite3`?"
`better-sqlite3` é mais rápido, mas exige compilação C++ no momento da
instalação (precisa de Python e Visual Studio Build Tools no Windows).
`sql.js` é o SQLite compilado para WebAssembly: roda em qualquer
máquina com Node, sem toolchain. Para fins didáticos a performance é
irrelevante.

### "O banco zera a cada `npm run dev`. Não dá para persistir?"
Sim — basta trocar `new SQL.Database()` por `new SQL.Database(arquivo)`
e salvar com `database.export()`. Para a aula, banco em memória é
melhor: cada apresentação começa limpa e a senha alterada por um
aluno não fica salva.

### "O `bcrypt` que vocês usam é seguro?"
Estamos usando **`bcryptjs`**, a versão pure-JS. É mais lento que o
nativo, mas suficiente para demo. Custo padrão = 10 rounds. Em prod
muita gente usa `bcrypt` nativo ou Argon2.

### "E se eu encontrar um zero-day no `jsonwebtoken`?"
Manter dependências atualizadas (`npm audit`) é parte da hygiene. Para
a aula, a versão 9.x é a recomendada e não tem CVE público crítico.

### "Por que `'unsafe-inline'` no CSP?"
Compromisso explícito da demo: o `index.html` tem CSS e JS inline para
ser autossuficiente em um único arquivo. Em prod, separa-se em
arquivos `.css` / `.js` e remove-se o `'unsafe-inline'`.

### "Por que a rota vulnerável continua existindo?"
**Apenas para a aula.** O comentário no topo da rota diz isso. Em
qualquer projeto real ela seria deletada — o aluno só consegue ver o
ataque funcionar localmente.

### "O `clientTriedTotal` na resposta do checkout não é vazamento?"
É proposital: a aula precisa mostrar lado a lado o que o cliente
enviou e o que o servidor decidiu. Em produção esse campo não
existiria — o servidor responderia só com o `total` autoritativo.

### "Posso mostrar o ataque com Postman/Insomnia em vez do front?"
Sim. O front é só açúcar. Os endpoints aceitam `curl`, Postman,
Insomnia, ou qualquer cliente HTTP. Exemplo de ataque por linha de
comando:
```bash
curl -X POST http://localhost:3000/api/login-vulneravel \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"' OR 1=1 --\",\"password\":\"qualquer\"}"
```

---

## 7. Tabela de endpoints (referência rápida)

| Método | Rota | Para quê |
|---|---|---|
| `GET`  | `/api/health` | status + PID do worker |
| `GET`  | `/api/products` | lista o catálogo |
| `GET`  | `/api/products/report` | rota pesada (rate-limited) |
| `POST` | `/api/checkout` | recalcula total no servidor |
| `GET`  | `/api/leak-demo` | erro com segredos (redigidos) |
| `POST` | `/api/login-vulneravel` | **slide 17** — concatena SQL (didático) |
| `POST` | `/api/login-seguro` | **slide 17** — Prepared Statement |
| `GET`  | `/api/me` | **slide 16** — exige Bearer token |
| `GET`  | `/api/secrets` | RBAC: aluno vê só as próprias |
| `GET`  | `/api/admin` | só `role=professor` |

---

## 8. Usuários pré-cadastrados

O banco zera a cada restart. Sempre vão existir:

| username | senha | role |
|---|---|---|
| `aluno` | `123456` | aluno |
| `professor` | `admin` | professor |

---

## 9. Cola de 30 segundos (resumo executivo)

Se você só tiver 30 segundos para explicar o projeto:

> "É um e-commerce de demonstração em Node.js + Express que implementa
> os três pilares da Tríade CID — Confidencialidade, Integridade,
> Disponibilidade — mais Autenticação com JWT, defesa contra SQL
> Injection com Prepared Statements, e UX defensiva no front-end.
> Cada slide do PDF tem uma rota correspondente que pode ser clicada
> em <http://localhost:3000>."

---

## 10. Possíveis perguntas finais e como responder

| Pergunta | Resposta curta |
|---|---|
| "É produção-ready?" | Não, é didático. Em prod faltariam: HTTPS, persistência, refresh tokens, logging estruturado, monitoramento, segredos em vault. |
| "Por que Node e não Python/Java?" | A aula é agnóstica. Os mesmos conceitos valem em qualquer stack. Node foi escolhido pela simplicidade do `cluster` nativo (slide 19). |
| "Onde está a criptografia em trânsito?" | Em prod seria HTTPS + TLS. Aqui está em HTTP localhost para focar nos outros pilares. |
| "Qual foi o maior aprendizado?" | (resposta pessoal) — sugestão: "Que segurança não é uma feature, é uma camada que atravessa o sistema inteiro: front, back, banco e infra." |

---

**Boa apresentação.**
