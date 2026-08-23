const path = require('path');
const express = require('express');
const session = require('express-session');
const config = require('./config');
const { initDb } = require('./db');
const authRouter = require('./routes/auth');
const zonesRouter = require('./routes/zones');
const statsRouter = require('./routes/stats');
const dnsServersRouter = require('./routes/dnsServers');
const settingsRouter = require('./routes/settings');

const db = initDb();
const app = express();
app.disable('x-powered-by');

// Za Caddy (reverse proxy) - potrzebne, zeby express-session widzialo
// polaczenie jako "secure" na podstawie X-Forwarded-Proto.
app.set('trust proxy', 1);

app.use(express.json());
app.use(
  session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', secure: 'auto' },
  })
);

app.use('/api/auth', authRouter(db));
app.use('/api/zones', zonesRouter());
app.use('/api/stats', statsRouter());
app.use('/api/dns-servers', dnsServersRouter());
app.use('/api/settings', settingsRouter(db));
app.use('/flags', express.static(path.join(__dirname, '..', 'node_modules', 'flag-icons', 'flags', '4x3')));
app.use(express.static(path.join(__dirname, '..', 'web')));

app.listen(config.port, config.host, () => {
  console.log(`pdns-geo panel (szkielet) nasluchuje na ${config.host}:${config.port}`);
});
