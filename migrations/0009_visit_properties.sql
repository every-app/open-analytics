-- Page views' custom properties: flat string pairs from the tracker's
-- script tag (data-prop-<key>) and setGlobalProperties. One row per
-- property of a page view, deleted with it. They aren't rolled up: the
-- Properties breakdown and the property filter read these rows.
CREATE TABLE visit_properties (
  visit_id TEXT NOT NULL REFERENCES visits(visit_id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  site_pk INTEGER NOT NULL REFERENCES site_identities(site_pk),
  started_at INTEGER NOT NULL,
  PRIMARY KEY (visit_id, key)
) WITHOUT ROWID;

-- A site's keys in a period and a key's values, for the breakdown. The
-- primary key serves the filter, which looks up one page view's property,
-- and the deletes of a page view's properties.
CREATE INDEX idx_visit_properties_site_pk_key_started
  ON visit_properties(site_pk, key, started_at, value);
