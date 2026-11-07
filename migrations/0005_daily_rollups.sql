-- Unfiltered dashboards read whole UTC days from rollups instead of every
-- page view. Visitor ids rotate at UTC midnight and a visit ends when its
-- visitor id changes, so visitors and visits never span two UTC days: a
-- range's unique visitors is the sum of its days' unique visitors, overall
-- and per page, source, location or device.

-- Hourly rollups keep counts instead of every visitor and visit id of the
-- hour. Per UTC day, a visitor is counted in the hour of their first page
-- view (first_visitors) and of their last (last_visitors), so a trend bucket
-- that starts or ends inside a UTC day (a time zone that isn't UTC) still
-- counts each visitor once. A visit counts in the hour it started.
CREATE TABLE visit_hourly_rollups_next (
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
) WITHOUT ROWID;

-- Existing hours keep their totals; the id lists become the new counts, one
-- UTC day at a time. Hours whose page views retention already deleted exist
-- only here.
INSERT INTO visit_hourly_rollups_next (
  site_pk, hour_bucket, views, visitors, first_visitors, last_visitors,
  sessions, bounces, duration_ms_sum, duration_ms_count
)
WITH visitor_days AS (
  SELECT
    r.site_pk,
    MIN(r.hour_bucket) AS first_hour,
    MAX(r.hour_bucket) AS last_hour
  FROM visit_hourly_rollups r, json_each(r.visitor_set_json) j
  GROUP BY r.site_pk, r.hour_bucket / 24, j.value
),
session_days AS (
  SELECT
    r.site_pk,
    MIN(r.hour_bucket) AS start_hour,
    SUM(json_extract(j.value, '$[1]')) AS views
  FROM visit_hourly_rollups r, json_each(r.session_counts_json) j
  GROUP BY r.site_pk, r.hour_bucket / 24, json_extract(j.value, '$[0]')
),
firsts AS (
  SELECT site_pk, first_hour AS hour_bucket, COUNT(*) AS visitors
  FROM visitor_days
  GROUP BY site_pk, first_hour
),
lasts AS (
  SELECT site_pk, last_hour AS hour_bucket, COUNT(*) AS visitors
  FROM visitor_days
  GROUP BY site_pk, last_hour
),
starts AS (
  SELECT
    site_pk,
    start_hour AS hour_bucket,
    COUNT(*) AS sessions,
    SUM(CASE WHEN views = 1 THEN 1 ELSE 0 END) AS bounces
  FROM session_days
  GROUP BY site_pk, start_hour
)
SELECT
  r.site_pk,
  r.hour_bucket,
  r.views,
  r.visitors,
  COALESCE(f.visitors, 0),
  COALESCE(l.visitors, 0),
  COALESCE(s.sessions, 0),
  COALESCE(s.bounces, 0),
  r.duration_ms_sum,
  r.duration_ms_count
FROM visit_hourly_rollups r
LEFT JOIN firsts f ON f.site_pk = r.site_pk AND f.hour_bucket = r.hour_bucket
LEFT JOIN lasts l ON l.site_pk = r.site_pk AND l.hour_bucket = r.hour_bucket
LEFT JOIN starts s ON s.site_pk = r.site_pk AND s.hour_bucket = r.hour_bucket;

DROP TABLE visit_hourly_rollups;
ALTER TABLE visit_hourly_rollups_next RENAME TO visit_hourly_rollups;

-- Per site and UTC day (epoch milliseconds / 86 400 000): the Overview's
-- top stats.
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
) WITHOUT ROWID;

-- Per site, UTC day and Overview card dimension (page, entry and exit page,
-- channel, referrer, UTM tags, country, region, city, browser, OS, device):
-- one row per value.
CREATE TABLE visit_daily_dimension_rollups (
  site_pk INTEGER NOT NULL REFERENCES site_identities(site_pk),
  dimension TEXT NOT NULL,
  day INTEGER NOT NULL,
  value TEXT NOT NULL,
  views INTEGER NOT NULL,
  sessions INTEGER NOT NULL,
  visitors INTEGER NOT NULL,
  PRIMARY KEY (site_pk, dimension, day, value)
) WITHOUT ROWID;

-- The Overview map's points per site and UTC day.
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
) WITHOUT ROWID;

-- Every UTC day from first_day to last_day is rolled up (first_day >
-- last_day: none yet). New days extend last_day; the backfill lowers
-- first_day until no older data is left, then sets backfilled.
-- legacy_hourly_until_day is the last day the old hourly rollups covered
-- whole: those days keep their hourly rows when their page views are gone.
-- retention_reached_day is the latest day whose page views retention has
-- started deleting (NULL: none), recorded in the batch of each delete. A
-- rolled-up day up to it is never rebuilt, so it keeps its rollups.
CREATE TABLE visit_rollup_state (
  site_pk INTEGER PRIMARY KEY REFERENCES site_identities(site_pk),
  first_day INTEGER NOT NULL,
  last_day INTEGER NOT NULL,
  backfilled INTEGER NOT NULL DEFAULT 0,
  legacy_hourly_until_day INTEGER,
  retention_reached_day INTEGER,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Rolled-up days whose page views changed afterwards: a visit finalized
-- after its day was rolled up, or one flushed late. The ingest flush records
-- the day in the same batch as the page view's write, and the rollup task
-- rebuilds it from the page views on its next run. Retention deletes none of
-- a site's page views from its oldest marked day on until the mark is gone.
CREATE TABLE visit_rollup_dirty_days (
  site_pk INTEGER NOT NULL REFERENCES site_identities(site_pk),
  day INTEGER NOT NULL,
  PRIMARY KEY (site_pk, day)
) WITHOUT ROWID;

-- Existing sites start with no rolled-up days, ending at the last complete
-- day (UTC days end 12 hours before they are rolled up); the backfill then
-- works back from there.
INSERT INTO visit_rollup_state (
  site_pk, first_day, last_day, legacy_hourly_until_day
)
SELECT
  site_pk,
  (unixepoch() * 1000 - 43200000) / 86400000,
  (unixepoch() * 1000 - 43200000) / 86400000 - 1,
  (aggregated_until_hour + 1) / 24 - 1
FROM visit_hourly_aggregation_state;

DROP TABLE visit_hourly_aggregation_state;

UPDATE scheduled_task_schedule_state
SET task_key = 'visit_rollups', next_run_at = 0, last_error = NULL
WHERE task_key = 'visit_hourly_rollup';

-- Deleting a page view looks up its custom events through this foreign key;
-- without an index each deleted page view scanned every event.
CREATE INDEX idx_custom_events_visit_id ON custom_events(visit_id);

-- Only the old hourly rollup task looked up open page views.
DROP INDEX idx_visits_open_last_activity;
DROP INDEX idx_visits_open_site_pk_started_at;
