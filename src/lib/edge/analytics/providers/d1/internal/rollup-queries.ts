import { D1_MAX_BOUND_PARAMETERS } from "@/lib/db";
import { sitePksFromSiteIdsSql } from "@/lib/edge/sites/identity-sql";
import type { Env } from "@/lib/edge/types";
import { ONE_DAY_MS, ONE_HOUR_MS } from "@/lib/edge/utils";

import { queryD1All } from "./core-sources";
import { type buildTimeBuckets, timeBucketTimestamp } from "./core-time";
import type {
  OverviewAggregateRow,
  QueryWindow,
  TrendAggregateRow,
} from "./core-types";
import type { D1ReadDiagnostics } from "./diagnostics";
import { groupSitesByRollupSplit, type RollupSplit } from "./rollup-window";

type TimeBuckets = ReturnType<typeof buildTimeBuckets>;

export interface SiteTrendRow extends TrendAggregateRow {
  siteId: string;
}

/** Raw reads for the parts of a window that aren't rolled up. */
export type RawOverviewReader = (
  siteIds: readonly string[],
  window: QueryWindow,
) => Promise<Map<string, OverviewAggregateRow>>;

export type RawTrendReader = (
  siteIds: readonly string[],
  window: QueryWindow,
) => Promise<SiteTrendRow[]>;

const HOURS_PER_DAY = 24;

function siteChunks(siteIds: readonly string[]): string[][] {
  const chunks: string[][] = [];
  // Two bindings bound the day range.
  const size = D1_MAX_BOUND_PARAMETERS - 2;
  for (let index = 0; index < siteIds.length; index += size) {
    chunks.push(siteIds.slice(index, index + size));
  }
  return chunks;
}

function emptyOverview(): OverviewAggregateRow {
  return {
    views: 0,
    sessions: 0,
    visitors: 0,
    bounces: 0,
    totalDuration: 0,
    durationViews: 0,
  };
}

function addOverview(
  target: OverviewAggregateRow,
  source: OverviewAggregateRow,
): void {
  target.views += source.views;
  target.sessions += source.sessions;
  target.visitors += source.visitors;
  target.bounces += source.bounces;
  target.totalDuration += source.totalDuration;
  target.durationViews += source.durationViews;
}

async function queryDailyTotals(
  env: Env,
  siteIds: readonly string[],
  split: RollupSplit,
  diagnostics?: D1ReadDiagnostics,
): Promise<Map<string, OverviewAggregateRow>> {
  const totals = new Map<string, OverviewAggregateRow>();
  for (const chunk of siteChunks(siteIds)) {
    const rows = await queryD1All<Record<string, unknown>>(
      env,
      `
SELECT
  si.site_id AS siteId,
  SUM(r.views) AS views,
  SUM(r.sessions) AS sessions,
  SUM(r.visitors) AS visitors,
  SUM(r.bounces) AS bounces,
  SUM(r.duration_ms_sum) AS totalDuration,
  SUM(r.duration_ms_count) AS durationViews
FROM visit_daily_rollups r
JOIN site_identities si ON si.site_pk = r.site_pk
WHERE r.site_pk IN ${sitePksFromSiteIdsSql(chunk.length)}
  AND r.day >= ? AND r.day < ?
GROUP BY si.site_id
`,
      [...chunk, split.startDay, split.endDay],
      diagnostics,
    );
    for (const row of rows) {
      totals.set(String(row.siteId), {
        views: Number(row.views ?? 0),
        sessions: Number(row.sessions ?? 0),
        visitors: Number(row.visitors ?? 0),
        bounces: Number(row.bounces ?? 0),
        totalDuration: Number(row.totalDuration ?? 0),
        durationViews: Number(row.durationViews ?? 0),
      });
    }
  }
  return totals;
}

/**
 * Overview totals for the sites with rolled-up days in the window: those
 * days from the daily rollups, the window's other parts from raw rows.
 * Sites with no rolled-up day in the window are returned for a raw read.
 */
export async function queryOverviewForSitesFromRollups(
  env: Env,
  siteIds: readonly string[],
  window: QueryWindow,
  readRaw: RawOverviewReader,
  diagnostics?: D1ReadDiagnostics,
): Promise<{
  readonly value: Map<string, OverviewAggregateRow>;
  readonly rawSiteIds: readonly string[];
}> {
  const { groups, rawSiteIds } = await groupSitesByRollupSplit(
    env,
    siteIds,
    window,
    diagnostics,
  );
  const value = new Map<string, OverviewAggregateRow>();
  for (const group of groups) {
    const daily = await queryDailyTotals(
      env,
      group.siteIds,
      group.split,
      diagnostics,
    );
    for (const siteId of group.siteIds) {
      value.set(siteId, daily.get(siteId) ?? emptyOverview());
    }
    for (const rawWindow of group.split.rawWindows) {
      const raw = await readRaw(group.siteIds, rawWindow);
      for (const [siteId, row] of raw) {
        const total = value.get(siteId);
        if (total) addOverview(total, row);
      }
    }
  }
  return { value, rawSiteIds };
}

