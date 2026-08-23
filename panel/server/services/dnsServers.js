const dns = require('dns');
const maxmind = require('maxmind');
const config = require('../config');
const powerdnsApi = require('./powerdnsApi');

const PUBLIC_RESOLVER = '8.8.8.8';
const GEOIP_COUNTRY_DB_PATH = process.env.GEOIP_COUNTRY_DB_PATH || '/usr/share/GeoIP/GeoLite2-Country.mmdb';
const GEOIP_ASN_DB_PATH = process.env.GEOIP_ASN_DB_PATH || '/usr/share/GeoIP/GeoLite2-ASN.mmdb';

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

let countryLookupPromise = null;
function getCountryLookup() {
  if (!countryLookupPromise) {
    countryLookupPromise = maxmind.open(GEOIP_COUNTRY_DB_PATH).catch((err) => {
      countryLookupPromise = null;
      throw err;
    });
  }
  return countryLookupPromise;
}

let asnLookupPromise = null;
function getAsnLookup() {
  if (!asnLookupPromise) {
    asnLookupPromise = maxmind.open(GEOIP_ASN_DB_PATH).catch((err) => {
      asnLookupPromise = null;
      throw err;
    });
  }
  return asnLookupPromise;
}

async function lookupLocation(ip) {
  if (!ip) return '';

  let country = '';
  try {
    const lookup = await getCountryLookup();
    const result = lookup.get(ip);
    country = (result && result.country && result.country.iso_code) || '';
  } catch {
    // baza kraju niedostepna - jedziemy dalej bez niej
  }

  let asn = '';
  try {
    const lookup = await getAsnLookup();
    const result = lookup.get(ip);
    if (result && result.autonomous_system_number) {
      const org = result.autonomous_system_organization ? ` ${result.autonomous_system_organization}` : '';
      asn = `AS${result.autonomous_system_number}${org}`;
    }
  } catch {
    }

  return [country, asn].filter(Boolean).join(' | ');
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
  const test = config.powerdns.apiUrl
    ? await powerdnsApi.testConnection()
    : { ok: false, error: 'not_configured' };

  const servers = await Promise.all(
    nsHosts.map(async (host) => {
      const [v4, v6] = await Promise.allSettled([resolver.resolve4(host), resolver.resolve6(host)]);
      const address = v4.status === 'fulfilled' ? v4.value[0] : '';
      const address6 = v6.status === 'fulfilled' ? v6.value[0] : '';
      const isPrimary = host === primaryHost;

      const entry = {
        name: host,
        role: isPrimary ? 'primary' : 'secondary',
        address,
        address6,
        location: await lookupLocation(address || address6),
        status: await checkServerOnline(address, address6, zoneName),
      };
      if (isPrimary && test.ok) {
        entry.version = test.version;
      }
      return entry;
    })
  );

  return { configured: true, servers };
}

module.exports = { getDnsServers };
