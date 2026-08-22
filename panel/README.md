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

Zalogowany użytkownik może sam zmienić swój e-mail i hasło w zakładce
**Ustawienia** (lewe menu) — kafelek "Informacje Administratora" (`PATCH
/api/auth/email`, `POST /api/auth/change-password`, obie wymagają podania
obecnego hasła), obok kafelek informacyjny z rolą i datą utworzenia konta.

Na głównej zakładce ("Strefy DNS") u góry jest rząd 4 kafelków ze
statystykami hosta (CPU/RAM/SWAP/DYSK), `GET /api/stats`
(`server/services/systemStats.js`, wzorowane na cdn-caddy — `os`/`fs` z
Node, bez zewnętrznych zależności). Odświeżają się przy wejściu na
zakładkę.

Poniżej dwa kafelki obok siebie: "Strefy DNS" (lista stref z PowerDNS API,
z przyciskiem "Edytuj" przy każdej) i "Serwery DNS" — lista ns1 (primary) +
ns2/ns3/ns4 (secondary). Nazwy/role/adresy IP są ręcznie utrzymywane w
`panel/server/config/dns-servers.json` (PowerDNS API nie zna topologii
całego klastra — każdy serwer ma osobne, niepołączone ze sobą API). **Wpis
`primary` dostaje żywy status/wersję** z faktycznie podłączonego API (ns1);
ns2-ns4 zostają statyczne, dopóki nie dojdą osobne połączenia do nich.
**Uzupełnij prawdziwe adresy IP** w tym pliku (pole `address` puste w
szkielecie).

Kliknięcie "Edytuj" przy strefie otwiera na pełną szerokość edytor
rekordów (`GET /api/zones/:zoneId`) z listą rrsetów i przyciskami
Edytuj/Usuń przy każdym, oraz formularzem dodania/edycji rekordu (nazwa,
typ, TTL, treść) — `PUT /api/zones/:zoneId/rrset` (PowerDNS `changetype:
REPLACE`, tworzy lub nadpisuje rrset pod tym samym name+type) i
`DELETE /api/zones/:zoneId/rrset` (`changetype: DELETE`). Na razie jeden
rekord (jedna wartość `content`) na rrset — round-robin z wieloma
wartościami pod tą samą nazwą/typem to możliwe rozszerzenie na później.
Nazwy oraz cele CNAME/MX/NS muszą kończyć się kropką (konwencja PowerDNS).

W zakładce **Ustawienia**, drugi rząd, dwa kolejne kafelki:
- **"Połączenie z PowerDNS API"** — adres/port ns1 + API key. Zapis
  (`PUT /api/settings/powerdns`) na trwałe aktualizuje `POWERDNS_API_URL`/
  `POWERDNS_API_KEY` w pliku `.env` (zachowując resztę pliku bez zmian,
  `server/services/envFile.js`) **i** natychmiast konfigurację w pamięci —
  bez restartu usługi. Klucz API nigdy nie wraca do przeglądarki (tylko
  informacja, czy jest ustawiony); zostawienie pola pustego przy zapisie
  zachowuje dotychczasowy klucz.
- **"Test połączenia"** — `POST /api/settings/powerdns/test`, odpytuje
  `GET /api/v1/servers/localhost` na zapisanym adresie i pokazuje wynik.

## Struktura

```
server/
  index.js              punkt wejścia (Express)
  config.js              zmienne środowiskowe (.env)
  db.js / db/schema.sql  SQLite (better-sqlite3), migracja + seed admina
  routes/auth.js         login / logout / me / change-password / email
  routes/zones.js        GET /api/zones, GET/:zoneId, PUT/DELETE .../rrset
  routes/stats.js        GET /api/stats (CPU/RAM/SWAP/DYSK hosta)
  routes/dnsServers.js   GET /api/dns-servers (lista ns1-ns4 z config/)
  routes/settings.js     GET/PUT /api/settings/powerdns, POST .../test
  config/dns-servers.json  reczna lista serwerow NS (nazwa/rola/adres)
  services/authService.js
  services/powerdnsApi.js
  services/systemStats.js
  services/dnsServers.js
  services/envFile.js    zapis pojedynczych kluczy do .env w miejscu
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

`/opt/pdns-panel` to **bezpośrednio klon repo** `pdns-geo` — jeden katalog,
żadnego osobnego "katalogu źródłowego". Wszystko (pierwsza instalacja i
każda kolejna aktualizacja) robi się z tej samej lokalizacji.

**Pierwsza instalacja** (z dowolnego miejsca, np. z `/root`):
```bash
curl -fsSL https://raw.githubusercontent.com/zbigniew73/pdns-geo/main/panel/scripts/install.sh | sudo bash
```
albo, jeśli masz już repo sklonowane gdziekolwiek:
```bash
sudo panel/scripts/install.sh
```
Skrypt sklonuje repo do `/opt/pdns-panel` (jeśli tam jeszcze niczego nie ma),
zainstaluje Node.js 20, utworzy użytkownika systemowego `pdnspanel` i
uruchomi usługę `pdns-panel`. **Jeśli `/opt/pdns-panel` już istnieje ze
starszej wersji tego skryptu** (katalog kopiowany przez rsync, bez git) —
`install.sh` sam to wykryje, zmigruje do klonu repo i **zachowa** `.env`
oraz bazę (`panel/data/panel.db`); stary katalog zostaje jako kopia
zapasowa `/opt/pdns-panel.pre-git-<timestamp>`.

**Kolejne aktualizacje — zawsze z `/opt/pdns-panel`:**
```bash
cd /opt/pdns-panel
sudo panel/scripts/update.sh
```
(`git pull` w miejscu, `npm install`, restart usługi.)

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
zmienione i zapomniane), na serwerze, w `/opt/pdns-panel/panel`:

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
