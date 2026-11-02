-- TATVA website: enquiries and assistant requests (Cloudflare D1 / SQLite).
-- Voice recordings are NOT stored here; they are forwarded to Telegram only.

CREATE TABLE IF NOT EXISTS enquiries (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  name          TEXT    NOT NULL,
  email         TEXT    NOT NULL,
  phone         TEXT,
  organization  TEXT,
  interest      TEXT    NOT NULL,
  budget        TEXT,
  message       TEXT    NOT NULL,
  locale        TEXT,
  ip_hash       TEXT    NOT NULL,
  notified      INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS enquiries_ip_time ON enquiries (ip_hash, created_at);

CREATE TABLE IF NOT EXISTS assist_requests (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id    TEXT    NOT NULL UNIQUE,          -- sent by the browser; makes retries safe
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  kind          TEXT    NOT NULL CHECK (kind IN ('help', 'question', 'voice')),
  name          TEXT    NOT NULL DEFAULT '',
  phone         TEXT    NOT NULL,
  area          TEXT,
  details       TEXT,                              -- typed request, or the (edited) transcript
  note          TEXT,                              -- "anything else important"
  language      TEXT,                              -- language reported by the transcriber
  location_lat  REAL,
  location_lng  REAL,
  requester     TEXT,                              -- 'self' or 'family'
  has_audio     INTEGER NOT NULL DEFAULT 0,
  consent       INTEGER NOT NULL DEFAULT 0,
  locale        TEXT,
  ip_hash       TEXT    NOT NULL,
  notified      INTEGER NOT NULL DEFAULT 0,
  status        TEXT    NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'done', 'cancelled'))
);
CREATE INDEX IF NOT EXISTS assist_ip_time ON assist_requests (ip_hash, created_at);

-- Only used to rate-limit transcription requests; no audio or text is kept.
CREATE TABLE IF NOT EXISTS transcriptions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ip_hash    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS transcriptions_ip_time ON transcriptions (ip_hash, created_at);
