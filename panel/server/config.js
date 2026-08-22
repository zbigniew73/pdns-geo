const path = require('path');
require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  sessionSecret: process.env.SESSION_SECRET || 'zmien-mnie-na-losowy-sekret',
  dbPath: process.env.DB_PATH || path.join(__dirname, '..', 'data', 'panel.db'),
  adminEmail: process.env.ADMIN_EMAIL || 'panel@24z.eu',
  adminPassword: process.env.ADMIN_PASSWORD || 'pass123!',
  powerdns: {
    apiUrl: process.env.POWERDNS_API_URL || '',
    apiKey: process.env.POWERDNS_API_KEY || '',
  },
};
