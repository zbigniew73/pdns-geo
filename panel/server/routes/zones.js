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

  router.get('/:zoneId', requireAuth, requirePasswordChanged, async (req, res) => {
    try {
      const zone = await powerdnsApi.getZone(req.params.zoneId);
      res.json(zone);
    } catch (err) {
      res.status(502).json({ error: 'powerdns_unreachable', message: err.message });
    }
  });

  router.put('/:zoneId/rrset', requireAuth, requirePasswordChanged, async (req, res) => {
    const { name, type, ttl, records } = req.body || {};
    if (!name || !type || !ttl || !Array.isArray(records) || !records.length) {
      return res.status(400).json({ error: 'missing_fields' });
    }
    try {
      await powerdnsApi.patchRRset(req.params.zoneId, {
        name,
        type,
        ttl: Number(ttl),
        changetype: 'REPLACE',
        records: records.map((content) => ({ content, disabled: false })),
      });
      res.json({ ok: true });
    } catch (err) {
      res.status(502).json({ error: 'powerdns_unreachable', message: err.message });
    }
  });

  router.delete('/:zoneId/rrset', requireAuth, requirePasswordChanged, async (req, res) => {
    const { name, type } = req.body || {};
    if (!name || !type) {
      return res.status(400).json({ error: 'missing_fields' });
    }
    try {
      await powerdnsApi.patchRRset(req.params.zoneId, { name, type, changetype: 'DELETE' });
      res.json({ ok: true });
    } catch (err) {
      res.status(502).json({ error: 'powerdns_unreachable', message: err.message });
    }
  });

  return router;
};
