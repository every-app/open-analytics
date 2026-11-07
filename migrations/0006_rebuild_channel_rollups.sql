-- Channels gained AI assistants and more search and social sources. A
-- rolled-up day keeps the channels its page views had when it was rolled
-- up, so every rolled-up day retention hasn't reached is marked, and the
-- rollup task rebuilds it from its page views with the new rules.
INSERT OR IGNORE INTO visit_rollup_dirty_days (site_pk, day)
SELECT DISTINCT r.site_pk, r.day
FROM visit_daily_dimension_rollups r
JOIN visit_rollup_state st ON st.site_pk = r.site_pk
WHERE r.dimension = 'source.channel'
  AND (st.retention_reached_day IS NULL OR r.day > st.retention_reached_day);
