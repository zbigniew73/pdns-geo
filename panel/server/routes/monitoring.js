const express = require('express');
const { requireAuth, requirePasswordChanged } = require('../middleware/requireAuth');
const { requireMonitoringToken } = require('../middleware/requireMonitoringToken');
const { recordMetrics, getLatestMetrics } = require('../services/monitoring');
const { isKnownNsIp } = require('../services/dnsServers');

module.exports = function monitoringRouter(db) {
  const router = express.Router();

  router.post('/ingest', requireMonitoringToken, async (req, res) => {
    const allowed = await isKnownNsIp(req.ip);
    if (!allowed) return res.status(403).json({ error: 'unknown_source' });

    const { host, load1, udpQueries, tcpQueries, latencyUs, memBytes, uptimeSeconds } = req.body || {};
    if (!host) return res.status(400).json({ error: 'missing_host' });

    recordMetrics(db, {
      host: String(host).slice(0, 255),
      load1: Number(load1) || 0,
      udpQueries: Number(udpQueries) || 0,
      tcpQueries: Number(tcpQueries) || 0,
      latencyUs: Number(latencyUs) || 0,
      memBytes: Number(memBytes) || 0,
      uptimeSeconds: Number(uptimeSeconds) || 0,
    });

    res.json({ ok: true });
  });

  router.get('/', requireAuth, requirePasswordChanged, (req, res) => {
    res.json({ hosts: getLatestMetrics(db) });
  });

  return router;
};
