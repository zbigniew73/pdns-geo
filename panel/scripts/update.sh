#!/usr/bin/env bash
# Aktualizuje wdrożony panel (/opt/pdns-panel) z lokalnie sklonowanego repo.
# Uruchom z repo: sudo panel/scripts/update.sh
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
    echo "Uruchom jako root (sudo)." >&2
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PANEL_SRC_DIR="$(dirname "${SCRIPT_DIR}")"
TARGET_DIR="${TARGET_DIR:-/opt/pdns-panel}"
SERVICE_USER="${SERVICE_USER:-pdnspanel}"

echo "==> Synchronizuję pliki do ${TARGET_DIR}"
rsync -a --delete \
    --exclude node_modules \
    --exclude data \
    --exclude .env \
    "${PANEL_SRC_DIR}/" "${TARGET_DIR}/"
chown -R "${SERVICE_USER}:${SERVICE_USER}" "${TARGET_DIR}"

echo "==> npm install"
cd "${TARGET_DIR}"
sudo -u "${SERVICE_USER}" npm install --omit=dev

echo "==> Restart usługi"
systemctl restart pdns-panel
systemctl status --no-pager pdns-panel
