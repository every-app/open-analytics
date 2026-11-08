-- A custom event keeps flat properties, as a page view does and as
-- Plausible keeps them: a key and a string value each, in one table shaped
-- like visit_properties. The JSON trees of event payloads go, with their
-- dictionaries. A custom event no longer repeats its site's id, which
-- site_pk already names, and neither does an event name.
--
-- No events are kept: an install had none worth converting when this ran.
-- The ingest buffer writes again those it still holds (schema.ts).
DROP TABLE custom_event_json_values;
DROP TABLE custom_event_json_nodes;
DROP TABLE custom_event_json_paths;
DROP TABLE custom_event_json_keys;
DROP TABLE custom_events;
DROP TABLE custom_event_names;

CREATE TABLE custom_event_names (
  id INTEGER PRIMARY KEY,
  site_pk INTEGER NOT NULL REFERENCES site_identities(site_pk),
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  last_seen_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX idx_custom_event_names_site_pk_name
  ON custom_event_names(site_pk, name);

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
CREATE INDEX idx_custom_event_properties_site_pk_key_occurred
  ON custom_event_properties(site_pk, key, occurred_at, value);

-- Goals, funnels and saved filters name a property as property("<key>")
-- where they named its JSON pointer, event.payload("/<key>"). A nested
-- pointer becomes a key with a slash, which no flat property has.
UPDATE analysis_definitions
SET config_json = REPLACE(config_json, 'event.payload(\"/', 'property(\"')
WHERE INSTR(config_json, 'event.payload(\"/') > 0;
UPDATE saved_filters
SET filter_dsl = REPLACE(filter_dsl, 'event.payload("/', 'property("')
WHERE INSTR(filter_dsl, 'event.payload("/') > 0;
