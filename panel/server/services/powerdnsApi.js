const config = require('../config');

const FETCH_TIMEOUT_MS = 5000;

// fetch() na nieosiagalny/nieroutowalny adres potrafi wisiec bardzo dlugo
// (system TCP connect timeout) - dajemy krotki, jawny limit, zeby przycisk
// "Testuj polaczenie" (i widok stref) nie zawiesily sie na minuty.
// Bledy sieciowe Node'a (fetch failed) chowaja prawdziwy powod w err.cause -
// wyciagamy go, bo samo "fetch failed" nic nie mowi administratorowi.
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

// Szkielet: dopoki POWERDNS_API_URL nie jest ustawione (laczenie VPS4 -> VPS1
// jeszcze nie ustalone - patrz docs/architecture.md), zwracamy pusta liste
// zamiast bledu, zeby panel dalo sie uruchomic i przetestowac logowanie.
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

// rrset: { name, type, ttl?, changetype: 'REPLACE'|'DELETE', records? }
// REPLACE tworzy rrset jesli nie istnieje albo nadpisuje istniejacy (edycja
// = REPLACE pod tym samym name+type) - tak dziala PowerDNS API v1.
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

// Odpowiednik `pdns_control notify <zone>` przez API: wysyla DNS NOTIFY do
// wszystkich secondary. Podbijanie SOA (dawniej robione tu recznie, jak
// `pdnsutil increase-serial`) NIE jest juz potrzebne - SOA-EDIT-API=INCREASE
// jest ustawione na kazdej strefie i w default-soa-edit-api na primary, wiec
// PowerDNS sam podbija serial przy kazdej zmianie rrsetu przez API.
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
