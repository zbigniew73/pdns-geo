const RETENTION_DAYS = 30;
const STALE_AFTER_SECONDS = 900;

function recordMetrics(db, m) {
  db.prepare(
    `INSERT INTO ns_metrics (host, load1, udp_queries, tcp_queries, latency_us, mem_bytes, uptime_seconds)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(m.host, m.load1, m.udpQueries, m.tcpQueries, m.latencyUs, m.memBytes, m.uptimeSeconds);

  db.prepare(`DELETE FROM ns_metrics WHERE received_at < datetime('now', ?)`).run(`-${RETENTION_DAYS} days`);
}

function getLatestMetrics(db) {
  const rows = db
    .prepare(
      `WITH ranked AS (
         SELECT *,
           ROW_NUMBER() OVER (PARTITION BY host ORDER BY received_at DESC) AS rn,
           LAG(udp_queries) OVER (PARTITION BY host ORDER BY received_at) AS prev_udp,
           LAG(tcp_queries) OVER (PARTITION BY host ORDER BY received_at) AS prev_tcp,
           LAG(received_at) OVER (PARTITION BY host ORDER BY received_at) AS prev_received_at
         FROM ns_metrics
       )
       SELECT * FROM ranked WHERE rn = 1 ORDER BY host`
    )
    .all();

  const now = Date.now();

  return rows.map((r) => {
    const receivedAtMs = Date.parse(r.received_at + 'Z');
    const ageSeconds = Math.round((now - receivedAtMs) / 1000);

    let qps = null;
    if (r.prev_received_at) {
      const prevMs = Date.parse(r.prev_received_at + 'Z');
      const deltaSeconds = (receivedAtMs - prevMs) / 1000;
      const deltaQueries = (r.udp_queries - r.prev_udp) + (r.tcp_queries - r.prev_tcp);
      if (deltaSeconds > 0 && deltaQueries >= 0) {
        qps = deltaQueries / deltaSeconds;
      }
    }

    return {
      host: r.host,
      receivedAt: r.received_at,
      stale: ageSeconds > STALE_AFTER_SECONDS,
      load1: r.load1,
      qps,
      latencyUs: r.latency_us,
      memBytes: r.mem_bytes,
      uptimeSeconds: r.uptime_seconds,
    };
  });
}

module.exports = { recordMetrics, getLatestMetrics };
