-- Nothing reads or writes the widgets table: dashboards never used it.
DROP INDEX IF EXISTS idx_widgets_site_type;
DROP TABLE IF EXISTS widgets;
