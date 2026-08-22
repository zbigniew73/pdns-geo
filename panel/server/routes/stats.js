const express = require('express');
const { requireAuth, requirePasswordChanged } = require('../middleware/requireAuth');
const { getSystemStats } = require('../services/systemStats');

module.exports = function statsRouter() {
  const router = express.Router();

  router.get('/', requireAuth, requirePasswordChanged, async (req, res) => {
    const stats = await getSystemStats();
    res.json(stats);
  });

  return router;
};
