const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const config = require('./config');

const SCHEMA_PATH = path.join(__dirname, 'db', 'schema.sql');

function ensureColumn(db, table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function initDb() {
  fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });
  const db = new Database(config.dbPath);
  db.pragma('journal_mode = WAL');
  db.exec(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  ensureColumn(db, 'users', 'pin_hash', 'TEXT');
  ensureColumn(db, 'users', 'pin_enabled', 'INTEGER NOT NULL DEFAULT 0');
  seedAdminIfEmpty(db);
  return db;
}

function seedAdminIfEmpty(db) {
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM users').get();
  if (n > 0) return;
  const hash = bcrypt.hashSync(config.adminPassword, 10);
  db.prepare(
    'INSERT INTO users (email, password_hash, must_change_password, role) VALUES (?, ?, 1, ?)'
  ).run(config.adminEmail, hash, 'admin');
  console.log(
    `==> Utworzono konto admina ${config.adminEmail} (haslo tymczasowe - wymagana zmiana po zalogowaniu)`
  );
}

module.exports = { initDb };
