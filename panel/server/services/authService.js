const bcrypt = require('bcryptjs');

function findUserByEmail(db, email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
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

module.exports = { findUserByEmail, verifyPassword, changePassword, changeEmail };
