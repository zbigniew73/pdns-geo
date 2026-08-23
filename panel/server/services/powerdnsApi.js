const config = require('../config');

const FETCH_TIMEOUT_MS = 5000;

function describeFetchError(err) {
  if (err.name === 'TimeoutError') return 'connection timeout';
  const cause = err.cause;
  if (cause) return cause.code ? `${cause.code}: ${cause.message}` : cause.message;
  return err.message;
}

async function apiFetch(path, options = {}) {
  try {
    return await fetch(`${config.powerdns.apiUrl}${path}`, {
      ...options,
      headers: { 'X-API-Key': config.powerdns.apiKey, ...(options.headers || {}) },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (err) {
    throw new Error(describeFetchError(err));
  }
}

async function listZones() {
  if (!config.powerdns.apiUrl) {
    return { configured: false, zones: [] };
  }
  const res = await apiFetch('/api/v1/servers/localhost/zones');
  if (!res.ok) {
    throw new Error(`PowerDNS API error: ${res.status}`);
  }
  const zones = await res.json();
  return { configured: true, zones };
}

async function getZone(zoneId) {
  const res = await apiFetch(`/api/v1/servers/localhost/zones/${encodeURIComponent(zoneId)}`);
  if (!res.ok) {
    throw new Error(`PowerDNS API error: ${res.status}`);
  }
  return res.json();
}

async function patchRRset(zoneId, rrset) {
  const res = await apiFetch(`/api/v1/servers/localhost/zones/${encodeURIComponent(zoneId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rrsets: [rrset] }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`PowerDNS API error: ${res.status}${text ? ` - ${text}` : ''}`);
  }
}

async function testConnection() {
  if (!config.powerdns.apiUrl) {
    return { ok: false, error: 'not_configured' };
  }
  try {
    const res = await apiFetch('/api/v1/servers/localhost');
    if (!res.ok) {
      return { ok: false, error: `http_${res.status}` };
    }
    const info = await res.json();
    return { ok: true, version: info.version, daemonType: info.daemon_type };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function notifyZone(zoneId) {
  const res = await apiFetch(`/api/v1/servers/localhost/zones/${encodeURIComponent(zoneId)}/notify`, {
    method: 'PUT',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`PowerDNS API error: ${res.status}${text ? ` - ${text}` : ''}`);
  }
}

module.exports = { listZones, testConnection, getZone, patchRRset, notifyZone };
