import {
  createDatabaseRuntime,
  type DatabaseRuntime,
  type DatabaseStatement,
} from "@/lib/db";
import {
  PAGE_VIEW_ROLLUP_DIMENSIONS,
  RollupDimension,
} from "@/lib/edge/analytics/providers/d1/internal/rollup-dimensions";
import type { Env } from "@/lib/edge/types";
import { ONE_DAY_MS, ONE_HOUR_MS } from "@/lib/edge/utils";

import { BudgetedDatabase, D1_QUERIES_PER_INVOCATION } from "./d1-query-budget";
import type { ScheduledTaskLogger, ScheduledTaskOutcome } from "./runner";

/**
 * A UTC day is rolled up this long after it ends. Page views written to a
 * rolled-up day later (a visit the ingest buffer finishes afterwards, or a
 * late flush) mark the day, and the next run rebuilds it.
 */
export const ROLLUP_LAG_MS = 12 * ONE_HOUR_MS;
/**
 * The most D1 queries one day takes: the site's oldest page view and hourly
 * rollup (each read once per run), and one batch that rolls up the day and
 * records it.
 */
export const ROLLUP_MAX_QUERIES_PER_DAY = 3;

const HOURS_PER_DAY = 24;

enum StepOutcome {
  Advanced = "advanced",
  Done = "done",
  Failed = "failed",
}

interface SiteRollupState {
  readonly siteId: string;
  readonly sitePk: number;
  firstDay: number;
  lastDay: number;
  backfilled: boolean;
  readonly legacyHourlyUntilDay: number | null;
  /** A day of the site failed this run; its other days wait for the next. */
  failed: boolean;
  /** The UTC day of the site's oldest stored page view, once read. */
  firstRawDay?: number | null;
  /** The oldest UTC day with page views or hourly rollups, once read. */
  earliestDay?: number | null;
}

interface VisitRollupSummary {
  latestCompleteDay: number;
  sites: number;
  daysRebuilt: number;
  /** Marked days retention had reached, which keep their rollups. */
  daysKept: number;
  daysRolledUp: number;
  daysBackfilled: number;
  sitesBackfilled: number;
  sitesFailed: number;
  pageViewsRolledUp: number;
  d1Queries: number;
  /** The run's queries ran out with work left; the next tick goes on. */
  workRemains: boolean;
}

/** The last UTC day rolled up at `nowMs`: one that ended `ROLLUP_LAG_MS` ago. */
export function latestCompleteDay(nowMs: number): number {
  return Math.floor((nowMs - ROLLUP_LAG_MS) / ONE_DAY_MS) - 1;
}

function hasQueries(db: BudgetedDatabase): boolean {
  return db.queriesLeft >= ROLLUP_MAX_QUERIES_PER_DAY;
}

async function loadSites(
  db: DatabaseRuntime,
  latestDay: number,
): Promise<SiteRollupState[]> {
  const result = await db.all<{
    siteId: string;
    sitePk: number;
    firstDay: number | null;
    lastDay: number | null;
    backfilled: number | null;
    legacyHourlyUntilDay: number | null;
  }>({
    sql: `
      SELECT
        s.id AS siteId,
        si.site_pk AS sitePk,
        st.first_day AS firstDay,
        st.last_day AS lastDay,
        st.backfilled AS backfilled,
        st.legacy_hourly_until_day AS legacyHourlyUntilDay
      FROM sites s
      JOIN site_identities si ON si.site_id = s.id
      LEFT JOIN visit_rollup_state st ON st.site_pk = si.site_pk
      ORDER BY si.site_pk ASC
    `,
    bindings: [],
    tag: "scheduled_tasks.visit_rollups.sites",
  });
  const sites: SiteRollupState[] = [];
  const newStates: DatabaseStatement[] = [];
  for (const row of result.results) {
    const site: SiteRollupState = {
      siteId: String(row.siteId),
      sitePk: Number(row.sitePk),
      // A new site starts with no rolled-up days, ending at the last
      // complete one; its backfill then works back from there.
      firstDay: row.firstDay === null ? latestDay + 1 : Number(row.firstDay),
      lastDay: row.lastDay === null ? latestDay : Number(row.lastDay),
      backfilled: Number(row.backfilled ?? 0) === 1,
      legacyHourlyUntilDay:
        row.legacyHourlyUntilDay === null
          ? null
          : Number(row.legacyHourlyUntilDay),
      failed: false,
    };
    if (row.firstDay === null) newStates.push(saveStateStatement(site));
    sites.push(site);
  }
  if (newStates.length > 0) await db.batch(newStates);
  return sites;
}

