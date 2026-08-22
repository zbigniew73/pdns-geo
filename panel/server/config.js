const path = require('path');
require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  // Tylko lokalnie - ruch z internetu ma przechodzic przez Caddy (TLS).
  host: process.env.HOST || '127.0.0.1',
  sessionSecret: process.env.SESSION_SECRET || 'zmien-mnie-na-losowy-sekret',
  dbPath: process.env.DB_PATH || path.join(__dirname, '..', 'data', 'panel.db'),
  adminEmail: process.env.ADMIN_EMAIL || 'panel@pdnstest.pl',
  adminPassword: process.env.ADMIN_PASSWORD || 'pass123!',
  powerdns: {
    apiUrl: process.env.POWERDNS_API_URL || '',
    apiKey: process.env.POWERDNS_API_KEY || '',
  },
};
