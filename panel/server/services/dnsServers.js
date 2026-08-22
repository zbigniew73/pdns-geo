const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'config', 'dns-servers.json');

// Szkielet: lista serwerow NS jest na razie recznie utrzymywana w pliku
// JSON (adresy IP nie sa nigdzie indziej w kodzie), nie z PowerDNS API -
// to sie zmieni, gdy polaczenie VPS4 -> VPS1 API bedzie ustalone.
function getDnsServers() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return [];
  }
}

module.exports = { getDnsServers };