function saveStateStatement(site: SiteRollupState): DatabaseStatement {
  return {
    sql: `
      INSERT INTO visit_rollup_state (
        site_pk, first_day, last_day, backfilled, legacy_hourly_until_day,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, unixepoch())
      ON CONFLICT(site_pk) DO UPDATE SET
        first_day = excluded.first_day,
        last_day = excluded.last_day,
        backfilled = excluded.backfilled,
        updated_at = excluded.updated_at
    `,
    bindings: [
      site.sitePk,
      site.firstDay,
      site.lastDay,
      site.backfilled ? 1 : 0,
      site.legacyHourlyUntilDay,
    ],
    tag: "scheduled_tasks.visit_rollups.save_state",
  };
}

async function firstDayWith(
  db: DatabaseRuntime,
  sql: string,
  sitePk: number,
): Promise<number | null> {
  const row = await db.first<{ day: number | null }>({
    sql,
    bindings: [sitePk],
    tag: "scheduled_tasks.visit_rollups.first_day",
  });
  return row?.day === null || row?.day === undefined ? null : Number(row.day);
}

async function firstRawDay(
  db: DatabaseRuntime,
  site: SiteRollupState,
): Promise<number | null> {
  if (site.firstRawDay === undefined) {
    site.firstRawDay = await firstDayWith(
      db,
      `SELECT MIN(started_at) / ${ONE_DAY_MS} AS day FROM visits WHERE site_pk = ?`,
      site.sitePk,
    );
  }
  return site.firstRawDay;
}

/** The oldest UTC day with page views or hourly rollups, if any. */
async function earliestDataDay(
  db: DatabaseRuntime,
  site: SiteRollupState,
): Promise<number | null> {
  if (site.earliestDay === undefined) {
    const days = [
      await firstRawDay(db, site),
      await firstDayWith(
        db,
        `SELECT MIN(hour_bucket) / ${HOURS_PER_DAY} AS day FROM visit_hourly_rollups WHERE site_pk = ?`,
        site.sitePk,
      ),
    ].filter((day): day is number => day !== null);
    site.earliestDay = days.length > 0 ? Math.min(...days) : null;
  }
  return site.earliestDay;
}

const PAGE_VIEW_DIMENSION_COLUMNS = `
  visitor_id, session_id, pathname, referrer_host,
  utm_source, utm_medium, utm_campaign, utm_term, utm_content,
  country, region, region_code, city, browser, os, os_version, device_type`;

function pageViewDimensionsSql(): string {
  const selects = PAGE_VIEW_ROLLUP_DIMENSIONS.map(
    ({ dimension, expression }) => `
SELECT
  ?1, '${dimension}', ?2, value,
  count(*),
  count(DISTINCT CASE WHEN session_id != '' THEN session_id ELSE NULL END),
  count(DISTINCT CASE WHEN visitor_id != '' THEN visitor_id ELSE NULL END)
FROM (
  SELECT COALESCE(${expression}, '') AS value, session_id, visitor_id
  FROM day_views
)
GROUP BY value`,
  );
  return `
INSERT INTO visit_daily_dimension_rollups (
  site_pk, dimension, day, value, views, sessions, visitors
)
WITH day_views AS MATERIALIZED (
  SELECT ${PAGE_VIEW_DIMENSION_COLUMNS}
  FROM visits
  WHERE site_pk = ?1 AND started_at >= ?3 AND started_at < ?4
)
${selects.join("\nUNION ALL\n")}`;
}

const PAGE_VIEW_DIMENSIONS_SQL = pageViewDimensionsSql();

