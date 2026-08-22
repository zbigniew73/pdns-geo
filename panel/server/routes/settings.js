const express = require('express');
const path = require('path');
const { requireAuth, requirePasswordChanged } = require('../middleware/requireAuth');
const config = require('../config');
const { setEnvValues } = require('../services/envFile');
const powerdnsApi = require('../services/powerdnsApi');

const ENV_PATH = path.join(process.cwd(), '.env');

module.exports = function settingsRouter() {
  const router = express.Router();

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
    res.json({ address, port, apiKeySet: !!config.powerdns.apiKey });
  });

  router.put('/powerdns', requireAuth, requirePasswordChanged, (req, res) => {
    const { address, port, apiKey } = req.body || {};
    if (!address || !port) {
      return res.status(400).json({ error: 'missing_fields' });
    }
    const apiUrl = `http://${address}:${port}`;
    const updates = { POWERDNS_API_URL: apiUrl };
    if (apiKey) updates.POWERDNS_API_KEY = apiKey;

    try {
      setEnvValues(ENV_PATH, updates);
    } catch (err) {
      return res.status(500).json({ error: 'env_write_failed', message: err.message });
    }

    config.powerdns.apiUrl = apiUrl;
    if (apiKey) config.powerdns.apiKey = apiKey;

    res.json({ address, port, apiKeySet: !!config.powerdns.apiKey });
  });

  router.post('/powerdns/test', requireAuth, requirePasswordChanged, async (req, res) => {
    const result = await powerdnsApi.testConnection();
    res.json(result);
  });

  return router;
};
