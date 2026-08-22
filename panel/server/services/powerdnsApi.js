const config = require('../config');

const FETCH_TIMEOUT_MS = 5000;

// fetch() na nieosiagalny/nieroutowalny adres potrafi wisiec bardzo dlugo
// (system TCP connect timeout) - dajemy krotki, jawny limit, zeby przycisk
// "Testuj polaczenie" (i widok stref) nie zawiesily sie na minuty.
// Bledy sieciowe Node'a (fetch failed) chowaja prawdziwy powod w err.cause -
// wyciagamy go, bo samo "fetch failed" nic nie mowi admin owi.
function describeFetchError(err) {
  if (err.name === 'TimeoutError') return 'connection timeout';
  const cause = err.cause;
  if (cause) return cause.code ? `${cause.code}: ${cause.message}` : cause.message;
  return err.message;
}

// Szkielet: dopoki POWERDNS_API_URL nie jest ustawione (laczenie VPS4 -> VPS1
// jeszcze nie ustalone - patrz docs/architecture.md), zwracamy pusta liste
// zamiast bledu, zeby panel dalo sie uruchomic i przetestowac logowanie.
async function listZones() {
  if (!config.powerdns.apiUrl) {
    return { configured: false, zones: [] };
  }
  let res;
  try {
    res = await fetch(`${config.powerdns.apiUrl}/api/v1/servers/localhost/zones`, {
      headers: { 'X-API-Key': config.powerdns.apiKey },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (err) {
    throw new Error(describeFetchError(err));
  }
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
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      return { ok: false, error: `http_${res.status}` };
    }
    const info = await res.json();
    return { ok: true, version: info.version, daemonType: info.daemon_type };
  } catch (err) {
    return { ok: false, error: describeFetchError(err) };
  }
}

module.exports = { listZones, testConnection };