/** Visits by entry and exit page, as the entry/exit cards rank them. */
const SESSION_DIMENSIONS_SQL = `
INSERT INTO visit_daily_dimension_rollups (
  site_pk, dimension, day, value, views, sessions, visitors
)
WITH ranked AS (
  SELECT
    session_id,
    visitor_id,
    TRIM(COALESCE(pathname, '')) AS pathname,
    ROW_NUMBER() OVER (
      PARTITION BY session_id ORDER BY started_at ASC, visit_id ASC
    ) AS first_rank,
    ROW_NUMBER() OVER (
      PARTITION BY session_id ORDER BY started_at DESC, visit_id DESC
    ) AS latest_rank
  FROM visits
  WHERE site_pk = ?1 AND started_at >= ?3 AND started_at < ?4
    AND session_id != '' AND TRIM(COALESCE(pathname, '')) != ''
),
session_edges AS (
  SELECT
    MAX(CASE WHEN first_rank = 1 THEN visitor_id END) AS visitor_id,
    MAX(CASE WHEN first_rank = 1 THEN pathname END) AS entry_page,
    MAX(CASE WHEN latest_rank = 1 THEN pathname END) AS exit_page
  FROM ranked
  GROUP BY session_id
)
SELECT
  ?1, '${RollupDimension.EntryPage}', ?2, entry_page, count(*), count(*),
  count(DISTINCT CASE WHEN visitor_id != '' THEN visitor_id ELSE NULL END)
FROM session_edges
WHERE TRIM(entry_page) != ''
GROUP BY entry_page
UNION ALL
SELECT
  ?1, '${RollupDimension.ExitPage}', ?2, exit_page, count(*), count(*),
  count(DISTINCT CASE WHEN visitor_id != '' THEN visitor_id ELSE NULL END)
FROM session_edges
WHERE TRIM(exit_page) != ''
GROUP BY exit_page`;

/**
 * Hourly counts from a day's page views. Each visitor counts in the hours of
 * their first and last page view of the day, each visit in the hour it
 * started; visitors and visits never span two UTC days.
 */
const HOURLY_ROLLUP_SQL = `
INSERT INTO visit_hourly_rollups (
  site_pk, hour_bucket, views, visitors, first_visitors, last_visitors,
  sessions, bounces, duration_ms_sum, duration_ms_count
)
WITH day_views AS MATERIALIZED (
  SELECT
    visitor_id,
    session_id,
    CAST(started_at / ${ONE_HOUR_MS} AS INTEGER) AS hour_bucket,
    duration_ms
  FROM visits
  WHERE site_pk = ?1 AND started_at >= ?2 AND started_at < ?3
),
hours AS (
  SELECT
    hour_bucket,
    count(*) AS views,
    count(DISTINCT CASE WHEN visitor_id != '' THEN visitor_id ELSE NULL END) AS visitors,
    COALESCE(sum(CASE WHEN duration_ms >= 0 THEN duration_ms ELSE 0 END), 0) AS duration_ms_sum,
    COALESCE(sum(CASE WHEN duration_ms >= 0 THEN 1 ELSE 0 END), 0) AS duration_ms_count
  FROM day_views
  GROUP BY hour_bucket
),
visitor_hours AS (
  SELECT MIN(hour_bucket) AS first_hour, MAX(hour_bucket) AS last_hour
  FROM day_views
  WHERE visitor_id != ''
  GROUP BY visitor_id
),
visit_starts AS (
  SELECT MIN(hour_bucket) AS hour_bucket, count(*) AS views
  FROM day_views
  WHERE session_id != ''
  GROUP BY session_id
),
firsts AS (
  SELECT first_hour AS hour_bucket, count(*) AS visitors
  FROM visitor_hours GROUP BY first_hour
),
lasts AS (
  SELECT last_hour AS hour_bucket, count(*) AS visitors
  FROM visitor_hours GROUP BY last_hour
),
starts AS (
  SELECT
    hour_bucket,
    count(*) AS sessions,
    SUM(CASE WHEN views = 1 THEN 1 ELSE 0 END) AS bounces
  FROM visit_starts
  GROUP BY hour_bucket
)
SELECT
  ?1, h.hour_bucket, h.views, h.visitors,
  COALESCE(f.visitors, 0), COALESCE(l.visitors, 0),
  COALESCE(s.sessions, 0), COALESCE(s.bounces, 0),
  h.duration_ms_sum, h.duration_ms_count
FROM hours h
LEFT JOIN firsts f ON f.hour_bucket = h.hour_bucket
LEFT JOIN lasts l ON l.hour_bucket = h.hour_bucket
LEFT JOIN starts s ON s.hour_bucket = h.hour_bucket`;

