import { resolveDeviceTypeMeta } from "@/components/dashboard/common/client-meta";
import {
  TRAFFIC_CHANNEL_IDS,
  type TrafficChannelId,
} from "@/lib/analytics/traffic-channel-rules";
import { type OverviewTabRows } from "@/lib/dashboard/client/data/index";
import {
  durationFormat,
  numberFormat,
  percentFormat,
} from "@/lib/dashboard/format";
import { loadLocalTablePage } from "@/lib/dashboard/table-loader";
import { decodeUrlDisplayValue } from "@/lib/dashboard/url-display";
import type { DimensionRow } from "@/lib/dashboard-api/client/edge";
import {
  resolveCountryFlagCode,
  resolveCountryLabel,
} from "@/lib/i18n/code-labels";
import type { Locale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";

import {
  DIRECT_REFERRER_FILTER_VALUE,
  resolveGeoCityBreadcrumbData,
  resolveGeoDimensionRowRawValue,
  resolveGeoRegionBreadcrumbData,
} from "./overview-filter-model";
import {
  normalizeDimensionLabel,
  resolveBrowserLogoIconName,
  resolveOsLogoIconName,
} from "./overview-labels";
import { changeRateClass, formatChangeRate } from "./overview-model";
import { sanitizeHostname } from "./overview-url";
import type { ReportColumn, ReportRowsPage } from "./report-card";
import type {
  DeviceTab,
  LocationTab,
  PageTab,
  ReportRow,
  ReportSortKey,
} from "./types";

function metrics(item: {
  views?: number;
  sessions?: number;
  visitors?: number;
}): Pick<ReportRow, "views" | "sessions" | "visitors"> {
  return {
    views: Math.max(0, Number(item.views ?? 0)),
    sessions: Math.max(0, Number(item.sessions ?? 0)),
    visitors: Math.max(0, Number(item.visitors ?? 0)),
  };
}

/** A page of rows held in the browser, sorted and searched there. */
export function loadLocalReportPage(
  rows: readonly OverviewTabRows[number][],
  build: (rows: OverviewTabRows) => ReportRow[],
  request: {
    sort: { key: ReportSortKey; direction: "asc" | "desc" };
    limit: number;
    cursor: string | null;
    search: string;
  },
): ReportRowsPage {
  const built = build([...rows]);
  const key = request.sort.key;
  const page = loadLocalTablePage({
    rows: built,
    sort: {
      key:
        key === "views" || key === "sessions" || key === "visitors"
          ? key
          : "visitors",
      direction: request.sort.direction,
    },
    columns: [
      { key: "views", getValue: (row) => row.views },
      { key: "sessions", getValue: (row) => row.sessions },
      { key: "visitors", getValue: (row) => row.visitors },
    ],
    tab: "local",
    limit: request.limit,
    cursor: request.cursor,
    search: request.search,
    getSearchText: (row) => row.label,
  });
  return { items: [...page.items], pagination: page.pagination };
}

/** The visitors column every card shows. */
export function visitorsColumn(
  locale: Locale,
  messages: AppMessages,
): ReportColumn {
  return {
    key: "visitors",
    label: messages.dashboard.columns.visitors,
    getValue: (row) => row.visitors,
    format: (value) => numberFormat(locale, value),
  };
}

/**
 * The Details view's count columns: visitors, visits and pageviews. Sorting
 * by visits needs every row, which a list loaded page by page doesn't have.
 */
export function countDetailColumns(
  locale: Locale,
  messages: AppMessages,
  { sortableVisits }: { sortableVisits: boolean },
): ReportColumn[] {
  return [
    visitorsColumn(locale, messages),
    {
      key: "sessions",
      label: messages.dashboard.columns.visits,
      getValue: (row) => row.sessions,
      format: (value) => numberFormat(locale, value),
      sortable: sortableVisits,
    },
    {
      key: "views",
      label: messages.dashboard.columns.pageviews,
      getValue: (row) => row.views,
      format: (value) => numberFormat(locale, value),
    },
  ];
}

/** The Pages Details columns: visitors, pageviews, bounce rate, time. */
export function pageDetailColumns(
  locale: Locale,
  messages: AppMessages,
): ReportColumn[] {
  return [
    visitorsColumn(locale, messages),
    {
      key: "views",
      label: messages.dashboard.columns.pageviews,
      getValue: (row) => row.views,
      format: (value) => numberFormat(locale, value),
    },
    {
      key: "bounceRate",
      label: messages.dashboard.columns.bounceRate,
      getValue: (row) => row.bounceRate ?? 0,
      format: (value) => percentFormat(locale, value),
    },
    {
      key: "avgDurationMs",
      label: messages.dashboard.columns.timeOnPage,
      getValue: (row) => row.avgDurationMs ?? 0,
      format: (value) => durationFormat(locale, value),
    },
  ];
}

/** With Compare on: the comparison's visitors, the current ones, the change. */
export function comparisonColumns(
  comparisonLabel: string,
  locale: Locale,
  messages: AppMessages,
): ReportColumn[] {
  return [
    {
      key: "reference",
      label: comparisonLabel,
      getValue: (row) => row.reference?.visitors ?? 0,
      format: (value) => numberFormat(locale, value),
    },
    {
      key: "current",
      label: messages.dashboard.columns.visitors,
      getValue: (row) => row.visitors,
      format: (value) => numberFormat(locale, value),
    },
    {
      key: "change",
      label: messages.common.change,
      getValue: (row) => row.change?.visitors.absolute ?? 0,
      sortValue: (row) => row.change?.visitors.relative ?? Infinity,
      format: (_value, row) => {
        const change = row.change?.visitors;
        if (!change) {
          return <span className="text-muted-foreground">—</span>;
        }
        if (change.relative === null) {
          return (
            <span className={changeRateClass(row.visitors > 0 ? 100 : null)}>
              {row.visitors > 0 ? messages.common.new : "—"}
            </span>
          );
        }
        const percentage = change.relative * 100;
        return (
          <span className={changeRateClass(percentage)}>
            {formatChangeRate(percentage) ?? "0.0%"}
          </span>
        );
      },
    },
  ];
}

export function buildPageRows(
  tab: PageTab,
  items: OverviewTabRows,
): ReportRow[] {
  return items.map((item, index) => {
    const label = String(item.label ?? "").trim() || "/";
    return {
      key: item.key ?? `${tab}-${label}-${index}`,
      label,
      displayLabel: decodeUrlDisplayValue(label),
      filterValue: label,
      ...metrics(item),
      reference: item.reference,
      change: item.change,
      mono: true,
    };
  });
}

export function buildChannelRows(
  items: OverviewTabRows,
  channelLabels: Record<TrafficChannelId, string>,
): ReportRow[] {
  return items.map((item, index) => {
    const raw = String(item.label ?? "").trim();
    const channelId = TRAFFIC_CHANNEL_IDS.includes(raw as TrafficChannelId)
      ? (raw as TrafficChannelId)
      : "other";
    return {
      key: item.key ?? `channel-${channelId}-${index}`,
      label: channelLabels[channelId],
      filterValue: channelId,
      ...metrics(item),
      reference: item.reference,
      change: item.change,
      mono: false,
      channelId,
    };
  });
}

export function buildSourceRows(
  items: OverviewTabRows,
  directLabel: string,
): ReportRow[] {
  return items.map((item, index) => {
    const raw = String(item.label ?? "").trim();
    const domain =
      raw && raw !== DIRECT_REFERRER_FILTER_VALUE ? sanitizeHostname(raw) : "";
    const label = domain || directLabel;
    return {
      key: item.key ?? `domain-${domain || "direct"}-${index}`,
      label,
      displayLabel: decodeUrlDisplayValue(label),
      filterValue: domain || DIRECT_REFERRER_FILTER_VALUE,
      ...metrics(item),
      reference: item.reference,
      change: item.change,
      mono: true,
    };
  });
}

/** The UTM reports answer with a label and no value. */
export function buildUtmRows(
  tab: string,
  rows: readonly DimensionRow[],
  notSetLabel: string,
): ReportRow[] {
  return rows.map((row, index) => {
    const value = (row.value ?? row.label).trim();
    return {
      key: value || `__empty__:${tab}:${index}`,
      label: value || notSetLabel,
      filterValue: value,
      ...metrics(row),
      reference: row.reference,
      change: row.change,
      mono: tab === "term" || tab === "content",
    };
  });
}

export function buildDeviceRows(
  tab: DeviceTab,
  items: OverviewTabRows,
  messages: AppMessages,
): ReportRow[] {
  return items.map((item, index) => {
    const rawValue = String(item.label ?? "");
    const normalized = normalizeDimensionLabel(
      rawValue,
      messages.common.unknown,
    );
    const label =
      tab === "deviceType"
        ? resolveDeviceTypeMeta(
            normalized,
            messages.common.deviceLabels,
            messages.common.unknown,
          ).label
        : normalized;
    return {
      key: item.key ?? `${tab}-${label}-${index}`,
      label,
      filterValue: normalized,
      ...metrics(item),
      reference: item.reference,
      change: item.change,
      mono: false,
      iconName:
        tab === "browser"
          ? resolveBrowserLogoIconName(normalized)
          : tab === "osVersion"
            ? resolveOsLogoIconName(normalized)
            : null,
    };
  });
}

export function buildLocationRows(
  tab: Exclude<LocationTab, "map">,
  items: OverviewTabRows,
  locale: Locale,
  messages: AppMessages,
): ReportRow[] {
  return items.map((item, index) => {
    const value = resolveGeoDimensionRowRawValue(item);
    if (tab === "region") {
      const region = resolveGeoRegionBreadcrumbData(
        value,
        locale,
        messages.common.unknown,
      );
      return {
        key: item.key ?? `${region.displayLabel}-${index}`,
        label: region.displayLabel,
        filterValue: region.filterValue,
        ...metrics(item),
        reference: item.reference,
        change: item.change,
        mono: false,
        regionBreadcrumb: region.breadcrumb,
      };
    }
    if (tab === "city") {
      const city = resolveGeoCityBreadcrumbData(
        value,
        locale,
        messages.common.unknown,
      );
      return {
        key: item.key ?? `${city.displayLabel}-${index}`,
        label: city.displayLabel,
        filterValue: city.filterValue,
        ...metrics(item),
        reference: item.reference,
        change: item.change,
        mono: false,
        cityBreadcrumb: city.breadcrumb ?? undefined,
      };
    }
    const raw = String(item.label ?? "");
    const country = resolveCountryLabel(
      normalizeDimensionLabel(raw, messages.common.unknown),
      locale,
      messages.common.unknown,
    );
    const flagCode = resolveCountryFlagCode(country.code);
    return {
      key: item.key ?? `${country.label}-${index}`,
      label: country.label,
      filterValue: raw.trim() || country.label,
      ...metrics(item),
      reference: item.reference,
      change: item.change,
      mono: false,
      iconName: flagCode ? `flagpack:${flagCode.toLowerCase()}` : null,
    };
  });
}
