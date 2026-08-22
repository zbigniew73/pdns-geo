#!/usr/bin/env node
// Diagnostyka: pokazuje, jakie konta faktycznie sa w bazie panelu.
// Uzycie (z /opt/pdns-panel): node scripts/list-users.js
const fs = require('fs');
const Database = require('better-sqlite3');
const config = require('../server/config');

if (!fs.existsSync(config.dbPath)) {
  console.error(`Brak pliku bazy: ${config.dbPath}`);
  console.error('Panel jeszcze sie nie uruchomil (baza tworzona przy pierwszym starcie) albo DB_PATH w .env wskazuje gdzie indziej.');
  process.exit(1);
}

const db = new Database(config.dbPath, { readonly: true });
const rows = db.prepare('SELECT id, email, role, must_change_password, created_at FROM users ORDER BY id').all();

console.log(`Baza: ${config.dbPath}`);
if (!rows.length) {
  console.log('Brak uzytkownikow w tabeli users.');
} else {
  console.table(rows);
}