const GEO_POINTS_SQL = `
INSERT INTO visit_daily_geo_points (
  site_pk, day, latitude, longitude, country, region, region_code, city,
  views, latest_at
)
SELECT
  ?1, ?2,
  latitude AS lat_bucket,
  longitude AS lon_bucket,
  country, region, region_code, city,
  COUNT(*),
  MAX(started_at)
FROM visits
WHERE site_pk = ?1 AND started_at >= ?3 AND started_at < ?4
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL
  AND ABS(latitude) <= 90
  AND ABS(longitude) <= 180
GROUP BY lat_bucket, lon_bucket, country, region, region_code, city`;

/**
 * Rolls up one UTC day of a site from its page views, replacing what was
 * rolled up for it before: hourly counts, daily totals, card dimensions and
 * map points, with `record`, which records the day as rolled up. It is one
 * D1 batch, a transaction, so readers see the whole day or none of it.
 * Returns the day's page views.
 */
async function rollUpDay(
  db: DatabaseRuntime,
  site: SiteRollupState,
  day: number,
  record: DatabaseStatement,
): Promise<number> {
  const startMs = day * ONE_DAY_MS;
  const endMs = startMs + ONE_DAY_MS;
  const firstHour = day * HOURS_PER_DAY;
  const endHour = firstHour + HOURS_PER_DAY;
  // Days the old hourly rollups covered keep those hours once retention
  // has deleted any of the day's page views.
  const rawDay = await firstRawDay(db, site);
  const keepLegacyHours =
    site.legacyHourlyUntilDay !== null &&
    day <= site.legacyHourlyUntilDay &&
    (rawDay === null || day <= rawDay);
  const tag = (step: string) => `scheduled_tasks.visit_rollups.${step}`;
  const dayBindings = [site.sitePk, day, startMs, endMs];

  const hours: DatabaseStatement[] = keepLegacyHours
    ? []
    : [
        {
          sql: "DELETE FROM visit_hourly_rollups WHERE site_pk = ? AND hour_bucket >= ? AND hour_bucket < ?",
          bindings: [site.sitePk, firstHour, endHour],
          tag: tag("delete_hours"),
        },
        {
          sql: HOURLY_ROLLUP_SQL,
          bindings: [site.sitePk, startMs, endMs],
          tag: tag("hours"),
        },
      ];
  const totals: DatabaseStatement = {
    sql: `
      INSERT INTO visit_daily_rollups (
        site_pk, day, views, visitors, sessions, bounces,
        duration_ms_sum, duration_ms_count
      )
      SELECT
        ?1, ?2, SUM(views), SUM(first_visitors), SUM(sessions), SUM(bounces),
        SUM(duration_ms_sum), SUM(duration_ms_count)
      FROM visit_hourly_rollups
      WHERE site_pk = ?1 AND hour_bucket >= ?3 AND hour_bucket < ?4
      HAVING COUNT(*) > 0
      RETURNING views
    `,
    bindings: [site.sitePk, day, firstHour, endHour],
    tag: tag("day"),
  };
  const statements: DatabaseStatement[] = [
    ...hours,
    {
      sql: "DELETE FROM visit_daily_rollups WHERE site_pk = ? AND day = ?",
      bindings: [site.sitePk, day],
      tag: tag("delete_day"),
    },
    totals,
    {
      sql: "DELETE FROM visit_daily_dimension_rollups WHERE site_pk = ? AND day = ?",
      bindings: [site.sitePk, day],
      tag: tag("delete_dimensions"),
    },
    {
      sql: PAGE_VIEW_DIMENSIONS_SQL,
      bindings: dayBindings,
      tag: tag("page_view_dimensions"),
    },
    {
      sql: SESSION_DIMENSIONS_SQL,
      bindings: dayBindings,
      tag: tag("session_dimensions"),
    },
    {
      sql: "DELETE FROM visit_daily_geo_points WHERE site_pk = ? AND day = ?",
      bindings: [site.sitePk, day],
      tag: tag("delete_geo_points"),
    },
    {
      sql: GEO_POINTS_SQL,
      bindings: dayBindings,
      tag: tag("geo_points"),
    },
    record,
  ];
  const results = await db.batch(statements);
  const views = results[statements.indexOf(totals)]?.results[0] as
    { views: number } | undefined;
  return Number(views?.views ?? 0);
}

