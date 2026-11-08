-- D1 schema (generated). Do not edit by hand; run `pnpm run generate:schema`

-- Regenerates the current table structure by replaying migrations/.

CREATE TABLE analysis_definitions (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  config_json TEXT NOT NULL DEFAULT '{}',
  config_version INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  archived_at INTEGER
);

CREATE INDEX idx_analysis_definitions_site_archived
  ON analysis_definitions(site_id, archived_at);
CREATE INDEX idx_analysis_definitions_site_kind
  ON analysis_definitions(site_id, kind);

CREATE TABLE configs (
  config_key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE custom_event_json_keys (
  id INTEGER PRIMARY KEY,
  site_id TEXT NOT NULL,
  key TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  last_seen_at INTEGER NOT NULL,
  site_pk INTEGER NOT NULL REFERENCES site_identities(site_pk)
);

CREATE UNIQUE INDEX idx_custom_event_json_keys_site_pk_key
  ON custom_event_json_keys(site_pk, "key");

CREATE TABLE custom_event_json_nodes (
  event_pk INTEGER NOT NULL,
  node_id INTEGER NOT NULL,
  parent_node_id INTEGER,
  key_id INTEGER,
  path_id INTEGER NOT NULL,
  value_type INTEGER NOT NULL,
  member_order INTEGER,
  array_index INTEGER,
  depth INTEGER NOT NULL,
  PRIMARY KEY(event_pk, node_id),
  FOREIGN KEY(event_pk) REFERENCES custom_events(event_pk) ON DELETE CASCADE,
  FOREIGN KEY(key_id) REFERENCES custom_event_json_keys(id),
  FOREIGN KEY(path_id) REFERENCES custom_event_json_paths(id)
);

CREATE INDEX idx_custom_event_nodes_event_parent
  ON custom_event_json_nodes(event_pk, parent_node_id, member_order, array_index);

CREATE TABLE custom_event_json_paths (
  id INTEGER PRIMARY KEY,
  site_id TEXT NOT NULL,
  path TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  last_seen_at INTEGER NOT NULL,
  site_pk INTEGER NOT NULL REFERENCES site_identities(site_pk)
);

CREATE UNIQUE INDEX idx_custom_event_json_paths_site_pk_path
  ON custom_event_json_paths(site_pk, path);

CREATE TABLE custom_event_json_values (
  event_pk INTEGER NOT NULL,
  node_id INTEGER NOT NULL,
  site_id TEXT NOT NULL,
  event_name_id INTEGER NOT NULL,
  path_id INTEGER NOT NULL,
  occurred_at INTEGER NOT NULL,
  scope_node_id INTEGER,
  value_type INTEGER NOT NULL,
  string_value TEXT,
  string_hash TEXT,
  number_value REAL,
  boolean_value INTEGER,
  site_pk INTEGER NOT NULL REFERENCES site_identities(site_pk),
  PRIMARY KEY(event_pk, node_id),
  FOREIGN KEY(event_pk, node_id) REFERENCES custom_event_json_nodes(event_pk, node_id) ON DELETE CASCADE,
  FOREIGN KEY(event_name_id) REFERENCES custom_event_names(id),
  FOREIGN KEY(path_id) REFERENCES custom_event_json_paths(id)
);

CREATE INDEX idx_custom_event_values_site_pk_path_time
  ON custom_event_json_values(site_pk, path_id, occurred_at, event_pk);

CREATE TABLE custom_event_names (
  id INTEGER PRIMARY KEY,
  site_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  last_seen_at INTEGER NOT NULL,
  site_pk INTEGER NOT NULL REFERENCES site_identities(site_pk)
);

CREATE UNIQUE INDEX idx_custom_event_names_site_pk_name
  ON custom_event_names(site_pk, name);

CREATE TABLE custom_events (
  event_pk INTEGER PRIMARY KEY,
  event_id TEXT NOT NULL UNIQUE,
  site_id TEXT NOT NULL,
  visit_id TEXT NOT NULL,
  event_name_id INTEGER NOT NULL,
  occurred_at INTEGER NOT NULL,
  received_at INTEGER NOT NULL,
  sequence INTEGER NOT NULL DEFAULT 0,
  node_count INTEGER NOT NULL,
  value_count INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  site_pk INTEGER NOT NULL REFERENCES site_identities(site_pk),
  revenue_amount REAL,
  revenue_currency TEXT,
  FOREIGN KEY(visit_id) REFERENCES visits(visit_id) ON DELETE CASCADE,
  FOREIGN KEY(event_name_id) REFERENCES custom_event_names(id)
);

CREATE INDEX idx_custom_events_site_pk_name_time
  ON custom_events(site_pk, event_name_id, occurred_at, event_pk);
CREATE INDEX idx_custom_events_site_pk_time
  ON custom_events(site_pk, occurred_at, event_pk);
CREATE INDEX idx_custom_events_visit_id ON custom_events(visit_id);

CREATE TABLE members (
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  last_seen_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (team_id, user_id)
);

CREATE TABLE notification_messages (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  site_id TEXT,
  user_id TEXT NOT NULL,
  rule_id TEXT,
  batch_id TEXT,
  type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  requires_attention INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  summary TEXT,
  body_text TEXT,
  body_html TEXT,
  data_json TEXT NOT NULL DEFAULT '{}',
  channels_json TEXT NOT NULL DEFAULT '{}',
  delivery_status TEXT NOT NULL DEFAULT 'created',
  delivery_results_json TEXT NOT NULL DEFAULT '{}',
  error_message TEXT,
  read_at INTEGER,
  dismissed_at INTEGER,
  archived_at INTEGER,
  triggered_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  sent_at INTEGER,
  failed_at INTEGER,
  expires_at INTEGER,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (rule_id) REFERENCES notification_rules(id) ON DELETE SET NULL
);

CREATE INDEX idx_notification_messages_batch
  ON notification_messages(batch_id);
CREATE INDEX idx_notification_messages_expires_at
  ON notification_messages(expires_at);
CREATE INDEX idx_notification_messages_rule_created
  ON notification_messages(rule_id, created_at DESC);
CREATE INDEX idx_notification_messages_site_created
  ON notification_messages(site_id, created_at DESC);
CREATE INDEX idx_notification_messages_team_created
  ON notification_messages(team_id, created_at DESC);
CREATE INDEX idx_notification_messages_user_attention
  ON notification_messages(user_id, requires_attention, read_at, created_at DESC);
CREATE INDEX idx_notification_messages_user_created
  ON notification_messages(user_id, created_at DESC);

CREATE TABLE notification_rules (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  site_id TEXT,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  schedule_json TEXT NOT NULL DEFAULT '{}',
  condition_json TEXT NOT NULL DEFAULT '{}',
  last_checked_at INTEGER,
  last_triggered_at INTEGER,
  next_run_at INTEGER,
  cooldown_until INTEGER,
  created_by_user_id TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_notification_rules_next_run
  ON notification_rules(enabled, next_run_at);
CREATE INDEX idx_notification_rules_site
  ON notification_rules(site_id, enabled, updated_at DESC);
CREATE INDEX idx_notification_rules_team
  ON notification_rules(team_id, enabled, updated_at DESC);
CREATE INDEX idx_notification_rules_type
  ON notification_rules(type, enabled);

CREATE TABLE saved_filters (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  owner_user_id TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('private', 'team')),
  name TEXT NOT NULL
    CHECK (length(trim(name)) BETWEEN 1 AND 120),
  description TEXT NOT NULL DEFAULT ''
    CHECK (length(description) <= 2000),
  -- This is the exact user-authored expression. Never normalize it in storage.
  filter_dsl TEXT NOT NULL
    CHECK (length(filter_dsl) <= 65536),
  filter_dsl_version INTEGER NOT NULL DEFAULT 1
    CHECK (filter_dsl_version >= 1),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  scope_preference TEXT NOT NULL DEFAULT 'auto'
    CHECK (scope_preference IN ('auto', 'event', 'session', 'visitor')),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX idx_saved_filters_site_owner_updated
  ON saved_filters(site_id, owner_user_id, updated_at DESC, id DESC);
CREATE INDEX idx_saved_filters_site_visibility_updated
  ON saved_filters(site_id, visibility, updated_at DESC, id DESC);

CREATE TABLE scheduled_task_schedule_state (
  task_key TEXT PRIMARY KEY,
  next_run_at INTEGER NOT NULL,
  last_run_at INTEGER,
  claim_token TEXT,
  claim_expires_at INTEGER,
  last_error TEXT,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE site_identities (
  site_pk INTEGER PRIMARY KEY,
  site_id TEXT NOT NULL UNIQUE
);

CREATE TABLE sites (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  public_enabled INTEGER NOT NULL DEFAULT 0,
  public_slug TEXT UNIQUE,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE INDEX idx_sites_domain ON sites(domain);
CREATE INDEX idx_sites_team ON sites(team_id);

CREATE TABLE teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  timezone TEXT NOT NULL DEFAULT '',
  notification_preferences_json TEXT NOT NULL DEFAULT '{}',
  preferred_locale TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE visit_daily_dimension_rollups (
  site_pk INTEGER NOT NULL REFERENCES site_identities(site_pk),
  dimension TEXT NOT NULL,
  day INTEGER NOT NULL,
  value TEXT NOT NULL,
  views INTEGER NOT NULL,
  sessions INTEGER NOT NULL,
  visitors INTEGER NOT NULL,
  PRIMARY KEY (site_pk, dimension, day, value)
);

CREATE TABLE visit_daily_geo_points (
  site_pk INTEGER NOT NULL REFERENCES site_identities(site_pk),
  day INTEGER NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  country TEXT NOT NULL,
  region TEXT NOT NULL,
  region_code TEXT NOT NULL,
  city TEXT NOT NULL,
  views INTEGER NOT NULL,
  latest_at INTEGER NOT NULL,
  PRIMARY KEY (
    site_pk, day, latitude, longitude, country, region, region_code, city
  )
);

CREATE TABLE visit_daily_rollups (
  site_pk INTEGER NOT NULL REFERENCES site_identities(site_pk),
  day INTEGER NOT NULL,
  views INTEGER NOT NULL,
  visitors INTEGER NOT NULL,
  sessions INTEGER NOT NULL,
  bounces INTEGER NOT NULL,
  duration_ms_sum INTEGER NOT NULL,
  duration_ms_count INTEGER NOT NULL,
  PRIMARY KEY (site_pk, day)
);

CREATE TABLE "visit_hourly_rollups" (
  site_pk INTEGER NOT NULL REFERENCES site_identities(site_pk),
  hour_bucket INTEGER NOT NULL,
  views INTEGER NOT NULL,
  visitors INTEGER NOT NULL,
  first_visitors INTEGER NOT NULL,
  last_visitors INTEGER NOT NULL,
  sessions INTEGER NOT NULL,
  bounces INTEGER NOT NULL,
  duration_ms_sum INTEGER NOT NULL,
  duration_ms_count INTEGER NOT NULL,
  PRIMARY KEY (site_pk, hour_bucket)
);

CREATE TABLE visit_properties (
  visit_id TEXT NOT NULL REFERENCES visits(visit_id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  site_pk INTEGER NOT NULL REFERENCES site_identities(site_pk),
  started_at INTEGER NOT NULL,
  PRIMARY KEY (visit_id, key)
);

CREATE INDEX idx_visit_properties_site_pk_key_started
  ON visit_properties(site_pk, key, started_at, value);

CREATE TABLE visit_rollup_dirty_days (
  site_pk INTEGER NOT NULL REFERENCES site_identities(site_pk),
  day INTEGER NOT NULL,
  PRIMARY KEY (site_pk, day)
);

CREATE TABLE visit_rollup_state (
  site_pk INTEGER PRIMARY KEY REFERENCES site_identities(site_pk),
  first_day INTEGER NOT NULL,
  last_day INTEGER NOT NULL,
  backfilled INTEGER NOT NULL DEFAULT 0,
  legacy_hourly_until_day INTEGER,
  retention_reached_day INTEGER,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE visits (
  visit_id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
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
  is_eu INTEGER NOT NULL DEFAULT 0,
  country TEXT NOT NULL DEFAULT '',
  region TEXT NOT NULL DEFAULT '',
  region_code TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  continent TEXT NOT NULL DEFAULT '',
  latitude REAL,
  longitude REAL,
  timezone TEXT NOT NULL DEFAULT '',
  browser TEXT NOT NULL DEFAULT '',
  browser_version TEXT NOT NULL DEFAULT '',
  os TEXT NOT NULL DEFAULT '',
  os_version TEXT NOT NULL DEFAULT '',
  device_type TEXT NOT NULL DEFAULT '',
  screen_width INTEGER,
  screen_height INTEGER,
  language TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  site_pk INTEGER NOT NULL REFERENCES site_identities(site_pk),
  scroll_depth INTEGER,
  channel TEXT NOT NULL DEFAULT ''
);

CREATE INDEX idx_visits_site_pk_session_started_at
  ON visits(site_pk, session_id, started_at);
CREATE INDEX idx_visits_site_pk_started_at
  ON visits(site_pk, started_at);
