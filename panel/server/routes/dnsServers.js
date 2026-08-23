const express = require('express');
const { requireAuth, requirePasswordChanged } = require('../middleware/requireAuth');
const { getDnsServers } = require('../services/dnsServers');

module.exports = function dnsServersRouter() {
  const router = express.Router();

  router.get('/', requireAuth, requirePasswordChanged, async (req, res) => {
    try {
      res.json(await getDnsServers());
    } catch (err) {
      res.status(502).json({ error: 'powerdns_unreachable', message: err.message });
    }
  });

  return router;
};
