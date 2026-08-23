#!/usr/bin/env node
// Ratunkowe ustawienie/reset hasla konta (np. przy zablokowaniu sie z panelu).
// Uzycie (z /opt/pdns-panel): node scripts/reset-admin-password.js <email> <nowe-haslo>
// Jesli konto o podanym e-mailu nie istnieje, zostanie utworzone jako admin.
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { openDb } = require('../server/db');

const [, , email, newPassword] = process.argv;
if (!email || !newPassword) {
  console.error('Uzycie: node scripts/reset-admin-password.js <email> <nowe-haslo>');
  process.exit(1);
}
if (newPassword.length < 8) {
  console.error('Haslo musi miec co najmniej 8 znakow.');
  process.exit(1);
}

const db = openDb();
db.exec(fs.readFileSync(path.join(__dirname, '..', 'server', 'db', 'schema.sql'), 'utf8'));

const hash = bcrypt.hashSync(newPassword, 10);
const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);

if (existing) {
  db.prepare('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?').run(hash, existing.id);
  console.log(`Zaktualizowano haslo dla ${email} (zmiana hasla przy logowaniu NIE jest wymuszona).`);
} else {
  db.prepare(
    'INSERT INTO users (email, password_hash, must_change_password, role) VALUES (?, ?, 0, ?)'
  ).run(email, hash, 'admin');
  console.log(`Utworzono nowe konto admina ${email}.`);
}
