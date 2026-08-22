const fs = require('fs');
const path = require('path');
const powerdnsApi = require('./powerdnsApi');

const CONFIG_PATH = path.join(__dirname, '..', 'config', 'dns-servers.json');

function readServerList() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return [];
  }
}

// Nazwy/role/adresy sa recznie utrzymywane w pliku JSON (PowerDNS API nie
// zna calego klastra ns1-ns4 - kazdy serwer ma wlasne, osobne API). To,
// co JEST z API, to zywy status polaczonego serwera (POWERDNS_API_URL w
// .env wskazuje na primary/ns1) - dolaczamy go do wpisu z role="primary".
async function getDnsServers() {
  const servers = readServerList();
  const primary = servers.find((s) => s.role === 'primary');
  if (!primary) return servers;

  const test = await powerdnsApi.testConnection();
  primary.status = test.ok ? 'online' : test.error === 'not_configured' ? 'unknown' : 'offline';
  if (test.ok) primary.version = test.version;

  return servers;
}

module.exports = { getDnsServers };
