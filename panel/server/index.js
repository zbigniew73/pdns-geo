const path = require('path');
const express = require('express');
const session = require('express-session');
const config = require('./config');
const { initDb } = require('./db');
const authRouter = require('./routes/auth');
const zonesRouter = require('./routes/zones');

const db = initDb();
const app = express();

app.use(express.json());
app.use(
  session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax' },
  })
);

app.use('/api/auth', authRouter(db));
app.use('/api/zones', zonesRouter());
app.use(express.static(path.join(__dirname, '..', 'web')));

app.listen(config.port, () => {
  console.log(`pdns-geo panel (szkielet) nasluchuje na porcie ${config.port}`);
});
