import { CompoundOperator, compoundSelectSql } from "@/lib/db/compound-select";
import { concat, text } from "@/lib/db/sql/fragment";
import {
  DASHBOARD_CARD_ROW_LIMIT,
  DashboardCard,
  type DashboardCardRow,
  type DashboardCardTabs,
  DevicesCardTab,
  LocationsCardTab,
  onlyGeoFilter,
  PagesCardTab,
  type QuerySource,
  SourcesCardTab,
  withoutGeoFilter,
} from "@/lib/edge/analytics/contract";
import type { Env } from "@/lib/edge/types";
import {
  EMPTY_FILTER_DOCUMENT,
  hasPagePathFilter,
} from "@/lib/filter-contract/filters";

import type {
  DimensionRow,
  FilterDocument,
  Interval,
  OverviewAggregateRow,
  QueryWindow,
  TrendAggregateRow,
} from "./core";
import {
  buildTimeBuckets,
  cityValueExpr,
  clientDimensionDefinition,
  filteredVisitsCte,
  geoTabLabel,
  queryD1All,
  regionValueExpr,
  timeBucketCase,
  utmDimensionDefinition,
} from "./core";
import type { D1ReadDiagnostics } from "./diagnostics";
import {
  queryDimensionFromD1,
  querySessionPathDimensionFromD1,
  sessionPathGroupingCtes,
  type SessionPathKind,
} from "./dimensions";
import { visitFilterSql } from "./filter-compiler";
import {
  overviewTotalsRow,
  overviewTotalsSql,
  pageViewGroupColumns,
  pageViewGroupsCte,
  queryOverviewAggregate,
  queryTrendAggregate,
  trendRow,
  trendSql,
} from "./overview";

/** What a row of the dashboard statement is part of, besides a card. */
enum DashboardPart {
  Overview = "overview",
  Trend = "trend",
}

/** How a card's tab groups the page views. */
type CardGrouping =
  | {
      readonly kind: "page-view";
      /** What the rows group by, over the page view's columns. */
      readonly expression: string;
      readonly columns: readonly string[];
      /** Drops the row of page views without a value. */
      readonly excludeEmpty: boolean;
      /** Null for every row, as the map shades every country. */
      readonly limit: number | null;
      /** The country list stays whole when the page is filtered to one. */
      readonly ignoresGeoFilter: boolean;
      readonly label: (value: string) => string;
    }
  | {
      readonly kind: "session";
      readonly session: SessionPathKind;
    };

const SESSION_GROUPING_COLUMNS = ["visit_id", "pathname"];

function pageViewGrouping(
  expression: string,
  columns: readonly string[],
  options: {
    readonly excludeEmpty?: boolean;
    readonly limit?: number | null;
    readonly ignoresGeoFilter?: boolean;
    readonly label?: (value: string) => string;
  } = {},
): CardGrouping {
  return {
    kind: "page-view",
    expression,
    columns,
    excludeEmpty: options.excludeEmpty ?? true,
    limit:
      options.limit === undefined ? DASHBOARD_CARD_ROW_LIMIT : options.limit,
    ignoresGeoFilter: options.ignoresGeoFilter ?? false,
    label: options.label ?? ((value) => value),
  };
}

/** A campaign tab lists the visits tagged with its UTM parameter. */
function utmGrouping(
  key: "source" | "medium" | "campaign" | "term" | "content",
): CardGrouping {
  return pageViewGrouping(utmDimensionDefinition(key).labelExpr, [
    `utm_${key}`,
  ]);
}

function sourcesGrouping(tab: SourcesCardTab): CardGrouping {
  switch (tab) {
    case SourcesCardTab.Channel:
      return pageViewGrouping("channel", ["channel"]);
    case SourcesCardTab.Domain:
      // Page views without a referrer are the direct visits' row.
      return pageViewGrouping("referrer_host", ["referrer_host"], {
        excludeEmpty: false,
      });
    case SourcesCardTab.UtmSource:
      return utmGrouping("source");
    case SourcesCardTab.UtmMedium:
      return utmGrouping("medium");
    case SourcesCardTab.UtmCampaign:
      return utmGrouping("campaign");
    case SourcesCardTab.UtmTerm:
      return utmGrouping("term");
    case SourcesCardTab.UtmContent:
      return utmGrouping("content");
  }
}

