import { createDatabaseRuntime, type DatabaseRuntime } from "@/lib/db";
import {
  deletedSitesWithData,
  purgeSiteData,
} from "@/lib/edge/sites/site-deletion";
import { ONE_DAY_MS } from "@/lib/edge/utils";

import { BudgetedDatabase, D1_QUERIES_PER_INVOCATION } from "./d1-query-budget";
import { readRetentionConfig } from "./retention-config";
import type { ScheduledTaskContext, ScheduledTaskOutcome } from "./runner";

/**
 * Rows per delete statement, so no single D1 statement runs long. It is not
 * a limit on how much is deleted: a run deletes batch after batch while it
 * has queries, and the next tick goes on.
 */
export const RETENTION_BATCH_ROWS = 1000;
/**
 * The queries a run keeps for expired data while it purges deleted sites:
 * the backlog read and one round of deletes, so expired data is deleted
 * even while a large deleted site takes the rest of the run.
 */
export const EXPIRED_DATA_MIN_QUERIES = 2;

/**
 * The UTC day a site's deletes stop before: its oldest day marked for a
 * rebuild, if that is before `limitDay`. A marked day and every later day
 * keep their page views until the rollup task has rebuilt the day.
 */
const deletableUntilDaySql = (sitePk: string, limitDay: string) => `
  MIN(${limitDay}, COALESCE(
    (SELECT MIN(d.day) FROM visit_rollup_dirty_days d WHERE d.site_pk = ${sitePk}),
    ${limitDay}
  ))
`;

/**
 * The site's (?1) oldest expired page views: up to a batch started before
 * UTC day ?2 and before the site's oldest marked day. Each statement reads
 * the marks, so a day marked during a run keeps its page views too.
 */
const oldestExpiredSql = (column: string) => `
  SELECT ${column} FROM visits
  WHERE site_pk = ?1
    AND started_at < ${deletableUntilDaySql("?1", "?2")} * ${ONE_DAY_MS}
  ORDER BY started_at LIMIT ${RETENTION_BATCH_ROWS}
`;
const EXPIRED_VISITS_SQL = oldestExpiredSql("visit_id");
/**
 * Their custom events, whenever each occurred: an event is deleted with its
 * page view.
 */
const EXPIRED_EVENTS_SQL = `
  SELECT event_pk FROM custom_events
  WHERE visit_id IN (${EXPIRED_VISITS_SQL})
  LIMIT ${RETENTION_BATCH_ROWS}
`;
/**
 * One round of deletes for a batch of expired page views, one D1 batch,
 * which first records the latest UTC day they start on as the site's
 * `retention_reached_day`, so the rollup task never rebuilds a day from part
 * of its page views. Then it deletes up to a batch of their events' payload
 * values, then of the payload nodes left without values, then the events
 * left without payload, then up to a batch of the page views' properties,
 * then the page views left without events or properties. No statement
 * cascades, so none changes more than a batch of rows; a large payload or
 * many properties take a few rounds.
 */
