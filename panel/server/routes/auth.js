const express = require('express');
const { findUserByEmail, verifyPassword, changePassword } = require('../services/authService');
const { requireAuth } = require('../middleware/requireAuth');

module.exports = function authRouter(db) {
  const router = express.Router();

  router.post('/login', (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'missing_credentials' });
    }
    const user = findUserByEmail(db, email);
    if (!user || !verifyPassword(user, password)) {
      return res.status(401).json({ error: 'invalid_credentials' });
    }
    req.session.userId = user.id;
    req.session.email = user.email;
    req.session.mustChangePassword = !!user.must_change_password;
    res.json({ email: user.email, mustChangePassword: !!user.must_change_password });
  });

  router.post('/logout', (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
  });

  router.get('/me', requireAuth, (req, res) => {
    res.json({ email: req.session.email, mustChangePassword: !!req.session.mustChangePassword });
  });

  router.post('/change-password', requireAuth, (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'missing_fields' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'password_too_short' });
    }
    const user = findUserByEmail(db, req.session.email);
    if (!verifyPassword(user, currentPassword)) {
      return res.status(401).json({ error: 'invalid_current_password' });
    }
    changePassword(db, user.id, newPassword);
    req.session.mustChangePassword = false;
    res.json({ ok: true });
  });

  return router;
};
