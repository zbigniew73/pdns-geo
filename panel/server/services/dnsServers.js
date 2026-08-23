const dns = require('dns');
const maxmind = require('maxmind');
const config = require('../config');
const powerdnsApi = require('./powerdnsApi');

const PUBLIC_RESOLVER = '8.8.8.8';
const GEOIP_DB_PATH = process.env.GEOIP_DB_PATH || '/usr/share/GeoIP/GeoLite2-City.mmdb';

function normalizeName(name) {
  return String(name || '').toLowerCase().replace(/\.$/, '');
}

function makeResolver() {
  const resolver = new dns.promises.Resolver({ timeout: 5000, tries: 1 });
  resolver.setServers([PUBLIC_RESOLVER]);
  return resolver;
}

// Baza GeoIP2 jest duza (dziesiatki MB) - otwieramy ja raz i trzymamy w
// pamieci procesu, zamiast czytac plik przy kazdym zapytaniu. Jesli pliku
// nie ma (np. maszyna deweloperska bez geoipupdate), lokalizacje po prostu
// zostaja puste - to nie jest blad krytyczny dla reszty kafelka.
let geoipLookupPromise = null;
function getGeoipLookup() {
  if (!geoipLookupPromise) {
    geoipLookupPromise = maxmind.open(GEOIP_DB_PATH).catch((err) => {
      geoipLookupPromise = null;
      throw err;
    });
  }
  return geoipLookupPromise;
}

async function lookupLocation(ip) {
  if (!ip) return '';
  try {
    const lookup = await getGeoipLookup();
    const result = lookup.get(ip);
    if (!result) return '';
    const city = result.city && result.city.names && result.city.names.en;
    const country = result.country && result.country.iso_code;
    return [city, country].filter(Boolean).join(', ');
  } catch {
    return '';
  }
}

// Kafelek "Serwery DNS" nie czyta zadnego pliku ani nie zgaduje topologii -
// za kazdym razem odpytuje prawdziwy DNS (jak `dig @8.8.8.8 <strefa> NS`)
// o strefe referencyjna ustawiona w Ustawieniach (POWERDNS_NS_ZONE). Ile i
// jakie serwery NS istnieja wynika z odpowiedzi resolvera - nie z zalozen.
// Serwer, ktorego pierwsza etykieta nazwy to "ns1", jest traktowany jako
// primary (konwencja nazewnictwa w tym wdrozeniu), reszta jako secondary.
// Adresy IPv4/IPv6 kazdego serwera to kolejne, osobne zapytania DNS (A/AAAA),
// lokalizacja to lookup w lokalnej bazie GeoIP2 (GeoLite2-City.mmdb) po
// znalezionym adresie IP. Zywy status/wersje PowerDNS dostaje tylko wpis
// primary, bo to jedyny serwer, z ktorym panel ma bezposrednie polaczenie
// API (adres/klucz w Ustawieniach).
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
      };
      if (isPrimary) {
        entry.status = test.ok ? 'online' : test.error === 'not_configured' ? 'unknown' : 'offline';
        if (test.ok) entry.version = test.version;
      }
      return entry;
    })
  );

  return { configured: true, servers };
}

module.exports = { getDnsServers };
