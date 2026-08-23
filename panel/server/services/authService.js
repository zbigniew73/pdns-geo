const bcrypt = require('bcryptjs');

function findUserByEmail(db, email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
}

function findUserById(db, id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

function verifyPassword(user, password) {
  return bcrypt.compareSync(password, user.password_hash);
}

function changePassword(db, userId, newPassword) {
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?').run(
    hash,
    userId
  );
}

function changeEmail(db, userId, newEmail) {
  db.prepare('UPDATE users SET email = ? WHERE id = ?').run(newEmail, userId);
}

function verifyPin(user, pin) {
  return !!user.pin_hash && bcrypt.compareSync(pin, user.pin_hash);
}

function setPin(db, userId, pin) {
  const hash = bcrypt.hashSync(pin, 10);
  db.prepare('UPDATE users SET pin_hash = ?, pin_enabled = 1 WHERE id = ?').run(hash, userId);
}

function disablePin(db, userId) {
  db.prepare('UPDATE users SET pin_hash = NULL, pin_enabled = 0 WHERE id = ?').run(userId);
}

module.exports = {
  findUserByEmail,
  findUserById,
  verifyPassword,
  changePassword,
  changeEmail,
  verifyPin,
  setPin,
  disablePin,
};
