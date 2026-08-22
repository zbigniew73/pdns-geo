const express = require('express');
const { requireAuth, requirePasswordChanged } = require('../middleware/requireAuth');
const powerdnsApi = require('../services/powerdnsApi');

module.exports = function zonesRouter() {
  const router = express.Router();

  router.get('/', requireAuth, requirePasswordChanged, async (req, res) => {
    try {
      const result = await powerdnsApi.listZones();
      res.json(result);
    } catch (err) {
      res.status(502).json({ error: 'powerdns_unreachable', message: err.message });
    }
  });

  return router;
};
