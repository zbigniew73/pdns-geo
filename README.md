# pdns-geo

Managed DNS / GeoDNS na bazie PowerDNS Authoritative Server + rekordy Lua.

## Model usługi

Zapewniamy **infrastrukturę DNS**. Klient sam zarządza swoimi rekordami, GeoDNS, routingiem i failoverem — przez panel/API (planowane, VPS 4). Nie ingerujemy w treść stref, tylko w to, żeby DNS odpowiadał szybko, poprawnie i z odpowiednim serwerem geograficznie najbliższym pytającemu.

## Architektura

```
                    ┌─────────────────────┐
                    │   VPS 4 — Panel     │
                    │  DNS + API + monit. │  (klient zarządza rekordami tutaj)
                    └──────────┬──────────┘
                               │ PowerDNS REST API
                               ▼
                    ┌─────────────────────┐
                    │   VPS 1 — MASTER    │
                    │ PowerDNS Auth +     │
                    │ GeoDNS/Lua + MariaDB│  (źródło prawdy)
                    └──────────┬──────────┘
                     NOTIFY +  │  AXFR/IXFR (TSIG)
              ┌────────────────┼────────────────┐
              ▼                                 ▼
   ┌─────────────────────┐           ┌─────────────────────┐
   │  VPS 2 — SLAVE       │           │  VPS 3 — SLAVE       │
   │ PowerDNS Auth +      │           │ PowerDNS Auth +      │
   │ GeoDNS/Lua + MariaDB │           │ GeoDNS/Lua + MariaDB │
   └─────────────────────┘           └─────────────────────┘
```

Środowisko: RHEL-family (AlmaLinux/Rocky 9, `dnf`), PowerDNS Authoritative 5.0.x, MariaDB jako backend (`gmysql`).

- **VPS 1 (Primary/Master)**: jedyne miejsce zapisu stref. Panel/API (VPS 4) rozmawia z nim przez PowerDNS REST API.
- **VPS 2/3 (Secondary/Slave)**: autoprowizjonują się przez PowerDNS `autosecondary` — dostają NOTIFY, robią AXFR/IXFR, dalej trzymają dane lokalnie w swojej MariaDB. Zero ręcznej synchronizacji baz.
- **GeoDNS/Lua**: rekordy typu `LUA` są częścią strefy i replikują się razem z nią. Każdy serwer (master i każdy secondary) ocenia je **lokalnie**, na podstawie IP resolvera który pyta — więc geo-routing i failover działają niezależnie na każdym VPS, także przy awarii innych.

## Zawartość repo

- `docs/architecture.md` — szczegółowe decyzje projektowe i uzasadnienia.
- `scripts/install-primary.sh` — instalacja i konfiguracja PowerDNS na VPS 1.
- `scripts/install-secondary.sh` — instalacja i konfiguracja PowerDNS na VPS 2/3.
- `scripts/generate-tsig-key.sh` — generowanie klucza TSIG do bezpiecznego AXFR/NOTIFY.
- `config/` — szablony `pdns.conf` dla primary i secondary.
- `zones/example.com.geo.zone` — przykładowa strefa z rekordami Lua GeoDNS.
- `panel/` — szkielet panelu do zarządzania strefami DNS (VPS 4, `panel.24z.eu`), patrz `panel/README.md`.

## Status

Warstwa DNS: ns1 primary + ns2/ns3/ns4 secondary skonfigurowane. Panel (VPS 4, `212.132.118.19` / `panel.24z.eu`) — w budowie: szkielet w `panel/` (logowanie + wymuszona zmiana hasła + widok stref), jeszcze bez wdrożenia i bez połączenia z PowerDNS API.