const EXPIRED_ROUND = [
  {
    sql: `
      UPDATE visit_rollup_state
      SET retention_reached_day = MAX(
        COALESCE(retention_reached_day, newest.day), newest.day
      )
      FROM (
        SELECT MAX(started_at) / ${ONE_DAY_MS} AS day
        FROM (${oldestExpiredSql("started_at")})
      ) AS newest
      WHERE site_pk = ?1 AND newest.day IS NOT NULL
    `,
    tag: "scheduled_tasks.retention.reached_day",
  },
  {
    sql: `
      DELETE FROM custom_event_json_values
      WHERE (event_pk, node_id) IN (
        SELECT event_pk, node_id FROM custom_event_json_values
        WHERE event_pk IN (${EXPIRED_EVENTS_SQL})
        LIMIT ${RETENTION_BATCH_ROWS}
      )
    `,
    tag: "scheduled_tasks.retention.event_values",
  },
  {
    sql: `
      DELETE FROM custom_event_json_nodes
      WHERE (event_pk, node_id) IN (
        SELECT n.event_pk, n.node_id FROM custom_event_json_nodes n
        WHERE n.event_pk IN (${EXPIRED_EVENTS_SQL})
          AND NOT EXISTS (
            SELECT 1 FROM custom_event_json_values v
            WHERE v.event_pk = n.event_pk AND v.node_id = n.node_id
          )
        LIMIT ${RETENTION_BATCH_ROWS}
      )
    `,
    tag: "scheduled_tasks.retention.event_nodes",
  },
  {
    sql: `
      DELETE FROM custom_events
      WHERE event_pk IN (${EXPIRED_EVENTS_SQL})
        AND NOT EXISTS (
          SELECT 1 FROM custom_event_json_nodes n
          WHERE n.event_pk = custom_events.event_pk
        )
    `,
    tag: "scheduled_tasks.retention.events",
  },
  {
    sql: `
      DELETE FROM visit_properties
      WHERE (visit_id, key) IN (
        SELECT visit_id, key FROM visit_properties
        WHERE visit_id IN (${EXPIRED_VISITS_SQL})
        LIMIT ${RETENTION_BATCH_ROWS}
      )
    `,
    tag: "scheduled_tasks.retention.visit_properties",
  },
  {
    sql: `
      DELETE FROM visits
      WHERE visit_id IN (${EXPIRED_VISITS_SQL})
        AND NOT EXISTS (
          SELECT 1 FROM custom_events e WHERE e.visit_id = visits.visit_id
        )
        AND NOT EXISTS (
          SELECT 1 FROM visit_properties p WHERE p.visit_id = visits.visit_id
        )
    `,
    tag: "scheduled_tasks.retention.visits",
  },
] as const;

interface SiteBacklog {
  readonly sitePk: number;
  /** The UTC day deletes stop before. */
  readonly limitDay: number;
  readonly pageViews: number;
}

/**
 * Each site with expired page views, and how many: one query. A site's
 * expired days are deleted once its rollups cover them, so only fully
 * backfilled sites qualify, only up to their last rolled-up day, and only
 * before their oldest day marked for a rebuild. A deleted site's data is
 * left to its purge.
 */
async function siteBacklogs(
  db: DatabaseRuntime,
  cutoffDay: number,
): Promise<SiteBacklog[]> {
  const sites = await db.all<{
    sitePk: number;
    limitDay: number;
    pageViews: number | null;
  }>({
    sql: `
      WITH backfilled AS (
        SELECT
          st.site_pk,
          ${deletableUntilDaySql("st.site_pk", "MIN(?1, st.last_day + 1)")}
            AS limit_day,
          (SELECT MIN(v.started_at) FROM visits v WHERE v.site_pk = st.site_pk)
            AS oldest
        FROM visit_rollup_state st
        JOIN site_identities si ON si.site_pk = st.site_pk
        JOIN sites s ON s.id = si.site_id
        WHERE st.backfilled = 1
      )
      SELECT
        site_pk AS sitePk,
        limit_day AS limitDay,
        (
          SELECT SUM(r.views) FROM visit_daily_rollups r
          WHERE r.site_pk = backfilled.site_pk
            AND r.day >= backfilled.oldest / ${ONE_DAY_MS}
            AND r.day < backfilled.limit_day
        ) AS pageViews
      FROM backfilled
      WHERE oldest < limit_day * ${ONE_DAY_MS}
      ORDER BY site_pk
    `,
    bindings: [cutoffDay],
    tag: "scheduled_tasks.retention.backlogs",
  });
  return sites.results.map((site) => ({
    sitePk: Number(site.sitePk),
    limitDay: Number(site.limitDay),
    // At least one round, for page views on days without rollup rows.
    pageViews: Math.max(1, Number(site.pageViews ?? 0)),
  }));
}

/**
 * Deletes a site's expired page views with their events, a round per query,
 * until the database has made `until` queries. Done when nothing expired is
 * left.
 */
async function deleteExpired(
  db: BudgetedDatabase,
  site: SiteBacklog,
  until: number,
): Promise<{ events: number; visits: number; done: boolean }> {
  const deleted = { events: 0, visits: 0, done: false };
  const bindings = [site.sitePk, site.limitDay];
  while (!deleted.done && db.queries < until) {
    const results = await db.batch(
      EXPIRED_ROUND.map((statement) => ({ ...statement, bindings })),
    );
    const [, values = 0, nodes = 0, events = 0, properties = 0, visits = 0] =
      results.map((result) => Number(result.meta?.changes ?? 0));
    deleted.events += events;
    deleted.visits += visits;
    // A round that deleted no payload, event or property found none; it
    // then deleted every page view of its batch, the last if the batch was
    // short.
    deleted.done =
      values + nodes + events + properties === 0 &&
      visits < RETENTION_BATCH_ROWS;
  }
  return deleted;
}

