const dns = require('dns');
const maxmind = require('maxmind');
const config = require('../config');

const PUBLIC_RESOLVER = '8.8.8.8';
const GEOIP_CITY_DB_PATH = process.env.GEOIP_CITY_DB_PATH || '/usr/share/GeoIP/GeoLite2-City.mmdb';

function normalizeName(name) {
  return String(name || '').toLowerCase().replace(/\.$/, '');
}

function makeResolver() {
  const resolver = new dns.promises.Resolver({ timeout: 5000, tries: 1 });
  resolver.setServers([PUBLIC_RESOLVER]);
  return resolver;
}

async function checkServerOnline(address, address6, zoneName) {
  const ip = address || address6;
  if (!ip) return 'unknown';
  try {
    const resolver = new dns.promises.Resolver({ timeout: 3000, tries: 1 });
    resolver.setServers([ip]);
    await resolver.resolveSoa(zoneName);
    return 'online';
  } catch {
    return 'offline';
  }
}

let cityLookupPromise = null;
function getCityLookup() {
  if (!cityLookupPromise) {
    cityLookupPromise = maxmind.open(GEOIP_CITY_DB_PATH).catch((err) => {
      cityLookupPromise = null;
      throw err;
    });
  }
  return cityLookupPromise;
}

async function lookupLocation(ip) {
  if (!ip) return { countryIso: '', location: '' };

  let country = '';
  let timeZone = '';
  try {
    const lookup = await getCityLookup();
    const result = lookup.get(ip);
    country = (result && result.country && result.country.iso_code) || '';
    timeZone = (result && result.location && result.location.time_zone) || '';
  } catch {}

  return {
    countryIso: country,
    location: [country, timeZone].filter(Boolean).join(' '),
  };
}

async function getDnsServers() {
  if (!config.powerdns.nsZone) {
    return { configured: false, servers: [], error: 'zone_not_configured' };
  }

  const zoneName = normalizeName(config.powerdns.nsZone);
  const resolver = makeResolver();

  let nsHosts;
  try {
    nsHosts = (await resolver.resolveNs(zoneName)).map(normalizeName).sort();
  } catch (err) {
    return { configured: true, servers: [], error: 'dns_query_failed', message: err.message };
  }
  if (!nsHosts.length) {
    return { configured: true, servers: [], error: 'no_ns_records' };
  }

  const primaryHost = nsHosts.find((h) => h.split('.')[0] === 'ns1') || nsHosts[0];

  const servers = await Promise.all(
    nsHosts.map(async (host) => {
      const [v4, v6] = await Promise.allSettled([resolver.resolve4(host), resolver.resolve6(host)]);
      const address = v4.status === 'fulfilled' ? v4.value[0] : '';
      const address6 = v6.status === 'fulfilled' ? v6.value[0] : '';
      const isPrimary = host === primaryHost;
      const geo = await lookupLocation(address || address6);

      return {
        name: host,
        role: isPrimary ? 'primary' : 'secondary',
        address,
        address6,
        countryIso: geo.countryIso,
        location: geo.location,
        status: await checkServerOnline(address, address6, zoneName),
      };
    })
  );

  return { configured: true, servers };
}

module.exports = { getDnsServers };