/**
 * Runs a step of a site's rollups. A failure is logged and ends the site's
 * work for this run; what it didn't record is done on a later run.
 */
async function attempt(
  site: SiteRollupState,
  summary: VisitRollupSummary,
  logger: ScheduledTaskLogger | undefined,
  work: () => Promise<StepOutcome>,
): Promise<StepOutcome> {
  try {
    return await work();
  } catch (error) {
    site.failed = true;
    summary.sitesFailed += 1;
    await logger?.error("visit_rollups_site_failed", "Site rollup failed", {
      siteId: site.siteId,
      error: error instanceof Error ? error.message : String(error),
    });
    return StepOutcome.Failed;
  }
}

interface DirtyDay {
  readonly sitePk: number;
  readonly day: number;
  /** Retention has started deleting the page views of this day or later. */
  readonly retentionReached: boolean;
}

/**
 * Rolled-up days marked for a rebuild, oldest first, at most `limit`: as
 * many as the run has queries for, since each takes at least one. Days
 * of deleted sites are left for their purge. Retention doesn't delete a
 * site's page views from its oldest marked day on, so a day it hasn't
 * reached when this reads the mark stays whole until the rebuild.
 */
async function loadDirtyDays(
  db: DatabaseRuntime,
  limit: number,
): Promise<DirtyDay[]> {
  const result = await db.all<{
    sitePk: number;
    day: number;
    retentionReached: number;
  }>({
    sql: `
      SELECT
        d.site_pk AS sitePk,
        d.day AS day,
        IFNULL(d.day <= st.retention_reached_day, 0) AS retentionReached
      FROM visit_rollup_dirty_days d
      JOIN visit_rollup_state st ON st.site_pk = d.site_pk
      JOIN site_identities si ON si.site_pk = d.site_pk
      JOIN sites s ON s.id = si.site_id
      ORDER BY d.day ASC, d.site_pk ASC
      LIMIT ?
    `,
    bindings: [limit],
    tag: "scheduled_tasks.visit_rollups.dirty_days",
  });
  return result.results.map((row) => ({
    sitePk: Number(row.sitePk),
    day: Number(row.day),
    retentionReached: Number(row.retentionReached) === 1,
  }));
}

/**
 * Rebuilds a rolled-up day whose page views changed, and clears its mark in
 * the same batch. A change written after the batch marks the day again.
 *
 * A day retention has reached keeps its rollups instead: what is left of its
 * page views would replace them with part of the day, or nothing. Its mark
 * is cleared, so the change to it is lost. No other step recomputes a day
 * retention has reached: new days come after a site's last rolled-up day and
 * the backfill before its first, while retention deletes only days between
 * them, of backfilled sites.
 */
async function rebuildDay(
  db: BudgetedDatabase,
  site: SiteRollupState,
  dirty: DirtyDay,
  summary: VisitRollupSummary,
  logger: ScheduledTaskLogger | undefined,
): Promise<StepOutcome> {
  const clearMark: DatabaseStatement = {
    sql: "DELETE FROM visit_rollup_dirty_days WHERE site_pk = ? AND day = ?",
    bindings: [site.sitePk, dirty.day],
    tag: "scheduled_tasks.visit_rollups.clear_dirty_day",
  };
  if (dirty.retentionReached) {
    await db.run(clearMark);
    summary.daysKept += 1;
    await logger?.warn(
      "visit_rollups_day_kept",
      "A marked day keeps its rollups: retention has started deleting its page views",
      { siteId: site.siteId, day: dirty.day },
    );
    return StepOutcome.Advanced;
  }
  summary.pageViewsRolledUp += await rollUpDay(db, site, dirty.day, clearMark);
  summary.daysRebuilt += 1;
  return StepOutcome.Advanced;
}

/**
 * Rolls up a site's next day forward (after its last rolled-up day) or
 * backward (before its first), and records it.
 */
