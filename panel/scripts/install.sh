#!/usr/bin/env bash
# Instaluje szkielet panelu pdns-geo (VPS 4) jako usluge systemd na
# AlmaLinux/Rocky Linux 9. /opt/pdns-panel (TARGET_DIR) jest bezposrednio
# klonem repo pdns-geo - kolejne aktualizacje robi sie STAMTAD, przez
# `sudo panel/scripts/update.sh` (git pull w miejscu), bez osobnego
# katalogu zrodlowego.
#
# Pierwsze uzycie (z dowolnego katalogu, np. z klonu repo do bootstrapu):
#   sudo panel/scripts/install.sh
# Jesli TARGET_DIR juz istnieje jako stary (nie-git) katalog wdrozenia z
# wczesniejszej wersji tego skryptu, .env i data/ zostana zachowane.
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
    echo "Uruchom jako root (sudo)." >&2
    exit 1
fi

REPO_URL="${REPO_URL:-https://github.com/zbigniew73/pdns-geo.git}"
TARGET_DIR="${TARGET_DIR:-/opt/pdns-panel}"
SERVICE_USER="${SERVICE_USER:-pdnspanel}"

echo "==> Instaluje Node.js (moduł dnf nodejs:20), git i narzędzia budowania"
dnf module reset -y nodejs >/dev/null 2>&1 || true
dnf module install -y nodejs:20
dnf install -y gcc-c++ make python3 git

if [[ -d "${TARGET_DIR}/.git" ]]; then
    echo "==> ${TARGET_DIR} to juz klon repo - pomijam klonowanie (do aktualizacji uzyj update.sh)"
elif [[ -d "${TARGET_DIR}" && -n "$(ls -A "${TARGET_DIR}" 2>/dev/null)" ]]; then
    echo "==> Wykryto starszy (nie-git) katalog wdrozenia w ${TARGET_DIR} - migruje do klonu repo"
    MIGRATE_BACKUP="${TARGET_DIR}.pre-git-$(date +%s)"
    mv "${TARGET_DIR}" "${MIGRATE_BACKUP}"
    git clone "${REPO_URL}" "${TARGET_DIR}"
    mkdir -p "${TARGET_DIR}/panel"
    for item in .env data; do
        if [[ -e "${MIGRATE_BACKUP}/${item}" ]]; then
            echo "==> Przenoszę ${item} ze starego wdrożenia"
            mv "${MIGRATE_BACKUP}/${item}" "${TARGET_DIR}/panel/${item}"
        fi
    done
    echo "==> Stary katalog zachowany jako kopia zapasowa: ${MIGRATE_BACKUP}"
    echo "    (usuń go ręcznie po weryfikacji, że wszystko działa)"
else
    echo "==> Klonuję repo do ${TARGET_DIR}"
    git clone "${REPO_URL}" "${TARGET_DIR}"
fi

PANEL_DIR="${TARGET_DIR}/panel"

# git clone/mv jako root moze zostawic TARGET_DIR z prawami np. 700 (zalezne
# od umask) - wtedy SERVICE_USER nie moze nawet wejsc do katalogu, mimo ze
# PANEL_DIR w srodku jest poprawnie mu przekazany. Wymuszamy przechodnie
# prawa wejscia (nie zapisu) na kazdym poziomie do PANEL_DIR.
chmod 755 "${TARGET_DIR}"

"${PANEL_DIR}/scripts/check-os.sh"

if ! id "${SERVICE_USER}" >/dev/null 2>&1; then
    echo "==> Tworzę użytkownika systemowego ${SERVICE_USER}"
    useradd --system --home-dir "${PANEL_DIR}" --shell /sbin/nologin "${SERVICE_USER}"
else
    # Konto moglo zostac utworzone przez starsza wersje tego skryptu z
    # katalogiem domowym w TARGET_DIR (root repo, bez praw zapisu) - npm
    # potrzebuje zapisywalnego $HOME na cache (~/.npm).
    usermod --home "${PANEL_DIR}" "${SERVICE_USER}" 2>/dev/null || true
fi

if [[ ! -f "${PANEL_DIR}/.env" ]]; then
    echo "==> Tworzę .env z .env.example (domyślne wartości - dostosuj przed produkcją)"
    cp "${PANEL_DIR}/.env.example" "${PANEL_DIR}/.env"
fi

mkdir -p "${PANEL_DIR}/data"
echo "==> Nadaję ${SERVICE_USER} prawa do ${PANEL_DIR} (npm musi tam pisać node_modules)"
chown -R "${SERVICE_USER}:${SERVICE_USER}" "${PANEL_DIR}"

echo "==> Uprawnienia (diagnostyka na wypadek dalszych problemow):"
ls -ld "${TARGET_DIR}" "${PANEL_DIR}"
id "${SERVICE_USER}"

echo "==> Instaluję zależności npm (production)"
cd "${PANEL_DIR}"
sudo -u "${SERVICE_USER}" npm install --omit=dev

echo "==> Instaluję usługę systemd"
cp "${PANEL_DIR}/panel.service.example" /etc/systemd/system/pdns-panel.service
systemctl daemon-reload
systemctl enable --now pdns-panel

echo
echo "Gotowe. Status: systemctl status pdns-panel"
echo "Panel nasłuchuje lokalnie na porcie z ${PANEL_DIR}/.env (domyślnie 3000)."
echo
echo "Domyślne konto (TYLKO na pierwsze logowanie, zmiana hasła jest wymuszona):"
echo "  e-mail:  $(grep ADMIN_EMAIL "${PANEL_DIR}/.env" | cut -d= -f2)"
echo "  hasło:   $(grep ADMIN_PASSWORD "${PANEL_DIR}/.env" | cut -d= -f2)"
echo
echo "Kolejne aktualizacje: sudo ${TARGET_DIR}/panel/scripts/update.sh (z tej lokalizacji, git pull w miejscu)."
echo
echo "To wciąż tylko szkielet: brak jeszcze reverse proxy/TLS (panel.24z.eu) i"
echo "połączenia z PowerDNS API (POWERDNS_API_URL w .env) - do skonfigurowania"
echo "w kolejnym kroku."
