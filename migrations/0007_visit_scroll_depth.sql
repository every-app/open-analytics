-- Each page view keeps how far down the page the visitor scrolled, as a whole
-- percent. Earlier page views have none.
ALTER TABLE visits ADD COLUMN scroll_depth INTEGER;