function pagesGrouping(tab: PagesCardTab): CardGrouping {
  switch (tab) {
    case PagesCardTab.Path:
      return pageViewGrouping("pathname", ["pathname"]);
    case PagesCardTab.Entry:
      return { kind: "session", session: "entry" };
    case PagesCardTab.Exit:
      return { kind: "session", session: "exit" };
  }
}

function locationsGrouping(tab: LocationsCardTab): CardGrouping {
  switch (tab) {
    case LocationsCardTab.Map:
      return pageViewGrouping("country", ["country"], {
        limit: null,
        ignoresGeoFilter: true,
        label: (value) => geoTabLabel(value, "country"),
      });
    case LocationsCardTab.Country:
      return pageViewGrouping("country", ["country"], {
        ignoresGeoFilter: true,
        label: (value) => geoTabLabel(value, "country"),
      });
    case LocationsCardTab.Region:
      return pageViewGrouping(
        regionValueExpr(),
        ["country", "region_code", "region"],
        { label: (value) => geoTabLabel(value, "region") },
      );
    case LocationsCardTab.City:
      return pageViewGrouping(
        cityValueExpr(),
        ["country", "region_code", "region", "city"],
        { label: (value) => geoTabLabel(value, "city") },
      );
  }
}

function devicesGrouping(tab: DevicesCardTab): CardGrouping {
  switch (tab) {
    case DevicesCardTab.Browser:
      return pageViewGrouping(clientDimensionDefinition("browser").labelExpr, [
        "browser",
      ]);
    case DevicesCardTab.OsVersion:
      return pageViewGrouping(
        clientDimensionDefinition("osVersion").labelExpr,
        ["os", "os_version"],
      );
    case DevicesCardTab.DeviceType:
      return pageViewGrouping(
        clientDimensionDefinition("deviceType").labelExpr,
        ["device_type"],
      );
  }
}

function cardGroupings(
  tabs: DashboardCardTabs,
): ReadonlyMap<DashboardCard, CardGrouping> {
  return new Map([
    [DashboardCard.Sources, sourcesGrouping(tabs[DashboardCard.Sources])],
    [DashboardCard.Pages, pagesGrouping(tabs[DashboardCard.Pages])],
    [DashboardCard.Locations, locationsGrouping(tabs[DashboardCard.Locations])],
    [DashboardCard.Devices, devicesGrouping(tabs[DashboardCard.Devices])],
  ]);
}

function cardRow(grouping: CardGrouping, row: DimensionRow): DashboardCardRow {
  return {
    value: row.value,
    label:
      grouping.kind === "page-view" ? grouping.label(row.value) : row.value,
    views: row.views,
    sessions: row.sessions,
    visitors: row.visitors,
  };
}

/** Rows rank by visitors, as a card sorts them first. */
const CARD_RANK =
  "ROW_NUMBER() OVER (ORDER BY visitors DESC, views DESC, value ASC)";

function cardCte(
  card: DashboardCard,
  grouping: CardGrouping,
  matched: string,
  scanned: string,
): string {
  if (grouping.kind === "session") {
    return `${sessionPathGroupingCtes(matched, grouping.session)},
card_${card} AS (
  SELECT value, views, sessions, visitors, ${CARD_RANK} AS rank
  FROM raw_session_paths
  ORDER BY rank
  LIMIT ${DASHBOARD_CARD_ROW_LIMIT}
)`;
  }
  return `card_${card} AS (
  SELECT value, views, sessions, visitors, ${CARD_RANK} AS rank
  FROM (
    SELECT
      COALESCE(${grouping.expression}, '') AS value,
      count(*) AS views,
      count(DISTINCT session_id) AS sessions,
      count(DISTINCT visitor_id) AS visitors
    FROM ${grouping.ignoresGeoFilter ? scanned : matched}
    GROUP BY value
  )${grouping.excludeEmpty ? "\n  WHERE value != ''" : ""}
  ORDER BY rank${grouping.limit === null ? "" : `\n  LIMIT ${grouping.limit}`}
)`;
}

export interface DashboardRead {
  readonly overview: OverviewAggregateRow;
  readonly trend: readonly TrendAggregateRow[];
  readonly cards?: Readonly<Record<DashboardCard, readonly DashboardCardRow[]>>;
  readonly source: QuerySource;
}

/**
 * A filtered dashboard load as one statement that reads the matching page
 * views once: they are materialized with only the columns the statement
 * reads, and the totals, the trend and each card's top rows are aggregates
 * of them. When the country list ignores a location filter, the page views
 * are those of the other conditions, flagged by whether they match it.
 */