/** One UTC day's share of a trend bucket: hours [fromHour, toHour). */
interface TrendPiece {
  readonly bucket: number;
  readonly day: number;
  readonly fromHour: number;
  readonly toHour: number;
}

function isWholeDay(piece: TrendPiece): boolean {
  return piece.fromHour === 0 && piece.toHour === HOURS_PER_DAY;
}

/**
 * Splits each bucket's rolled-up part into UTC-day pieces, or returns null
 * when a piece's unique visitors can't be read from hourly counts: a bucket
 * edge that isn't on the hour (a half-hour time zone), or a run of hours in
 * the middle of a day. Day, week and month buckets in whole-hour time zones
 * only start or end days; hour buckets are single hours.
 */
function trendPieces(
  buckets: TimeBuckets,
  split: RollupSplit,
): TrendPiece[] | null {
  const rollupStartMs = split.startDay * ONE_DAY_MS;
  const rollupEndMs = split.endDay * ONE_DAY_MS;
  const pieces: TrendPiece[] = [];
  for (const bucket of buckets) {
    const startMs = Math.max(bucket.startMs, rollupStartMs);
    const endMs = Math.min(bucket.endExclusiveMs, rollupEndMs);
    if (startMs >= endMs) continue;
    if (startMs % ONE_HOUR_MS !== 0 || endMs % ONE_HOUR_MS !== 0) return null;
    for (
      let day = Math.floor(startMs / ONE_DAY_MS);
      day * ONE_DAY_MS < endMs;
      day += 1
    ) {
      const dayStartMs = day * ONE_DAY_MS;
      const fromHour =
        (Math.max(startMs, dayStartMs) - dayStartMs) / ONE_HOUR_MS;
      const toHour =
        (Math.min(endMs, dayStartMs + ONE_DAY_MS) - dayStartMs) / ONE_HOUR_MS;
      if (
        fromHour !== 0 &&
        toHour !== HOURS_PER_DAY &&
        toHour !== fromHour + 1
      ) {
        return null;
      }
      pieces.push({ bucket: bucket.index, day, fromHour, toHour });
    }
  }
  return pieces;
}

interface HourCounts {
  views: number;
  visitors: number;
  firstVisitors: number;
  lastVisitors: number;
  sessions: number;
  bounces: number;
  totalDuration: number;
  durationViews: number;
}

async function queryHourCounts(
  env: Env,
  siteIds: readonly string[],
  split: RollupSplit,
  wholeDaysOnly: boolean,
  diagnostics?: D1ReadDiagnostics,
): Promise<Map<string, Map<number, HourCounts>>> {
  // Whole days read one daily row each, filed under the day's first hour.
  const sql = wholeDaysOnly
    ? `
SELECT
  si.site_id AS siteId,
  r.day * ${HOURS_PER_DAY} AS hourBucket,
  r.views, r.visitors,
  r.visitors AS firstVisitors,
  r.visitors AS lastVisitors,
  r.sessions, r.bounces,
  r.duration_ms_sum AS totalDuration,
  r.duration_ms_count AS durationViews
FROM visit_daily_rollups r
JOIN site_identities si ON si.site_pk = r.site_pk
WHERE r.site_pk IN %SITES%
  AND r.day >= ? AND r.day < ?
`
    : `
SELECT
  si.site_id AS siteId,
  r.hour_bucket AS hourBucket,
  r.views, r.visitors,
  r.first_visitors AS firstVisitors,
  r.last_visitors AS lastVisitors,
  r.sessions, r.bounces,
  r.duration_ms_sum AS totalDuration,
  r.duration_ms_count AS durationViews
FROM visit_hourly_rollups r
JOIN site_identities si ON si.site_pk = r.site_pk
WHERE r.site_pk IN %SITES%
  AND r.hour_bucket >= ? AND r.hour_bucket < ?
`;
  const range = wholeDaysOnly
    ? [split.startDay, split.endDay]
    : [split.startDay * HOURS_PER_DAY, split.endDay * HOURS_PER_DAY];
  const bySite = new Map<string, Map<number, HourCounts>>();
  for (const chunk of siteChunks(siteIds)) {
    const rows = await queryD1All<Record<string, unknown>>(
      env,
      sql.replace("%SITES%", sitePksFromSiteIdsSql(chunk.length)),
      [...chunk, ...range],
      diagnostics,
    );
    for (const row of rows) {
      const siteId = String(row.siteId);
      const hours = bySite.get(siteId) ?? new Map<number, HourCounts>();
      hours.set(Number(row.hourBucket), {
        views: Number(row.views),
        visitors: Number(row.visitors),
        firstVisitors: Number(row.firstVisitors),
        lastVisitors: Number(row.lastVisitors),
        sessions: Number(row.sessions),
        bounces: Number(row.bounces),
        totalDuration: Number(row.totalDuration),
        durationViews: Number(row.durationViews),
      });
      bySite.set(siteId, hours);
    }
  }
  return bySite;
}

