const express = require('express');
const { requireAuth, requirePasswordChanged } = require('../middleware/requireAuth');
const { getDnsServers } = require('../services/dnsServers');

module.exports = function dnsServersRouter() {
  const router = express.Router();

  router.get('/', requireAuth, requirePasswordChanged, (req, res) => {
    res.json({ servers: getDnsServers() });
  });

  return router;
};
