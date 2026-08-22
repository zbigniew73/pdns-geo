# pdns-geo panel (szkielet)

Panel do zarządzania strefami DNS na PowerDNS (VPS 4). **To jest szkielet** —
działa (logowanie, wymuszona zmiana hasła, prosty widok stref), ale nie jest
jeszcze wdrożony ani podłączony do PowerDNS API. Wzorowany na układzie
katalogów i skryptach instalacyjnych z prywatnego repo
[cdn-caddy](https://github.com/zbigniew73/cdn-caddy) (Node.js + systemd
install/update), auth przerobiony pod ten projekt — patrz niżej.

## Model auth

W przeciwieństwie do cdn-caddy (PAM, konta systemowe Linux — panel dla
admina infrastruktury), ten panel ma docelowo obsługiwać **klientów**
zarządzających własnymi strefami. Dlatego użytkownicy są w tabeli `users`
w SQLite (`server/db/schema.sql`), niezależnej od kont systemowych.

Na razie: jedno konto seedowane automatycznie przy pierwszym starcie (gdy
tabela `users` jest pusta) z `ADMIN_EMAIL`/`ADMIN_PASSWORD` w `.env`
(domyślnie `panel@pdnstest.pl` / `pass123!`). Zmiana hasła jest **wymuszona po
stronie serwera** (`must_change_password`, middleware
`requirePasswordChanged` blokuje resztę API) — nie tylko w UI.

Wielu klientów / przypisanie stref do konta — jeszcze nie zaimplementowane,
schemat `users.role` jest przygotowany pod to na później.

## Struktura

```
server/
  index.js              punkt wejścia (Express)
  config.js              zmienne środowiskowe (.env)
  db.js / db/schema.sql  SQLite (better-sqlite3), migracja + seed admina
  routes/auth.js         login / logout / me / change-password
  routes/zones.js        GET /api/zones (proxy do PowerDNS REST API)
  services/authService.js
  services/powerdnsApi.js
  middleware/requireAuth.js
web/                      statyczny frontend (bez frameworka)
  i18n.js                 slownik PL/EN (wzorowany na cdn-caddy/web/i18n.js)
  theme-init.js           motyw jasny/ciemny (localStorage), jak w cdn-caddy
scripts/                  check-os.sh / install.sh / update.sh (jak w scripts/ dla DNS)
panel.service.example     jednostka systemd
```

## Uruchomienie lokalnie (dev)

```bash
cd panel
cp .env.example .env
npm install
npm start
# http://localhost:3000  ->  panel@pdnstest.pl / pass123!  (zmiana hasła wymuszona)
```

## Wdrożenie (VPS 4, 212.132.118.19)

**Dwa różne katalogi — nie mylić:**

- **Katalog źródłowy** (klon repo, np. `/root/pdns-geo` albo `~/pdns-geo`) —
  stąd robisz `git pull` i stąd uruchamiasz `install.sh`/`update.sh`. To
  Twoja "kopia robocza" repo, sama w sobie NIE jest uruchomiona jako usługa.
- **Katalog wdrożenia `/opt/pdns-panel`** — tu `install.sh`/`update.sh`
  kopiują (rsync) pliki z katalogu źródłowego, stąd faktycznie działa usługa
  systemd `pdns-panel`, tu jest `.env` i baza (`data/panel.db`). Stąd
  uruchamiasz narzędzia diagnostyczne (`list-users.js`,
  `reset-admin-password.js` — patrz niżej), bo tylko tu jest prawdziwa,
  aktualnie używana baza.

```bash
# w katalogu zrodlowym (klon repo)
git pull
sudo panel/scripts/install.sh   # pierwsze wdrozenie
# albo, przy kolejnych aktualizacjach:
sudo panel/scripts/update.sh
```

Instaluje Node.js 20 (moduł dnf), tworzy usera systemowego `pdnspanel`,
kopiuje pliki do `/opt/pdns-panel`, stawia usługę systemd `pdns-panel`.

Panel nasłuchuje wyłącznie na `127.0.0.1:3000` (zob. `HOST`/`PORT` w `.env`)
— ruch z internetu ma iść przez reverse proxy. Przykładowy `Caddyfile.example`:

```
panel.24z.eu {
    reverse_proxy 127.0.0.1:3000
}
```

Skopiuj do `/etc/caddy/Caddyfile` (albo dołącz przez `import` z osobnego
pliku w `/etc/caddy/conf.d/`), potem `caddy reload --config /etc/caddy/Caddyfile`.
Caddy sam wystawi certyfikat Let's Encrypt, jeśli DNS `panel.24z.eu` wskazuje
na ten serwer i porty 80/443 są otwarte.

## Zablokowany dostęp / reset hasła admina

Jeśli logowanie na domyślne konto nie działa (np. hasło było już kiedyś
zmienione i zapomniane), na serwerze, w `/opt/pdns-panel`:

```bash
# Co faktycznie jest w bazie (e-mail, czy zmiana hasła jest wymuszona)
node scripts/list-users.js

# Wymuszony reset hasła (nadpisuje, jeśli konto istnieje; tworzy, jeśli nie)
node scripts/reset-admin-password.js panel@pdnstest.pl 'NoweHaslo123'
```

`reset-admin-password.js` ustawia hasło bez wymuszania kolejnej zmiany przy
logowaniu (`must_change_password = 0`) — to narzędzie ratunkowe, nie część
normalnego flow.

## Czego świadomie brakuje (kolejne kroki)

- **Połączenie z PowerDNS API**: `install-primary.sh` (warstwa DNS) wystawia
  REST API tylko na `127.0.0.1:8081` na VPS1 — sposób, jak VPS4 ma się tam
  dostać (VPN/tunel), nie jest jeszcze ustalony. Do czasu ustawienia
  `POWERDNS_API_URL`/`POWERDNS_API_KEY` w `.env`, widok stref pokazuje
  "nieskonfigurowane" zamiast danych.
- **TLS / reverse proxy** dla `panel.24z.eu` (Caddy jako proxy przed
  `pdns-panel` na `127.0.0.1:3000` — analogicznie do wzorca z cdn-caddy).
- **Wielodostępność**: przypisanie stref do konkretnego konta klienta.
- **Trwała sesja**: `express-session` używa domyślnego MemoryStore — do
  produkcji wymień na coś trwałego, jeśli usługa ma restartować się często
  lub działać w więcej niż jednej instancji.
