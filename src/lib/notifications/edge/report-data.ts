import {
  compileD1Query,
  createD1DatabaseClient,
  eq,
  filter,
  limit,
  param,
  project,
  scan,
  schema,
} from "@/lib/db";
import { EMPTY_FILTER_DOCUMENT } from "@/lib/edge/analytics/contract";
import type { QueryWindow } from "@/lib/edge/analytics/providers/d1/internal/core";
import { queryOverviewAggregate } from "@/lib/edge/analytics/providers/d1/internal/overview";
import { queryTopPagesFromD1 } from "@/lib/edge/analytics/providers/d1/internal/pages";
import { queryTopReferrersFromD1 } from "@/lib/edge/analytics/providers/d1/internal/referrers";
import type { Env } from "@/lib/edge/types";
import type { ChangeWindow, ReportFrequency } from "@/lib/notifications/rules";
import {
  partsInTimezone,
  zonedTimeToUtcMs,
} from "@/lib/notifications/zoned-time";

import {
  getOrCreateCachedPromise,
  notificationCacheKey,
  type NotificationInvocationCache,
  type NotificationSiteInfo,
} from "./notification-cache";
export interface NotificationReportRange {
  from: number;
  to: number;
  label: string;
}
export interface ReportData {
  siteName: string;
  siteDomain: string;
  reportType: ReportFrequency;
  range: NotificationReportRange;
  metrics: {
    views: number;
    visitors: number;
    sessions: number;
  };
  topPages: Array<{
    path: string;
    views: number;
  }>;
  topReferrers: Array<{
    referrer: string;
    visits: number;
  }>;
}
/** Visitors in a window and in the window of the same length before it. */
export interface VisitorChange {
  current: number;
  previous: number;
  range: { from: number; to: number };
  previousRange: { from: number; to: number };
}
function cleanTimezone(value: unknown): string {
  const timeZone =
    typeof value === "string" && value.trim() ? value.trim() : "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return timeZone;
  } catch {
    return "UTC";
  }
}
function dateLabel(parts: { year: number; month: number; day: number }) {
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}
function rangeLabel(
  startMs: number,
  endExclusiveMs: number,
  timeZone: string,
): string {
  const from = dateLabel(partsInTimezone(new Date(startMs), timeZone));
  const to = dateLabel(
    partsInTimezone(new Date(Math.max(startMs, endExclusiveMs - 1)), timeZone),
  );
  return from === to ? from : `${from} to ${to}`;
}
function rangeOf(window: QueryWindow) {
  return {
    from: Math.floor(window.startMs / 1000),
    to: Math.floor(window.endExclusiveMs / 1000),
  };
}
/** The last full week (Monday to Sunday) or month before `now`. */
export function notificationReportWindowFor(input: {
  reportType: ReportFrequency;
  now: number;
  timezone?: string;
}): QueryWindow & { label: string } {
  const nowMs = Math.max(0, Math.trunc(input.now)) * 1000;
  const timeZone = cleanTimezone(input.timezone);
  const local = partsInTimezone(new Date(nowMs), timeZone);
  const midnight = (year: number, month: number, day: number) =>
    zonedTimeToUtcMs({ year, month, day, hour: 0, minute: 0, timeZone });

  if (input.reportType === "weekly") {
    const dayIndex = new Date(
      Date.UTC(local.year, local.month - 1, local.day),
    ).getUTCDay();
    const daysSinceMonday = (dayIndex + 6) % 7;
    const endExclusiveMs = midnight(
      local.year,
      local.month,
      local.day - daysSinceMonday,
    );
    const startMs = midnight(
      local.year,
      local.month,
      local.day - daysSinceMonday - 7,
    );
    return {
      startMs,
      endExclusiveMs,
      nowMs,
      timeZone,
      label: rangeLabel(startMs, endExclusiveMs, timeZone),
    };
  }

  const previousMonth = local.month === 1 ? 12 : local.month - 1;
  const previousYear = local.month === 1 ? local.year - 1 : local.year;
  return {
    startMs: midnight(previousYear, previousMonth, 1),
    endExclusiveMs: midnight(local.year, local.month, 1),
    nowMs,
    timeZone,
    label: `${previousYear}-${String(previousMonth).padStart(2, "0")}`,
  };
}
export async function loadSiteInfo(
  env: Env,
  siteId: string,
  cache?: NotificationInvocationCache,
): Promise<NotificationSiteInfo | null> {
  if (!cache) return loadSiteInfoUncached(env, siteId);
  return getOrCreateCachedPromise(cache.sites, siteId, () =>
    loadSiteInfoUncached(env, siteId),
  );
}
async function loadSiteInfoUncached(
  env: Env,
  siteId: string,
): Promise<NotificationSiteInfo | null> {
  const sites = scan(schema.sites);
  const matchingSite = filter(sites, eq(sites.columns.id, param(siteId)));
  const query = limit(
    project(matchingSite, {
      name: matchingSite.columns.name,
      domain: matchingSite.columns.domain,
    }),
    1,
  );
  const row = await createD1DatabaseClient(env.DB).first(
    compileD1Query(query, { tag: "notifications.sites.first" }),
  );
  return row ?? null;
}
/**
 * One site's report for the last full week or month. Members who each set up
 * the same report share one read within a notification tick.
 */
