-- Filters no longer pick an event, session or visitor scope: a filter keeps
-- the page views and custom events that match it, as Plausible's does. The
-- column has a CHECK constraint but no index, view, trigger or foreign key,
-- so it drops directly.
ALTER TABLE saved_filters DROP COLUMN scope_preference;
