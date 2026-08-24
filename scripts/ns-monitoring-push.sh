#!/usr/bin/env bash
set -euo pipefail

PANEL_URL="${PANEL_URL:?Ustaw PANEL_URL=\"https://panel.24z.eu\"}"
MONITORING_TOKEN="${MONITORING_TOKEN:?Ustaw MONITORING_TOKEN}"

HOST="$(hostname -f)"
LOAD1="$(cut -d' ' -f1 /proc/loadavg)"
STATS="$(pdns_control list)"

get_metric() {
    echo "${STATS}" | grep -o "$1=[0-9]*" | head -1 | cut -d= -f2
}

UDP_Q="$(get_metric udp-queries)"
TCP_Q="$(get_metric tcp-queries)"
LATENCY="$(get_metric latency)"
MEM="$(get_metric real-memory-usage)"
UPTIME="$(get_metric uptime)"

PAYLOAD=$(cat <<JSON
{"host":"${HOST}","load1":${LOAD1},"udpQueries":${UDP_Q:-0},"tcpQueries":${TCP_Q:-0},"latencyUs":${LATENCY:-0},"memBytes":${MEM:-0},"uptimeSeconds":${UPTIME:-0}}
JSON
)

curl -fsS -X POST "${PANEL_URL%/}/api/monitoring/ingest" \
    -H "Authorization: Bearer ${MONITORING_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "${PAYLOAD}"
