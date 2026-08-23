const express = require('express');
const {
  findUserByEmail,
  findUserById,
  verifyPassword,
  changePassword,
  changeEmail,
  verifyPin,
} = require('../services/authService');
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
    if (user.pin_enabled) {
      req.session.pendingPinUserId = user.id;
      return res.json({ pinRequired: true });
    }
    req.session.userId = user.id;
    req.session.email = user.email;
    req.session.mustChangePassword = !!user.must_change_password;
    res.json({ pinRequired: false, email: user.email, mustChangePassword: !!user.must_change_password });
  });

  router.post('/verify-pin', (req, res) => {
    const { pin } = req.body || {};
    const userId = req.session.pendingPinUserId;
    if (!userId) {
      return res.status(401).json({ error: 'no_pending_login' });
    }
    const user = findUserById(db, userId);
    if (!user || !verifyPin(user, pin)) {
      return res.status(401).json({ error: 'invalid_pin' });
    }
    delete req.session.pendingPinUserId;
    req.session.userId = user.id;
    req.session.email = user.email;
    req.session.mustChangePassword = !!user.must_change_password;
    res.json({ email: user.email, mustChangePassword: !!user.must_change_password });
  });

  router.post('/logout', (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
  });

  router.get('/me', requireAuth, (req, res) => {
    const user = findUserByEmail(db, req.session.email);
    res.json({
      email: user.email,
      mustChangePassword: !!req.session.mustChangePassword,
      role: user.role,
      createdAt: user.created_at,
    });
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

  router.patch('/email', requireAuth, (req, res) => {
    const { currentPassword, newEmail } = req.body || {};
    if (!currentPassword || !newEmail) {
      return res.status(400).json({ error: 'missing_fields' });
    }
    const user = findUserByEmail(db, req.session.email);
    if (!verifyPassword(user, currentPassword)) {
      return res.status(401).json({ error: 'invalid_current_password' });
    }
    const existing = findUserByEmail(db, newEmail);
    if (existing && existing.id !== user.id) {
      return res.status(409).json({ error: 'email_taken' });
    }
    changeEmail(db, user.id, newEmail);
    req.session.email = newEmail;
    res.json({ email: newEmail });
  });

  return router;
};
