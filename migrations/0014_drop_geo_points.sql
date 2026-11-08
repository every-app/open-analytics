-- The dashboard's map shades countries from the country rollups, as
-- Plausible's does, so the daily map points go. Page views stop keeping
-- coordinates in D1: only the ingest buffer has them, for the Realtime map.
-- The visits columns go with the table rebuild in 0016.
DROP TABLE visit_daily_geo_points;
