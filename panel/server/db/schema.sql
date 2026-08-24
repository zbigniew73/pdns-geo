CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  must_change_password INTEGER NOT NULL DEFAULT 1,
  role TEXT NOT NULL DEFAULT 'admin',
  pin_hash TEXT,
  pin_enabled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ns_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  host TEXT NOT NULL,
  received_at TEXT NOT NULL DEFAULT (datetime('now')),
  load1 REAL,
  udp_queries INTEGER,
  tcp_queries INTEGER,
  latency_us INTEGER,
  mem_bytes INTEGER,
  uptime_seconds INTEGER
);

CREATE INDEX IF NOT EXISTS idx_ns_metrics_host_received ON ns_metrics(host, received_at);
