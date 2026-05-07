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

module.exports = { db, init };
