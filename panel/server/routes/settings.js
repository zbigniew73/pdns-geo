const express = require('express');
const path = require('path');
const { requireAuth, requirePasswordChanged } = require('../middleware/requireAuth');
const config = require('../config');
const { setEnvValues } = require('../services/envFile');
const powerdnsApi = require('../services/powerdnsApi');
const { findUserByEmail, verifyPassword, setPin, disablePin } = require('../services/authService');

const ENV_PATH = path.join(process.cwd(), '.env');

module.exports = function settingsRouter(db) {
  const router = express.Router();

  router.get('/pin', requireAuth, requirePasswordChanged, (req, res) => {
    const user = findUserByEmail(db, req.session.email);
    res.json({ enabled: !!user.pin_enabled });
  });

  router.put('/pin', requireAuth, requirePasswordChanged, (req, res) => {
    const { currentPassword, enabled, pin } = req.body || {};
    if (!currentPassword || typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'missing_fields' });
    }
    const user = findUserByEmail(db, req.session.email);
    if (!verifyPassword(user, currentPassword)) {
      return res.status(401).json({ error: 'invalid_current_password' });
    }
    if (enabled) {
      if (!/^\d{4}$/.test(pin || '')) {
        return res.status(400).json({ error: 'invalid_pin' });
      }
      setPin(db, user.id, pin);
    } else {
      disablePin(db, user.id);
    }
    res.json({ enabled });
  });

  router.get('/powerdns', requireAuth, requirePasswordChanged, (req, res) => {
    let address = '';
    let port = '';
    if (config.powerdns.apiUrl) {
      try {
        const u = new URL(config.powerdns.apiUrl);
        address = u.hostname;
        port = u.port || '80';
      } catch {
        // POWERDNS_API_URL w nietypowym formacie - admin wpisze od nowa
      }
    }
    res.json({ address, port, apiKeySet: !!config.powerdns.apiKey, zone: config.powerdns.nsZone });
  });

  router.put('/powerdns', requireAuth, requirePasswordChanged, (req, res) => {
    const { address, port, apiKey, zone } = req.body || {};
    if (!address || !port) {
      return res.status(400).json({ error: 'missing_fields' });
    }
    const apiUrl = `http://${address}:${port}`;
    const updates = { POWERDNS_API_URL: apiUrl, POWERDNS_NS_ZONE: zone || '' };
    if (apiKey) updates.POWERDNS_API_KEY = apiKey;

    try {
      setEnvValues(ENV_PATH, updates);
    } catch (err) {
      return res.status(500).json({ error: 'env_write_failed', message: err.message });
    }

    config.powerdns.apiUrl = apiUrl;
    config.powerdns.nsZone = zone || '';
    if (apiKey) config.powerdns.apiKey = apiKey;

    res.json({ address, port, apiKeySet: !!config.powerdns.apiKey, zone: config.powerdns.nsZone });
  });

  router.post('/powerdns/test', requireAuth, requirePasswordChanged, async (req, res) => {
    const result = await powerdnsApi.testConnection();
    res.json(result);
  });

  return router;
};