function filteredDashboardStatement(
  siteId: string,
  window: QueryWindow,
  buckets: ReturnType<typeof buildTimeBuckets>,
  filters: FilterDocument,
  groupings: ReadonlyMap<DashboardCard, CardGrouping> | null,
) {
  const withScrollDepth = hasPagePathFilter(filters);
  const geoFilter = onlyGeoFilter(filters);
  const flagsGeo =
    geoFilter.conditions.length > 0 &&
    [...(groupings?.values() ?? [])].some(
      (grouping) => grouping.kind === "page-view" && grouping.ignoresGeoFilter,
    );
  const scanned = "page_view_scan";
  const matched = flagsGeo ? "matched_page_views" : scanned;
  const columnNames = [
    ...new Set([
      ...pageViewGroupColumns(withScrollDepth),
      ...[...(groupings?.values() ?? [])].flatMap((grouping) =>
        grouping.kind === "page-view"
          ? grouping.columns
          : SESSION_GROUPING_COLUMNS,
      ),
    ]),
  ].join(", ");
  const scan = filteredVisitsCte(
    siteId,
    window,
    flagsGeo ? withoutGeoFilter(filters) : filters,
    {
      name: scanned,
      columns: flagsGeo
        ? concat(
            text(`${columnNames},\n    (`),
            visitFilterSql(geoFilter, {
              siteId,
              startMs: window.startMs,
              endExclusiveMs: window.endExclusiveMs,
            })!,
            text(") AS geo_match"),
          )
        : columnNames,
      materialized: true,
    },
  );
  const totals = overviewTotalsSql(withScrollDepth);
  const trend = trendSql(
    timeBucketCase(buckets, "MIN(first_at)").sql,
    withScrollDepth,
  );
  const scrollDepth = withScrollDepth ? "scrollDepth" : "NULL";
  const ctes = [
    scan.sql,
    ...(flagsGeo
      ? [`${matched} AS (\n  SELECT * FROM ${scanned} WHERE geo_match\n)`]
      : []),
    pageViewGroupsCte({
      from: matched,
      bucket: timeBucketCase(buckets, "started_at").sql,
      withScrollDepth,
      materialized: true,
    }),
    totals.ctes,
    trend.ctes,
    `overview_totals AS (\n${totals.select}\n)`,
    `trend_rows AS (\n${trend.select}\n)`,
    ...[...(groupings ?? [])].map(([card, grouping]) =>
      cardCte(card, grouping, matched, scanned),
    ),
  ];
  const parts = [
    `SELECT '${DashboardPart.Overview}' AS part, NULL AS bucket, NULL AS value, NULL AS rank, views, visitors, sessions, bounces, totalDuration, durationViews, ${scrollDepth} AS scrollDepth FROM overview_totals`,
    `SELECT '${DashboardPart.Trend}', bucket, NULL, NULL, views, visitors, sessions, bounces, totalDuration, durationViews, ${scrollDepth} FROM trend_rows`,
    ...[...(groupings?.keys() ?? [])].map(
      (card) =>
        `SELECT '${card}', NULL, value, rank, views, visitors, sessions, NULL, NULL, NULL, NULL FROM card_${card}`,
    ),
  ];
  return {
    sql: `WITH\n${ctes.join(",\n")}\n${compoundSelectSql(parts, CompoundOperator.UnionAll)}`,
    bindings: scan.bindings,
    withScrollDepth,
  };
}