function emptyTrendRow(
  siteId: string,
  bucket: number,
  buckets: TimeBuckets,
): SiteTrendRow {
  return {
    siteId,
    bucket,
    timestampMs: timeBucketTimestamp(buckets, bucket),
    ...emptyOverview(),
  };
}

function addPiece(
  row: SiteTrendRow,
  piece: TrendPiece,
  hours: Map<number, HourCounts>,
): void {
  // Whole-day reads file each daily row under the day's first hour.
  const firstHour = piece.day * HOURS_PER_DAY;
  for (let hour = piece.fromHour; hour < piece.toHour; hour += 1) {
    const counts = hours.get(firstHour + hour);
    if (!counts) continue;
    row.views += counts.views;
    row.sessions += counts.sessions;
    row.bounces += counts.bounces;
    row.totalDuration += counts.totalDuration;
    row.durationViews += counts.durationViews;
    // A visitor is in the piece once: by their first hour of the day when
    // the piece starts the day, by their last when it ends the day.
    if (piece.fromHour === 0) row.visitors += counts.firstVisitors;
    else if (piece.toHour === HOURS_PER_DAY)
      row.visitors += counts.lastVisitors;
    else row.visitors += counts.visitors;
  }
}

/**
 * Trend rows for the sites with rolled-up days in the window. Rolled-up days
 * come from the hourly rollups, or the daily ones when every bucket holds
 * whole UTC days; raw rows cover the rest. Returns null when the buckets
 * can't be read from rollups at all.
 */
export async function queryTrendForSitesFromRollups(
  env: Env,
  siteIds: readonly string[],
  window: QueryWindow,
  buckets: TimeBuckets,
  readRaw: RawTrendReader,
  diagnostics?: D1ReadDiagnostics,
): Promise<{
  readonly rows: SiteTrendRow[];
  readonly rawSiteIds: readonly string[];
}> {
  const { groups, rawSiteIds } = await groupSitesByRollupSplit(
    env,
    siteIds,
    window,
    diagnostics,
  );
  const rows: SiteTrendRow[] = [];
  const unplannedSiteIds = [...rawSiteIds];
  for (const group of groups) {
    const pieces = trendPieces(buckets, group.split);
    if (!pieces) {
      unplannedSiteIds.push(...group.siteIds);
      continue;
    }
    const counts = await queryHourCounts(
      env,
      group.siteIds,
      group.split,
      pieces.every(isWholeDay),
      diagnostics,
    );
    const bySite = new Map<string, Map<number, SiteTrendRow>>();
    const ensure = (siteId: string, bucket: number) => {
      const siteRows = bySite.get(siteId) ?? new Map<number, SiteTrendRow>();
      bySite.set(siteId, siteRows);
      const existing = siteRows.get(bucket);
      if (existing) return existing;
      const created = emptyTrendRow(siteId, bucket, buckets);
      siteRows.set(bucket, created);
      return created;
    };
    for (const siteId of group.siteIds) {
      const hours = counts.get(siteId);
      if (!hours) continue;
      for (const piece of pieces) {
        addPiece(ensure(siteId, piece.bucket), piece, hours);
      }
    }
    for (const rawWindow of group.split.rawWindows) {
      for (const raw of await readRaw(group.siteIds, rawWindow)) {
        const row = ensure(raw.siteId, raw.bucket);
        row.views += raw.views;
        row.visitors += raw.visitors;
        row.sessions += raw.sessions;
        row.bounces += raw.bounces;
        row.totalDuration += raw.totalDuration;
        row.durationViews += raw.durationViews;
      }
    }
    for (const siteRows of bySite.values()) {
      rows.push(...[...siteRows.values()].filter((row) => row.views > 0));
    }
  }
  rows.sort(
    (left, right) =>
      left.bucket - right.bucket || left.siteId.localeCompare(right.siteId),
  );
  return { rows, rawSiteIds: unplannedSiteIds };
}
