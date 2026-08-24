const config = require('../config');

function requireMonitoringToken(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!config.monitoringToken || token !== config.monitoringToken) {
    return res.status(401).json({ error: 'invalid_token' });
  }
  next();
}

module.exports = { requireMonitoringToken };
