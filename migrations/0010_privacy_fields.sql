-- A page view stores what Plausible stores: the parsed browser, operating
-- system and device, and a city-level location. The raw user agent, the
-- postal and metro code and the network organization (the ASN's name) go,
-- with the user columns of the deleted identify() API. None is indexed or
-- in a view, trigger or foreign key, so each drops directly.
ALTER TABLE visits DROP COLUMN ua_raw;
ALTER TABLE visits DROP COLUMN postal_code;
ALTER TABLE visits DROP COLUMN metro_code;
ALTER TABLE visits DROP COLUMN as_organization;
ALTER TABLE visits DROP COLUMN user_id;
ALTER TABLE visits DROP COLUMN user_name;
ALTER TABLE custom_events DROP COLUMN user_id;

-- Coordinates keep 1 decimal, about 11 km: a city, as ingest now rounds them.
UPDATE visits
SET latitude = ROUND(latitude, 1), longitude = ROUND(longitude, 1)
WHERE latitude IS NOT NULL OR longitude IS NOT NULL;

-- Map points already rolled up are merged onto the rounded coordinates, so
-- no rollup keeps a finer point, including days retention has reached,
-- whose page views are gone and can't be rolled up again.
CREATE TABLE visit_daily_geo_points_rounded AS
SELECT
  site_pk, day,
  ROUND(latitude, 1) AS latitude,
  ROUND(longitude, 1) AS longitude,
  country, region, region_code, city,
  SUM(views) AS views,
  MAX(latest_at) AS latest_at
FROM visit_daily_geo_points
GROUP BY
  site_pk, day, ROUND(latitude, 1), ROUND(longitude, 1),
  country, region, region_code, city;
DELETE FROM visit_daily_geo_points;
INSERT INTO visit_daily_geo_points (
  site_pk, day, latitude, longitude, country, region, region_code, city,
  views, latest_at
)
SELECT
  site_pk, day, latitude, longitude, country, region, region_code, city,
  views, latest_at
FROM visit_daily_geo_points_rounded;
DROP TABLE visit_daily_geo_points_rounded;

-- Every rolled-up day retention hasn't reached is marked, and the rollup
-- task rebuilds its map points from the rounded page views.
INSERT OR IGNORE INTO visit_rollup_dirty_days (site_pk, day)
SELECT DISTINCT p.site_pk, p.day
FROM visit_daily_geo_points p
JOIN visit_rollup_state st ON st.site_pk = p.site_pk
WHERE st.retention_reached_day IS NULL OR p.day > st.retention_reached_day;
