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

// "online"/"offline" per serwer = czy on sam odpowiada na zapytanie DNS o
// SOA strefy (jak `dig @<ip_serwera> <strefa> SOA`) - pytamy bezposrednio
// jego wlasny adres, nie resolver publiczny. To dziala tak samo dla
// primary i secondary, bez potrzeby posiadania klucza API do kazdego z nich.
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

// Bazy GeoIP2 sa duze - otwieramy je raz i trzymamy w pamieci procesu,
// zamiast czytac plik przy kazdym zapytaniu. Jesli pliku nie ma (np.
// maszyna deweloperska bez geoipupdate), dana czesc lokalizacji po prostu
// zostaje pusta - to nie jest blad krytyczny dla reszty kafelka.
// GeoLite2-City nie jest uzywana: darmowa baza dla adresow
// hostingowych/serwerowniowych zwykle i tak nie zna miasta (tylko kraj z
// duzym accuracy_radius) - Country.mmdb daje to samo mniejszym kosztem, a
// ASN.mmdb dokladamy jako realna, dostepna informacje o dostawcy serwera.
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
    // baza ASN niedostepna - jedziemy dalej bez niej
  }

  return [country, asn].filter(Boolean).join(' | ');
}

// Kafelek "Serwery DNS" nie czyta zadnego pliku ani nie zgaduje topologii -
// za kazdym razem odpytuje prawdziwy DNS (jak `dig @8.8.8.8 <strefa> NS`)
// o strefe referencyjna ustawiona w Ustawieniach (POWERDNS_NS_ZONE). Ile i
// jakie serwery NS istnieja wynika z odpowiedzi resolvera - nie z zalozen.
// Serwer, ktorego pierwsza etykieta nazwy to "ns1", jest traktowany jako
// primary (konwencja nazewnictwa w tym wdrozeniu), reszta jako secondary.
// Adresy IPv4/IPv6 kazdego serwera to kolejne, osobne zapytania DNS (A/AAAA),
// lokalizacja to lookup w lokalnych bazach GeoIP2 po znalezionym adresie IP.
// Status online/offline to bezposrednie zapytanie SOA do KAZDEGO serwera
// (nie tylko primary) - patrz checkServerOnline(). Wersje PowerDNS dostaje
// tylko wpis primary, bo to jedyny serwer, z ktorym panel ma bezposrednie
// polaczenie do API zarzadzania (adres/klucz w Ustawieniach).
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
