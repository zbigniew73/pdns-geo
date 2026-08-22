#!/usr/bin/env bash
# Weryfikuje, ze system to RHEL-family (AlmaLinux/Rocky) 9.x - tak samo jak
# skrypty w scripts/ dla warstwy DNS.
set -euo pipefail

if [[ ! -f /etc/os-release ]]; then
    echo "Nie znaleziono /etc/os-release - nie mogę zweryfikować systemu." >&2
    exit 1
fi

# shellcheck disable=SC1091
source /etc/os-release

if [[ "${ID:-}" != "almalinux" && "${ID:-}" != "rocky" && "${ID_LIKE:-}" != *"rhel"* ]]; then
    echo "Ten skrypt zakłada AlmaLinux/Rocky Linux (RHEL-family). Wykryto: ${PRETTY_NAME:-nieznany}." >&2
    exit 1
fi

MAJOR="${VERSION_ID%%.*}"
if [[ "${MAJOR}" -lt 9 ]]; then
    echo "Wymagana wersja 9.x, wykryto ${VERSION_ID:-nieznana}." >&2
    exit 1
fi

echo "OS OK: ${PRETTY_NAME}"
