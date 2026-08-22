const config = require('../config');

// Szkielet: dopoki POWERDNS_API_URL nie jest ustawione (laczenie VPS4 -> VPS1
// jeszcze nie ustalone - patrz docs/architecture.md), zwracamy pusta liste
// zamiast bledu, zeby panel dalo sie uruchomic i przetestowac logowanie.
async function listZones() {
  if (!config.powerdns.apiUrl) {
    return { configured: false, zones: [] };
  }
  const res = await fetch(`${config.powerdns.apiUrl}/api/v1/servers/localhost/zones`, {
    headers: { 'X-API-Key': config.powerdns.apiKey },
  });
  if (!res.ok) {
    throw new Error(`PowerDNS API error: ${res.status}`);
  }
  const zones = await res.json();
  return { configured: true, zones };
}

async function testConnection() {
  if (!config.powerdns.apiUrl) {
    return { ok: false, error: 'not_configured' };
  }
  try {
    const res = await fetch(`${config.powerdns.apiUrl}/api/v1/servers/localhost`, {
      headers: { 'X-API-Key': config.powerdns.apiKey },
    });
    if (!res.ok) {
      return { ok: false, error: `http_${res.status}` };
    }
    const info = await res.json();
    return { ok: true, version: info.version, daemonType: info.daemon_type };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = { listZones, testConnection };
