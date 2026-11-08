-- Visitor and session ids become integers: the first 13 hex digits of the
-- id's SHA-256, 52 bits, below Number.MAX_SAFE_INTEGER, as D1 returns
-- integers as JS numbers. idFromSha256Hex (src/lib/edge/utils.ts) is the
-- mapping, and ingest derives ids with it from now on. The 64-digit hex ids
-- ingest stored map the same way here. Visitor ids from before ingest
-- derived them (until 2026-11-07) are client UUIDs; theirs map by their own
-- first 13 hex digits, without the dashes. An id that is neither stops the
-- migration on the NOT NULL constraint instead of being guessed.
--
-- Page views no longer repeat their site's id, which site_pk names, nor
-- keep coordinates, which only the ingest buffer's Realtime map reads (0014).
--
-- SQLite can't change a column's type in place, so visits is rebuilt. Its
-- children are moved aside first and back after: dropping visits would
-- otherwise cascade their deletes, as D1 enforces foreign keys.
CREATE TABLE visit_properties_saved AS SELECT * FROM visit_properties;
CREATE TABLE custom_event_properties_saved AS
  SELECT * FROM custom_event_properties;
CREATE TABLE custom_events_saved AS SELECT * FROM custom_events;
DROP TABLE visit_properties;
DROP TABLE custom_event_properties;
DROP TABLE custom_events;

