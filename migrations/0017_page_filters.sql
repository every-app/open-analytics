-- Ingest stores text trimmed (textField in src/lib/edge/ingest/record-normalize.ts),
-- so filters compare columns as they are, and a page filter reads its page's
-- page views through an index instead of trimming every page view of the
-- window. Stored values that aren't trimmed are trimmed here, as SQLite's
-- TRIM did when filters compared them.
--
-- Their rolled-up days are marked for the rollup task to rebuild, the way
-- 0010 marked them: days retention has reached keep their rollups, as
-- their page views are gone.
INSERT OR IGNORE INTO visit_rollup_dirty_days (site_pk, day)
SELECT DISTINCT v.site_pk, v.started_at / 86400000
FROM visits v
JOIN visit_rollup_state st ON st.site_pk = v.site_pk
WHERE (
    v.pathname != TRIM(v.pathname)
    OR v.title != TRIM(v.title)
    OR v.hostname != TRIM(v.hostname)
    OR v.query_string != TRIM(v.query_string)
    OR v.hash_fragment != TRIM(v.hash_fragment)
    OR v.referrer_url != TRIM(v.referrer_url)
    OR v.referrer_host != TRIM(v.referrer_host)
    OR v.utm_source != TRIM(v.utm_source)
    OR v.utm_medium != TRIM(v.utm_medium)
    OR v.utm_campaign != TRIM(v.utm_campaign)
    OR v.utm_term != TRIM(v.utm_term)
    OR v.utm_content != TRIM(v.utm_content)
    OR v.channel != TRIM(v.channel)
    OR v.browser != TRIM(v.browser)
    OR v.browser_version != TRIM(v.browser_version)
    OR v.os != TRIM(v.os)
    OR v.os_version != TRIM(v.os_version)
    OR v.device_type != TRIM(v.device_type)
    OR v.language != TRIM(v.language)
    OR v.country != TRIM(v.country)
    OR v.region != TRIM(v.region)
    OR v.region_code != TRIM(v.region_code)
    OR v.city != TRIM(v.city)
    OR v.continent != TRIM(v.continent)
    OR v.timezone != TRIM(v.timezone)
  )
  AND v.started_at / 86400000 BETWEEN st.first_day AND st.last_day
  AND (
    st.retention_reached_day IS NULL
    OR v.started_at / 86400000 > st.retention_reached_day
  );

UPDATE visits SET
  pathname = TRIM(pathname),
  title = TRIM(title),
  hostname = TRIM(hostname),
  query_string = TRIM(query_string),
  hash_fragment = TRIM(hash_fragment),
  referrer_url = TRIM(referrer_url),
  referrer_host = TRIM(referrer_host),
  utm_source = TRIM(utm_source),
  utm_medium = TRIM(utm_medium),
  utm_campaign = TRIM(utm_campaign),
  utm_term = TRIM(utm_term),
  utm_content = TRIM(utm_content),
  channel = TRIM(channel),
  browser = TRIM(browser),
  browser_version = TRIM(browser_version),
  os = TRIM(os),
  os_version = TRIM(os_version),
  device_type = TRIM(device_type),
  language = TRIM(language),
  country = TRIM(country),
  region = TRIM(region),
  region_code = TRIM(region_code),
  city = TRIM(city),
  continent = TRIM(continent),
  timezone = TRIM(timezone)
WHERE pathname != TRIM(pathname)
  OR title != TRIM(title)
  OR hostname != TRIM(hostname)
  OR query_string != TRIM(query_string)
  OR hash_fragment != TRIM(hash_fragment)
  OR referrer_url != TRIM(referrer_url)
  OR referrer_host != TRIM(referrer_host)
  OR utm_source != TRIM(utm_source)
  OR utm_medium != TRIM(utm_medium)
  OR utm_campaign != TRIM(utm_campaign)
  OR utm_term != TRIM(utm_term)
  OR utm_content != TRIM(utm_content)
  OR channel != TRIM(channel)
  OR browser != TRIM(browser)
  OR browser_version != TRIM(browser_version)
  OR os != TRIM(os)
  OR os_version != TRIM(os_version)
  OR device_type != TRIM(device_type)
  OR language != TRIM(language)
  OR country != TRIM(country)
  OR region != TRIM(region)
  OR region_code != TRIM(region_code)
  OR city != TRIM(city)
  OR continent != TRIM(continent)
  OR timezone != TRIM(timezone);

-- A page filter's page views: equality on the page in the site's window.
CREATE INDEX idx_visits_site_pk_pathname_started_at
  ON visits(site_pk, pathname, started_at);
