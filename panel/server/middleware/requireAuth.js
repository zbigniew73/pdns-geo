function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'not_authenticated' });
  }
  next();
}

// Blokuje dostep do reszty API dopoki uzytkownik nie zmieni tymczasowego
// hasla - wymuszenie po stronie serwera, nie tylko w UI.
function requirePasswordChanged(req, res, next) {
  if (req.session && req.session.mustChangePassword) {
    return res.status(403).json({ error: 'password_change_required' });
  }
  next();
}

module.exports = { requireAuth, requirePasswordChanged };