CREATE TABLE visits_next (
  visit_id TEXT PRIMARY KEY,
  site_pk INTEGER NOT NULL REFERENCES site_identities(site_pk),
  visitor_id INTEGER NOT NULL,
  session_id INTEGER NOT NULL,
  status TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  last_activity_at INTEGER NOT NULL,
  ended_at INTEGER,
  finalized_at INTEGER,
  duration_ms INTEGER,
  duration_source TEXT,
  exit_reason TEXT,
  pathname TEXT NOT NULL,
  query_string TEXT NOT NULL DEFAULT '',
  hash_fragment TEXT NOT NULL DEFAULT '',
  hostname TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  referrer_url TEXT NOT NULL DEFAULT '',
  referrer_host TEXT NOT NULL DEFAULT '',
  utm_source TEXT NOT NULL DEFAULT '',
  utm_medium TEXT NOT NULL DEFAULT '',
  utm_campaign TEXT NOT NULL DEFAULT '',
  utm_term TEXT NOT NULL DEFAULT '',
  utm_content TEXT NOT NULL DEFAULT '',
  channel TEXT NOT NULL DEFAULT '',
  is_eu INTEGER NOT NULL DEFAULT 0,
  country TEXT NOT NULL DEFAULT '',
  region TEXT NOT NULL DEFAULT '',
  region_code TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  continent TEXT NOT NULL DEFAULT '',
  timezone TEXT NOT NULL DEFAULT '',
  browser TEXT NOT NULL DEFAULT '',
  browser_version TEXT NOT NULL DEFAULT '',
  os TEXT NOT NULL DEFAULT '',
  os_version TEXT NOT NULL DEFAULT '',
  device_type TEXT NOT NULL DEFAULT '',
  screen_width INTEGER,
  screen_height INTEGER,
  language TEXT NOT NULL DEFAULT '',
  scroll_depth INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
INSERT INTO visits_next (
  visit_id, site_pk, visitor_id, session_id, status, started_at, last_activity_at, ended_at, finalized_at,
  duration_ms, duration_source, exit_reason, pathname, query_string,
  hash_fragment, hostname, title, referrer_url, referrer_host, utm_source,
  utm_medium, utm_campaign, utm_term, utm_content, channel, is_eu, country,
  region, region_code, city, continent, timezone, browser, browser_version,
  os, os_version, device_type, screen_width, screen_height, language,
  scroll_depth, created_at, updated_at
)
SELECT
  visit_id,
  site_pk,
  CASE WHEN LENGTH(visitor_hex) >= 13 AND visitor_hex NOT GLOB '*[^0-9a-f]*' THEN
    (INSTR('0123456789abcdef', SUBSTR(visitor_hex, 1, 1)) - 1) * 281474976710656
    + (INSTR('0123456789abcdef', SUBSTR(visitor_hex, 2, 1)) - 1) * 17592186044416
    + (INSTR('0123456789abcdef', SUBSTR(visitor_hex, 3, 1)) - 1) * 1099511627776
    + (INSTR('0123456789abcdef', SUBSTR(visitor_hex, 4, 1)) - 1) * 68719476736
    + (INSTR('0123456789abcdef', SUBSTR(visitor_hex, 5, 1)) - 1) * 4294967296
    + (INSTR('0123456789abcdef', SUBSTR(visitor_hex, 6, 1)) - 1) * 268435456
    + (INSTR('0123456789abcdef', SUBSTR(visitor_hex, 7, 1)) - 1) * 16777216
    + (INSTR('0123456789abcdef', SUBSTR(visitor_hex, 8, 1)) - 1) * 1048576
    + (INSTR('0123456789abcdef', SUBSTR(visitor_hex, 9, 1)) - 1) * 65536
    + (INSTR('0123456789abcdef', SUBSTR(visitor_hex, 10, 1)) - 1) * 4096
    + (INSTR('0123456789abcdef', SUBSTR(visitor_hex, 11, 1)) - 1) * 256
    + (INSTR('0123456789abcdef', SUBSTR(visitor_hex, 12, 1)) - 1) * 16
    + (INSTR('0123456789abcdef', SUBSTR(visitor_hex, 13, 1)) - 1)
  END,
  CASE WHEN LENGTH(session_id) >= 13 AND session_id NOT GLOB '*[^0-9a-f]*' THEN
    (INSTR('0123456789abcdef', SUBSTR(session_id, 1, 1)) - 1) * 281474976710656
    + (INSTR('0123456789abcdef', SUBSTR(session_id, 2, 1)) - 1) * 17592186044416
    + (INSTR('0123456789abcdef', SUBSTR(session_id, 3, 1)) - 1) * 1099511627776
    + (INSTR('0123456789abcdef', SUBSTR(session_id, 4, 1)) - 1) * 68719476736
    + (INSTR('0123456789abcdef', SUBSTR(session_id, 5, 1)) - 1) * 4294967296
    + (INSTR('0123456789abcdef', SUBSTR(session_id, 6, 1)) - 1) * 268435456
    + (INSTR('0123456789abcdef', SUBSTR(session_id, 7, 1)) - 1) * 16777216
    + (INSTR('0123456789abcdef', SUBSTR(session_id, 8, 1)) - 1) * 1048576
    + (INSTR('0123456789abcdef', SUBSTR(session_id, 9, 1)) - 1) * 65536
    + (INSTR('0123456789abcdef', SUBSTR(session_id, 10, 1)) - 1) * 4096
    + (INSTR('0123456789abcdef', SUBSTR(session_id, 11, 1)) - 1) * 256
    + (INSTR('0123456789abcdef', SUBSTR(session_id, 12, 1)) - 1) * 16
    + (INSTR('0123456789abcdef', SUBSTR(session_id, 13, 1)) - 1)
  END,
  status, started_at, last_activity_at, ended_at, finalized_at,
  duration_ms, duration_source, exit_reason, pathname, query_string,
  hash_fragment, hostname, title, referrer_url, referrer_host, utm_source,
  utm_medium, utm_campaign, utm_term, utm_content, channel, is_eu, country,
  region, region_code, city, continent, timezone, browser, browser_version,
  os, os_version, device_type, screen_width, screen_height, language,
  scroll_depth, created_at, updated_at
FROM (SELECT *, REPLACE(visitor_id, '-', '') AS visitor_hex FROM visits);
DROP TABLE visits;
ALTER TABLE visits_next RENAME TO visits;
CREATE INDEX idx_visits_site_pk_session_started_at
  ON visits(site_pk, session_id, started_at);
CREATE INDEX idx_visits_site_pk_started_at ON visits(site_pk, started_at);

CREATE TABLE visit_properties (
  visit_id TEXT NOT NULL REFERENCES visits(visit_id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  site_pk INTEGER NOT NULL REFERENCES site_identities(site_pk),
  started_at INTEGER NOT NULL,
  PRIMARY KEY (visit_id, key)
) WITHOUT ROWID;
INSERT INTO visit_properties (visit_id, key, value, site_pk, started_at)
  SELECT visit_id, key, value, site_pk, started_at FROM visit_properties_saved;
DROP TABLE visit_properties_saved;
CREATE INDEX idx_visit_properties_site_pk_key_started
  ON visit_properties(site_pk, key, started_at, value);

CREATE TABLE custom_events (
  event_pk INTEGER PRIMARY KEY,
  event_id TEXT NOT NULL UNIQUE,
  site_pk INTEGER NOT NULL REFERENCES site_identities(site_pk),
  visit_id TEXT NOT NULL REFERENCES visits(visit_id) ON DELETE CASCADE,
  event_name_id INTEGER NOT NULL REFERENCES custom_event_names(id),
  occurred_at INTEGER NOT NULL,
  received_at INTEGER NOT NULL,
  sequence INTEGER NOT NULL DEFAULT 0,
  revenue_amount REAL,
  revenue_currency TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
INSERT INTO custom_events (
  event_pk, event_id, site_pk, visit_id, event_name_id, occurred_at,
  received_at, sequence, revenue_amount, revenue_currency, created_at
)
SELECT
  event_pk, event_id, site_pk, visit_id, event_name_id, occurred_at,
  received_at, sequence, revenue_amount, revenue_currency, created_at
FROM custom_events_saved;
DROP TABLE custom_events_saved;
CREATE INDEX idx_custom_events_site_pk_name_time
  ON custom_events(site_pk, event_name_id, occurred_at, event_pk);
CREATE INDEX idx_custom_events_site_pk_time
  ON custom_events(site_pk, occurred_at, event_pk);
CREATE INDEX idx_custom_events_visit_id ON custom_events(visit_id);

CREATE TABLE custom_event_properties (
  event_pk INTEGER NOT NULL REFERENCES custom_events(event_pk) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  site_pk INTEGER NOT NULL REFERENCES site_identities(site_pk),
  occurred_at INTEGER NOT NULL,
  PRIMARY KEY (event_pk, key)
) WITHOUT ROWID;
INSERT INTO custom_event_properties (event_pk, key, value, site_pk, occurred_at)
  SELECT event_pk, key, value, site_pk, occurred_at
  FROM custom_event_properties_saved;
DROP TABLE custom_event_properties_saved;
CREATE INDEX idx_custom_event_properties_site_pk_key_occurred
  ON custom_event_properties(site_pk, key, occurred_at, value);