/**
 * Deletes page views, their events and properties from whole UTC days before
 * `cutoffDay`, with the queries the database has left, shared between sites
 * by how much each has expired, so a large backlog goes on over the next
 * ticks without holding up smaller sites. A site's day marked for a rebuild, and
 * its later days, wait for the rollup task to rebuild it: marked days are
 * rebuilt first in each rollup run. Needs `EXPIRED_DATA_MIN_QUERIES`.
 */
export async function deleteExpiredData(
  db: BudgetedDatabase,
  cutoffDay: number,
): Promise<{
  sites: number;
  visitsDeleted: number;
  eventsDeleted: number;
  queries: number;
  complete: boolean;
}> {
  const start = db.queries;
  const backlogs = await siteBacklogs(db, cutoffDay);
  const result = {
    sites: backlogs.length,
    visitsDeleted: 0,
    eventsDeleted: 0,
    queries: 0,
    complete: true,
  };
  let pageViewsLeft = backlogs.reduce((sum, site) => sum + site.pageViews, 0);
  for (const site of backlogs) {
    // What earlier sites left, by backlog, and at least a round while
    // queries are left, so every site makes progress.
    const share = Math.max(
      1,
      Math.floor((db.queriesLeft * site.pageViews) / pageViewsLeft),
    );
    pageViewsLeft -= site.pageViews;
    const deleted = await deleteExpired(
      db,
      site,
      Math.min(db.queries + share, db.maxQueries),
    );
    result.visitsDeleted += deleted.visits;
    result.eventsDeleted += deleted.events;
    if (!deleted.done) result.complete = false;
  }
  result.queries = db.queries - start;
  return result;
}

/**
 * Deletes deleted sites' data, keeping `EXPIRED_DATA_MIN_QUERIES` for
 * expired data. Done when every deleted site's purge finished.
 */
async function purgeDeletedSites(
  db: BudgetedDatabase,
): Promise<{ purged: number; complete: boolean }> {
  const until = db.maxQueries - EXPIRED_DATA_MIN_QUERIES;
  const result = { purged: 0, complete: true };
  for (const sitePk of await deletedSitesWithData(db)) {
    if (db.queries >= until) {
      result.complete = false;
      break;
    }
    const purge = await purgeSiteData(db, sitePk, until - db.queries);
    if (purge.done) result.purged += 1;
    else result.complete = false;
  }
  return result;
}

/**
 * Finishes removing deleted sites' data, then deletes page views and custom
 * events from whole UTC days older than the configured detail retention,
 * unless it keeps them forever. Rollups stay, so the Overview keeps every
 * day's numbers; filtered views, goals and funnels cover the retained days.
 * A run does as much as its `maxQueries` D1 queries allow, the settings read
 * included, by default the invocation's; with work left it reports
 * `workRemains` and the dispatcher runs it on the next tick.
 */
export async function runAnalyticsRetention(
  context: ScheduledTaskContext,
  maxQueries = D1_QUERIES_PER_INVOCATION,
): Promise<ScheduledTaskOutcome> {
  const { env, logger } = context;
  const db = new BudgetedDatabase(createDatabaseRuntime(env.DB), maxQueries);
  const { analyticsDetailDays } = await readRetentionConfig(db);
  const purgeStart = db.queries;
  const purge = await purgeDeletedSites(db);
  const purgeQueries = db.queries - purgeStart;
  const cutoffDay =
    analyticsDetailDays === null
      ? null
      : Math.floor(
          (Date.now() - analyticsDetailDays * ONE_DAY_MS) / ONE_DAY_MS,
        );
  const expired =
    cutoffDay === null ? null : await deleteExpiredData(db, cutoffDay);
  const workRemains = !purge.complete || expired?.complete === false;
  const summary = {
    deletedSitesPurged: purge.purged,
    purgeComplete: purge.complete,
    purgeQueries,
    analyticsDetailDays,
    cutoffDay,
    ...expired,
    d1Queries: db.queries,
    workRemains,
  };
  await logger.info(
    "analytics_retention_complete",
    "Analytics retention finished",
    summary,
  );
  return { status: "success", summary, workRemains };
}
