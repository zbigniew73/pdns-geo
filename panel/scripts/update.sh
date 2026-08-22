#!/usr/bin/env bash
# Aktualizuje wdrozony panel. Uruchom BEZPOSREDNIO z katalogu wdrozenia:
#   cd /opt/pdns-panel && sudo panel/scripts/update.sh
# (/opt/pdns-panel to klon repo - skrypt robi git pull w miejscu, potem
# npm install i restart uslugi. Zadnego osobnego katalogu zrodlowego.)
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
    echo "Uruchom jako root (sudo)." >&2
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PANEL_DIR="$(dirname "${SCRIPT_DIR}")"
TARGET_DIR="$(dirname "${PANEL_DIR}")"
SERVICE_USER="${SERVICE_USER:-pdnspanel}"

if [[ ! -d "${TARGET_DIR}/.git" ]]; then
    echo "Błąd: ${TARGET_DIR} nie jest klonem repo (brak .git)." >&2
    echo "Uruchom najpierw install.sh - zmigruje starsze wdrożenie automatycznie." >&2
    exit 1
fi

echo "==> git pull w ${TARGET_DIR}"
git -C "${TARGET_DIR}" pull

echo "==> Naprawiam uprawnienia (TARGET_DIR musi byc przechodni, PANEL_DIR nalezec do ${SERVICE_USER})"
chmod 755 "${TARGET_DIR}"
chown -R "${SERVICE_USER}:${SERVICE_USER}" "${PANEL_DIR}"

echo "==> Uprawnienia (diagnostyka na wypadek dalszych problemow):"
ls -ld "${TARGET_DIR}" "${PANEL_DIR}"
id "${SERVICE_USER}"

echo "==> npm install"
cd "${PANEL_DIR}"
sudo -u "${SERVICE_USER}" npm install --omit=dev

echo "==> Odświeżam usługę systemd (na wypadek zmian w panel.service.example)"
cp "${PANEL_DIR}/panel.service.example" /etc/systemd/system/pdns-panel.service
systemctl daemon-reload

echo "==> Restart"
systemctl restart pdns-panel
systemctl status --no-pager pdns-panel
