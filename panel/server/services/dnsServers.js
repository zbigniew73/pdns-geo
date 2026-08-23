const config = require('../config');
const powerdnsApi = require('./powerdnsApi');

function normalizeName(name) {
  return String(name || '').toLowerCase().replace(/\.$/, '');
}

// Lista serwerow NS NIE jest trzymana w zadnym pliku - wyliczana jest za
// kazdym razem z tresci skonfigurowanej strefy referencyjnej
// (POWERDNS_NS_ZONE, ustawiana w Ustawienia -> Polaczenie z PowerDNS API):
// rrset NS przy apeksie strefy daje liste i faktyczna liczbe serwerow (2,
// 3, 4... - ile ich naprawde jest w tej strefie), SOA MNAME wskazuje ktory
// z nich jest primary, A/AAAA w tej samej strefie daja adresy. Zywy
// status/wersja dolaczane sa tylko do primary - to jedyny serwer, z ktorym
// panel ma bezposrednie polaczenie API.
async function getDnsServers() {
  if (!config.powerdns.apiUrl) {
    return { configured: false, servers: [], error: 'not_configured' };
  }
  if (!config.powerdns.nsZone) {
    return { configured: false, servers: [], error: 'zone_not_configured' };
  }

  const zone = await powerdnsApi.getZone(config.powerdns.nsZone);
  const rrsets = zone.rrsets || [];
  const zoneName = normalizeName(zone.name);

  const nsRrset = rrsets.find((rr) => rr.type === 'NS' && normalizeName(rr.name) === zoneName);
  const nsHosts = (nsRrset?.records || []).map((r) => normalizeName(r.content));
  if (!nsHosts.length) {
    return { configured: true, servers: [], error: 'no_ns_records' };
  }

  const soaRrset = rrsets.find((rr) => rr.type === 'SOA' && normalizeName(rr.name) === zoneName);
  const soaContent = soaRrset?.records?.[0]?.content || '';
  const primaryHost = soaContent ? normalizeName(soaContent.split(' ')[0]) : null;

  const test = await powerdnsApi.testConnection();

  const servers = nsHosts.map((host) => {
    const aRrset = rrsets.find((rr) => rr.type === 'A' && normalizeName(rr.name) === host);
    const aaaaRrset = rrsets.find((rr) => rr.type === 'AAAA' && normalizeName(rr.name) === host);
    const isPrimary = host === primaryHost;

    const entry = {
      name: host,
      role: isPrimary ? 'primary' : 'secondary',
      address: aRrset?.records?.[0]?.content || '',
      address6: aaaaRrset?.records?.[0]?.content || '',
    };
    if (isPrimary) {
      entry.status = test.ok ? 'online' : test.error === 'not_configured' ? 'unknown' : 'offline';
      if (test.ok) entry.version = test.version;
    }
    return entry;
  });

  return { configured: true, servers };
}

module.exports = { getDnsServers };
