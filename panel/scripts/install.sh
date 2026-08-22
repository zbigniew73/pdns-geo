#!/usr/bin/env bash
# Instaluje szkielet panelu pdns-geo (VPS 4) jako usluge systemd na
# AlmaLinux/Rocky Linux 9. Uruchom z sklonowanego repo:
#   sudo panel/scripts/install.sh
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
    echo "Uruchom jako root (sudo)." >&2
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PANEL_SRC_DIR="$(dirname "${SCRIPT_DIR}")"
TARGET_DIR="${TARGET_DIR:-/opt/pdns-panel}"
SERVICE_USER="${SERVICE_USER:-pdnspanel}"

"${SCRIPT_DIR}/check-os.sh"

echo "==> Instaluje Node.js (moduł dnf nodejs:20) i narzędzia budowania"
dnf module reset -y nodejs >/dev/null 2>&1 || true
dnf module install -y nodejs:20
dnf install -y gcc-c++ make python3 rsync

if ! id "${SERVICE_USER}" >/dev/null 2>&1; then
    echo "==> Tworzę użytkownika systemowego ${SERVICE_USER}"
    useradd --system --home-dir "${TARGET_DIR}" --shell /sbin/nologin "${SERVICE_USER}"
fi

echo "==> Kopiuję pliki panelu do ${TARGET_DIR}"
mkdir -p "${TARGET_DIR}"
rsync -a --delete \
    --exclude node_modules \
    --exclude data \
    --exclude .env \
    "${PANEL_SRC_DIR}/" "${TARGET_DIR}/"

if [[ ! -f "${TARGET_DIR}/.env" ]]; then
    echo "==> Tworzę .env z .env.example (domyślne wartości - dostosuj przed produkcją)"
    cp "${TARGET_DIR}/.env.example" "${TARGET_DIR}/.env"
fi

mkdir -p "${TARGET_DIR}/data"
chown -R "${SERVICE_USER}:${SERVICE_USER}" "${TARGET_DIR}"

echo "==> Instaluję zależności npm (production)"
cd "${TARGET_DIR}"
sudo -u "${SERVICE_USER}" npm install --omit=dev

echo "==> Instaluję usługę systemd"
cp "${TARGET_DIR}/panel.service.example" /etc/systemd/system/pdns-panel.service
systemctl daemon-reload
systemctl enable --now pdns-panel

echo
echo "Gotowe. Status: systemctl status pdns-panel"
echo "Panel nasłuchuje lokalnie na porcie z ${TARGET_DIR}/.env (domyślnie 3000)."
echo
echo "Domyślne konto (TYLKO na pierwsze logowanie, zmiana hasła jest wymuszona):"
echo "  e-mail:  $(grep ADMIN_EMAIL "${TARGET_DIR}/.env" | cut -d= -f2)"
echo "  hasło:   $(grep ADMIN_PASSWORD "${TARGET_DIR}/.env" | cut -d= -f2)"
echo
echo "To wciąż tylko szkielet: brak jeszcze reverse proxy/TLS (panel.24z.eu) i"
echo "połączenia z PowerDNS API (POWERDNS_API_URL w .env) - do skonfigurowania"
echo "w kolejnym kroku."