async function step(
  db: BudgetedDatabase,
  site: SiteRollupState,
  backward: boolean,
  summary: VisitRollupSummary,
): Promise<StepOutcome> {
  if (backward) {
    const earliest = await earliestDataDay(db, site);
    if (earliest === null || site.firstDay <= earliest) {
      site.backfilled = true;
      await db.run(saveStateStatement(site));
      summary.sitesBackfilled += 1;
      return StepOutcome.Done;
    }
  }
  const day = backward ? site.firstDay - 1 : site.lastDay + 1;
  const rolledUp = backward
    ? { ...site, firstDay: day }
    : { ...site, lastDay: day };
  summary.pageViewsRolledUp += await rollUpDay(
    db,
    site,
    day,
    saveStateStatement(rolledUp),
  );
  site.firstDay = rolledUp.firstDay;
  site.lastDay = rolledUp.lastDay;
  if (backward) summary.daysBackfilled += 1;
  else summary.daysRolledUp += 1;
  return StepOutcome.Advanced;
}

/**
 * Rebuilds rolled-up days whose page views changed, then rolls up complete
 * UTC days: first each site's new days, then older days back to the site's
 * first page view (the backfill), a day per site in turn. A run does as much
 * as its `maxQueries` D1 queries allow, by default the invocation's; marks
 * and progress are kept in D1, so the next run goes on where it stopped, and
 * the run reports `workRemains` so the dispatcher runs it on the next tick.
 */
export async function runVisitRollups(
  env: Env,
  scheduledTime: number,
  options: { logger?: ScheduledTaskLogger; maxQueries?: number } = {},
): Promise<ScheduledTaskOutcome> {
  const db = new BudgetedDatabase(
    createDatabaseRuntime(env.DB),
    options.maxQueries ?? D1_QUERIES_PER_INVOCATION,
  );
  const latestDay = latestCompleteDay(scheduledTime);
  const summary: VisitRollupSummary = {
    latestCompleteDay: latestDay,
    sites: 0,
    daysRebuilt: 0,
    daysKept: 0,
    daysRolledUp: 0,
    daysBackfilled: 0,
    sitesBackfilled: 0,
    sitesFailed: 0,
    pageViewsRolledUp: 0,
    d1Queries: 0,
    workRemains: false,
  };
  const sites = await loadSites(db, latestDay);
  summary.sites = sites.length;
  const logger = options.logger;
  const sitesByPk = new Map(sites.map((site) => [site.sitePk, site]));

  const dirtyLimit = db.queriesLeft;
  const dirtyDays = await loadDirtyDays(db, dirtyLimit);
  // More days may be marked than the run read.
  let dirtyDaysLeft =
    dirtyDays.length === dirtyLimit ? Infinity : dirtyDays.length;
  for (const dirty of dirtyDays) {
    if (!hasQueries(db)) break;
    dirtyDaysLeft -= 1;
    const site = sitesByPk.get(dirty.sitePk);
    if (site === undefined || site.failed) continue;
    await attempt(site, summary, logger, () =>
      rebuildDay(db, site, dirty, summary, logger),
    );
  }

  for (const site of sites) {
    while (!site.failed && site.lastDay < latestDay && hasQueries(db)) {
      await attempt(site, summary, logger, () =>
        step(db, site, false, summary),
      );
    }
  }

  // The backfill goes a day per site in turn, so no site waits on another.
  let backfilling = sites.filter((site) => !site.backfilled && !site.failed);
  while (backfilling.length > 0 && hasQueries(db)) {
    const next: SiteRollupState[] = [];
    for (const [index, site] of backfilling.entries()) {
      if (!hasQueries(db)) {
        next.push(...backfilling.slice(index));
        break;
      }
      const outcome = await attempt(site, summary, logger, () =>
        step(db, site, true, summary),
      );
      if (outcome === StepOutcome.Advanced) next.push(site);
    }
    backfilling = next;
  }
  // Out of queries with marked days, new days or backfill left. A failed
  // site's days wait for the task's next scheduled run.
  summary.workRemains =
    !hasQueries(db) &&
    (dirtyDaysLeft > 0 ||
      sites.some((site) => !site.failed && site.lastDay < latestDay) ||
      backfilling.length > 0);
  summary.d1Queries = db.queries;

  await options.logger?.info(
    "visit_rollups_summary",
    "Visit rollups finished",
    { ...summary },
  );
  return {
    status:
      summary.sitesFailed > 0
        ? "partial"
        : summary.daysRebuilt +
              summary.daysKept +
              summary.daysRolledUp +
              summary.daysBackfilled >
            0
          ? "success"
          : "skipped",
    summary: { ...summary },
    workRemains: summary.workRemains,
  };
}