async function readFilteredDashboard(
  env: Env,
  siteId: string,
  window: QueryWindow,
  interval: Interval,
  filters: FilterDocument,
  groupings: ReadonlyMap<DashboardCard, CardGrouping> | null,
  diagnostics?: D1ReadDiagnostics,
): Promise<DashboardRead> {
  const buckets = buildTimeBuckets(window, interval);
  const statement = filteredDashboardStatement(
    siteId,
    window,
    buckets,
    filters,
    groupings,
  );
  const rows = await queryD1All<Record<string, unknown>>(
    env,
    statement.sql,
    statement.bindings,
    diagnostics,
  );
  let overview: OverviewAggregateRow | undefined;
  const trend: TrendAggregateRow[] = [];
  const ranked = new Map<
    DashboardCard,
    Array<{ rank: number; row: DimensionRow }>
  >([...(groupings?.keys() ?? [])].map((card) => [card, []]));
  for (const row of rows) {
    const part = String(row.part);
    if (part === DashboardPart.Overview) {
      overview = overviewTotalsRow(row, statement.withScrollDepth);
    } else if (part === DashboardPart.Trend) {
      trend.push(trendRow(row, buckets, statement.withScrollDepth));
    } else {
      const cardRows = ranked.get(part as DashboardCard);
      if (!cardRows) throw new Error(`dashboard_row_part_unknown:${part}`);
      cardRows.push({
        rank: Number(row.rank),
        row: {
          value: String(row.value),
          views: Number(row.views),
          sessions: Number(row.sessions),
          visitors: Number(row.visitors),
        },
      });
    }
  }
  if (!overview) throw new Error("dashboard_overview_row_missing");
  return {
    overview,
    trend: trend.sort((left, right) => left.bucket - right.bucket),
    ...(groupings
      ? {
          cards: Object.fromEntries(
            [...groupings].map(([card, grouping]) => [
              card,
              ranked
                .get(card)!
                .sort((left, right) => left.rank - right.rank)
                .map(({ row }) => cardRow(grouping, row)),
            ]),
          ) as Record<DashboardCard, DashboardCardRow[]>,
        }
      : {}),
    source: "raw",
  };
}

/** A card's top rows for an unfiltered load: rolled-up days and raw edges. */
async function unfilteredCardRows(
  env: Env,
  siteId: string,
  window: QueryWindow,
  grouping: CardGrouping,
  diagnostics?: D1ReadDiagnostics,
): Promise<DimensionRow[]> {
  if (grouping.kind === "session") {
    return querySessionPathDimensionFromD1(
      env,
      siteId,
      window,
      EMPTY_FILTER_DOCUMENT,
      DASHBOARD_CARD_ROW_LIMIT,
      grouping.session,
      diagnostics,
      undefined,
      "visitors",
      "desc",
    );
  }
  return queryDimensionFromD1(
    env,
    siteId,
    window,
    EMPTY_FILTER_DOCUMENT,
    grouping.limit ?? 0,
    grouping.expression,
    {
      excludeEmpty: grouping.excludeEmpty,
      sortBy: "visitors",
      sortDirection: "desc",
    },
    diagnostics,
  );
}

async function readUnfilteredDashboard(
  env: Env,
  siteId: string,
  window: QueryWindow,
  interval: Interval,
  groupings: ReadonlyMap<DashboardCard, CardGrouping> | null,
  diagnostics?: D1ReadDiagnostics,
): Promise<DashboardRead> {
  const [overview, trend, cards] = await Promise.all([
    queryOverviewAggregate(
      env,
      siteId,
      window,
      EMPTY_FILTER_DOCUMENT,
      diagnostics,
    ),
    queryTrendAggregate(
      env,
      siteId,
      window,
      interval,
      EMPTY_FILTER_DOCUMENT,
      diagnostics,
    ),
    groupings
      ? Promise.all(
          [...groupings].map(async ([card, grouping]) => [
            card,
            (
              await unfilteredCardRows(
                env,
                siteId,
                window,
                grouping,
                diagnostics,
              )
            ).map((row) => cardRow(grouping, row)),
          ]),
        )
      : null,
  ]);
  return {
    overview: overview.value,
    trend: trend.value,
    ...(cards
      ? {
          cards: Object.fromEntries(cards) as Record<
            DashboardCard,
            DashboardCardRow[]
          >,
        }
      : {}),
    source:
      overview.diagnosticSource === trend.diagnosticSource
        ? (overview.diagnosticSource ?? "raw")
        : "mixed",
  };
}

/**
 * Everything a dashboard load shows: the totals, the trend, and the top
 * rows of the tab each card shows. A filtered load is one statement that
 * reads the matching page views once; an unfiltered one reads the rollups.
 */
export function queryDashboardFromD1(
  env: Env,
  siteId: string,
  window: QueryWindow,
  interval: Interval,
  filters: FilterDocument,
  cards: DashboardCardTabs | undefined,
  diagnostics?: D1ReadDiagnostics,
): Promise<DashboardRead> {
  const groupings = cards ? cardGroupings(cards) : null;
  return filters.conditions.length > 0
    ? readFilteredDashboard(
        env,
        siteId,
        window,
        interval,
        filters,
        groupings,
        diagnostics,
      )
    : readUnfilteredDashboard(
        env,
        siteId,
        window,
        interval,
        groupings,
        diagnostics,
      );
}