export async function loadReportData(
  env: Env,
  input: {
    siteId: string;
    now: number;
    timezone?: string;
    reportType: ReportFrequency;
    cache?: NotificationInvocationCache;
  },
): Promise<ReportData | null> {
  const window = notificationReportWindowFor(input);
  const load = () => loadReportDataUncached(env, input, window);
  if (!input.cache) return load();
  const key = notificationCacheKey([
    input.siteId,
    window.startMs,
    window.endExclusiveMs,
    window.timeZone,
  ]);
  return getOrCreateCachedPromise(input.cache.reports, key, load);
}
async function loadReportDataUncached(
  env: Env,
  input: {
    siteId: string;
    reportType: ReportFrequency;
    cache?: NotificationInvocationCache;
  },
  window: QueryWindow & { label: string },
): Promise<ReportData | null> {
  const site = await loadSiteInfo(env, input.siteId, input.cache);
  if (!site) return null;
  const [overview, pages, referrers] = await Promise.all([
    loadOverviewAggregate(env, input.siteId, window, input.cache),
    queryTopPagesFromD1(
      env,
      input.siteId,
      window,
      5,
      false,
      EMPTY_FILTER_DOCUMENT,
    ),
    queryTopReferrersFromD1(
      env,
      input.siteId,
      window,
      EMPTY_FILTER_DOCUMENT,
      5,
      false,
    ),
  ]);
  return {
    siteName: site.name,
    siteDomain: site.domain,
    reportType: input.reportType,
    range: { ...rangeOf(window), label: window.label },
    metrics: {
      views: overview.value.views,
      visitors: overview.value.visitors,
      sessions: overview.value.sessions,
    },
    topPages: pages.map((row) => ({
      path: row.pathname || "/",
      views: row.views,
    })),
    topReferrers: referrers.map((row) => ({
      referrer: row.referrer || "Direct",
      visits: row.sessions,
    })),
  };
}
const CHANGE_WINDOW_MS: Record<ChangeWindow, number> = {
  last_1h: 60 * 60 * 1000,
  last_24h: 24 * 60 * 60 * 1000,
};
export async function loadVisitorChange(
  env: Env,
  input: {
    siteId: string;
    window: ChangeWindow;
    now: number;
    cache?: NotificationInvocationCache;
  },
): Promise<VisitorChange> {
  const nowMs = Math.max(0, Math.trunc(input.now)) * 1000;
  const widthMs = CHANGE_WINDOW_MS[input.window];
  const current: QueryWindow = {
    startMs: nowMs - widthMs,
    endExclusiveMs: nowMs,
    nowMs,
    timeZone: "UTC",
  };
  const previous: QueryWindow = {
    ...current,
    startMs: nowMs - 2 * widthMs,
    endExclusiveMs: nowMs - widthMs,
  };
  const [currentOverview, previousOverview] = await Promise.all([
    loadOverviewAggregate(env, input.siteId, current, input.cache),
    loadOverviewAggregate(env, input.siteId, previous, input.cache),
  ]);
  return {
    current: currentOverview.value.visitors,
    previous: previousOverview.value.visitors,
    range: rangeOf(current),
    previousRange: rangeOf(previous),
  };
}
async function loadOverviewAggregate(
  env: Env,
  siteId: string,
  window: QueryWindow,
  cache?: NotificationInvocationCache,
) {
  const load = () =>
    queryOverviewAggregate(env, siteId, window, EMPTY_FILTER_DOCUMENT);
  if (!cache) return load();
  const key = notificationCacheKey([
    siteId,
    window.startMs,
    window.endExclusiveMs,
    window.nowMs,
    window.timeZone,
  ]);
  return getOrCreateCachedPromise(cache.overviews, key, load);
}
