#!/usr/bin/env node
// Diagnostyka: pokazuje, jakie konta faktycznie sa w bazie panelu.
// Uzycie (z /opt/pdns-panel): node scripts/list-users.js
const fs = require('fs');
const config = require('../server/config');
const { openDb } = require('../server/db');

if (!fs.existsSync(config.dbPath)) {
  console.error(`Brak pliku bazy: ${config.dbPath}`);
  console.error('Panel jeszcze sie nie uruchomil (baza tworzona przy pierwszym starcie) albo DB_PATH w .env wskazuje gdzie indziej.');
  process.exit(1);
}

const db = openDb({ readonly: true });
const rows = db
  .prepare("SELECT id, email, role, must_change_password, pin_enabled, created_at FROM users WHERE role = 'user' ORDER BY id")
  .all();

console.log(`Baza: ${config.dbPath}`);
if (!rows.length) {
  console.log("Brak kont z rola 'user' w tabeli users.");
} else {
  console.table(rows);
}
