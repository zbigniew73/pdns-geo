const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3-multiple-ciphers');
const bcrypt = require('bcryptjs');
const config = require('./config');
const { setEnvValues } = require('./services/envFile');

const SCHEMA_PATH = path.join(__dirname, 'db', 'schema.sql');
const ENV_PATH = path.join(process.cwd(), '.env');
const PLAINTEXT_MAGIC = 'SQLite format 3\0';

function ensureEncryptionKey() {
  if (config.dbEncryptionKey) return config.dbEncryptionKey;
  const key = crypto.randomBytes(32).toString('hex');
  setEnvValues(ENV_PATH, { DB_ENCRYPTION_KEY: key });
  config.dbEncryptionKey = key;
  console.log(`==> Wygenerowano DB_ENCRYPTION_KEY: ${key}`);
  console.log('==> Klucz zapisany w .env. ZROB JEGO BACKUP w osobnym miejscu - bez niego danych z bazy nie da sie odzyskac.');
  return key;
}

function isPlaintextSqlite(filePath) {
  if (!fs.existsSync(filePath)) return false;
  const fd = fs.openSync(filePath, 'r');
  const buf = Buffer.alloc(16);
  const bytesRead = fs.readSync(fd, buf, 0, 16, 0);
  fs.closeSync(fd);
  return bytesRead === 16 && buf.toString('latin1') === PLAINTEXT_MAGIC;
}

function openDb(options) {
  fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });
  const key = ensureEncryptionKey();

  if (isPlaintextSqlite(config.dbPath)) {
    const plain = new Database(config.dbPath);
    plain.pragma(`rekey='${key}'`);
    plain.close();
    console.log('==> Istniejaca baza panelu zostala zaszyfrowana.');
  }

  const db = new Database(config.dbPath, options);
  db.pragma(`key='${key}'`);
  return db;
}

function ensureColumn(db, table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function initDb() {
  const db = openDb();
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
  console.log('==> Utworzono konto admina (haslo tymczasowe - wymagana zmiana po zalogowaniu)');
}

module.exports = { initDb, openDb };
