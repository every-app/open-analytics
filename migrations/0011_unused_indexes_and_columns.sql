-- Indexes no query uses. Every page view and custom event written to D1
-- updates each index of its table, so these only cost writes:
-- - created_at_site_pk_performance on both tables: no query reads page
--   views or custom events by when they were written.
-- - site_pk_last_activity and site_pk_visitor_last_activity: ingest's lookup
--   of a visitor's recent session was the last reader, and the ingest
--   buffer now answers it on its own.
-- - site_pk_visitor_started_at and site_pk_visit_time: reads by visitor or
--   page view go through site_pk_started_at, site_pk_session_started_at,
--   the custom events' visit_id index and the primary keys.
-- - The partial value indexes: payload filters look a value up by its
--   event, through the primary key, and bind its type, so SQLite can't
--   prove a partial index's type condition.
DROP INDEX idx_visits_created_at_site_pk_performance;
DROP INDEX idx_visits_site_pk_last_activity;
DROP INDEX idx_visits_site_pk_visitor_last_activity;
DROP INDEX idx_visits_site_pk_visitor_started_at;
DROP INDEX idx_custom_events_created_at_site_pk_performance;
DROP INDEX idx_custom_events_site_pk_visit_time;
DROP INDEX idx_custom_event_values_site_pk_boolean_eq;
DROP INDEX idx_custom_event_values_site_pk_number_range;
DROP INDEX idx_custom_event_values_site_pk_string_eq;

-- Columns nothing reads: the web vitals page views stopped recording when
-- the performance page went, and ae_synced_at, which ingest only ever set
-- to NULL. None is indexed or in a view, trigger or foreign key, so each
-- drops directly.
ALTER TABLE visits DROP COLUMN perf_ttfb_ms;
ALTER TABLE visits DROP COLUMN perf_fcp_ms;
ALTER TABLE visits DROP COLUMN perf_lcp_ms;
ALTER TABLE visits DROP COLUMN perf_cls;
ALTER TABLE visits DROP COLUMN perf_inp_ms;
ALTER TABLE visits DROP COLUMN ae_synced_at;
ALTER TABLE custom_events DROP COLUMN ae_synced_at;
