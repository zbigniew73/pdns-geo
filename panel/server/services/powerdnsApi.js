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

module.exports = { listZones };
