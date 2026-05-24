// === BANCO DE DADOS REAL (SQLite via sql.js / WebAssembly) ===
// Usamos sql.js (SQLite compilado para WASM, puro JavaScript) para que o
// projeto rode sem depender de toolchain C++. A API é diferente de
// better-sqlite3, então expomos um pequeno wrapper que imita
// `db.prepare(sql).get()` / `.all()` / `.run()`.
//
// O banco vive em memória: morre junto com o processo. Cada `npm run dev`
// começa limpo.

const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');

let database; // instância do SQL.Database depois do init

async function init() {
  const SQL = await initSqlJs();
  database = new SQL.Database();

  database.exec(`
    CREATE TABLE users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL CHECK(role IN ('aluno','professor'))
    );

    CREATE TABLE secret_notes (
      id      INTEGER PRIMARY KEY AUTOINCREMENT,
      owner   TEXT NOT NULL,
      content TEXT NOT NULL
    );

    -- ===== SLIDE 21 — DATA MASKING =====
    -- O banco guarda o dado COMPLETO. A máscara é aplicada na CAMADA DE
    -- BACK-END, antes de devolver para o front, conforme o papel do usuário.
    CREATE TABLE customers (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      name         TEXT NOT NULL,
      email        TEXT NOT NULL,
      cpf          TEXT NOT NULL,
      phone        TEXT NOT NULL,
      credit_card  TEXT NOT NULL
    );

    -- ===== SLIDE 22 — AUDITORIA E LOGS =====
    -- Registra TODA tentativa de leitura de dado sensível em texto pleno.
    -- Mesmo o professor (quem pode revelar) fica registrado — é a prova
    -- forense em caso de vazamento.
    CREATE TABLE data_access_log (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp   TEXT NOT NULL,
      username    TEXT NOT NULL,
      role        TEXT NOT NULL,
      action      TEXT NOT NULL,
      target      TEXT NOT NULL
    );
  `);

  // Seed: dois usuários para a aula. Senhas óbvias de propósito.
  const insertUser = database.prepare(
    'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)'
  );
  insertUser.run(['aluno',     bcrypt.hashSync('123456', 10), 'aluno']);
  insertUser.run(['professor', bcrypt.hashSync('admin',  10), 'professor']);
  insertUser.free();

  const insertNote = database.prepare(
    'INSERT INTO secret_notes (owner, content) VALUES (?, ?)'
  );
  insertNote.run(['professor', 'Gabarito da prova: 1-C, 2-A, 3-B, 4-D']);
  insertNote.run(['professor', 'Salário do diretor: R$ 42.000,00']);
  insertNote.run(['aluno',     'Lembrar de estudar para a prova de quarta']);
  insertNote.free();

  // Seed: 5 clientes fictícios com dados sensíveis "reais".
  // Estes valores existem APENAS aqui — em produção viriam de cadastro real.
  const insertCustomer = database.prepare(
    'INSERT INTO customers (name, email, cpf, phone, credit_card) VALUES (?, ?, ?, ?, ?)'
  );
  insertCustomer.run(['Ana Souza',      'ana.souza@email.com',     '12345678901', '11987654321', '4539578763621486']);
  insertCustomer.run(['Bruno Lima',     'bruno.lima@email.com',    '98765432100', '21912345678', '5412751234567890']);
  insertCustomer.run(['Carla Mendes',   'carla.mendes@email.com',  '45678912345', '31988887777', '4716123456789012']);
  insertCustomer.run(['Diego Pereira',  'diego.p@email.com',       '32165498700', '41999998888', '5500000000000004']);
  insertCustomer.run(['Eduarda Castro', 'edu.castro@email.com',    '78945612300', '51977776666', '4024007112345678']);
  insertCustomer.free();
}

// Helper para registrar acesso a dado sensível na tabela de auditoria.
// Chamado pelas rotas que tocam em CPF/cartão/etc em texto pleno.
function logAccess({ username, role, action, target }) {
  const stmt = database.prepare(
    'INSERT INTO data_access_log (timestamp, username, role, action, target) VALUES (?, ?, ?, ?, ?)'
  );
  stmt.run([new Date().toISOString(), username, role, action, target]);
  stmt.free();
}

// Wrapper com a mesma cara de better-sqlite3 — facilita a leitura nas rotas.
const db = {
  prepare(sql) {
    return {
      get(...params) {
        const stmt = database.prepare(sql);
        try {
          stmt.bind(params.length ? params : undefined);
          return stmt.step() ? stmt.getAsObject() : null;
        } finally {
          stmt.free();
        }
      },
      all(...params) {
        const stmt = database.prepare(sql);
        try {
          stmt.bind(params.length ? params : undefined);
          const rows = [];
          while (stmt.step()) rows.push(stmt.getAsObject());
          return rows;
        } finally {
          stmt.free();
        }
      },
      run(...params) {
        database.run(sql, params);
      },
    };
  },
};

module.exports = { db, init, logAccess };
