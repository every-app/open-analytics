import { type MouseEvent, useCallback, useMemo, useState } from "react";
import { Clickable } from "@insightflare/ui/clickable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@insightflare/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowUpRightIcon } from "lucide-react";

import {
  DeviceMeta,
  InlineMeta,
} from "@/components/dashboard/common/client-meta";
import { TrafficChannelIcon } from "@/components/dashboard/common/traffic-channel-icon";
import {
  dashboardComparisonLabel,
  useDashboardComparisonQuery,
} from "@/components/dashboard/comparison/use-dashboard-comparison-query";
import { useApplyDashboardFilters } from "@/components/dashboard/filters/use-dashboard-filters";
import {
  LazyGeoCityBreadcrumbLabel,
  LazyGeoRegionBreadcrumbLabel,
} from "@/components/dashboard/geo/lazy-geo-location-label";
import {
  LocationsMap,
  type MapCountries,
} from "@/components/dashboard/geo/locations-map";
import { useDashboardQuery } from "@/components/dashboard/shell/dashboard-query-provider";
import {
  type DashboardListRequestOptions,
  fetchOverviewClientDimensionTab,
  fetchOverviewGeoDimensionTabPage,
  fetchOverviewPageCardTab,
  fetchOverviewSourceCardTab,
  fetchPagesDashboard,
  fetchUtmDimension,
  type OverviewTabRows,
  type UtmDimensionTab,
} from "@/lib/dashboard/client/data/index";
import { filterQueryKey } from "@/lib/dashboard/filter-query-key";
import {
  type DashboardFilterControlKey,
  dashboardFilterValue,
  setDashboardFilterValue,
} from "@/lib/dashboard/filter-state";
import { decodeUrlDisplayValue } from "@/lib/dashboard/url-display";
import type { DashboardCardRowData } from "@/lib/dashboard-api/client/edge";
import {
  DASHBOARD_CARD_ROW_LIMIT,
  DashboardCard,
  DevicesCardTab,
  LocationsCardTab,
  PagesCardTab,
  SourcesCardTab,
} from "@/lib/edge/analytics/contract/dashboard";
import type { FilterDocument } from "@/lib/filter-contract/index";
import type { Locale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";

import type { DashboardLoad } from "./dashboard-load";
import {
  buildChannelRows,
  buildDeviceRows,
  buildLocationRows,
  buildPageRows,
  buildSourceRows,
  buildUtmRows,
  comparisonColumns,
  countDetailColumns,
  loadLocalReportPage,
  pageDetailColumns,
  visitorsColumn,
} from "./overview-card-data";
import {
  canonicalizeGeoFilterValue,
  DIRECT_REFERRER_FILTER_VALUE,
  extractGeoCountryCodeFromFilterValue,
  resolveGeoLocationHighlightValue,
} from "./overview-filter-model";
import {
  LabelWithLeadingIcon,
  LabelWithOptionalIcon,
  resolvePageUrl,
} from "./overview-labels";
import {
  ReportCard,
  type ReportColumn,
  type ReportRowsPage,
  type ReportRowsRequest,
  type ReportTab,
} from "./report-card";
import type {
  DeviceTab,
  LocalCardData,
  LocationTab,
  PageTab,
  ReportRow,
  SourceTab,
} from "./types";
import { UTM_TABS, withUtmTag } from "./utm-tabs";

/** Every country a period can have: the map shades them all. */
const MAP_COUNTRY_LIMIT = 200;

interface OverviewReportCardsProps {
  locale: Locale;
  messages: AppMessages;
  siteId: string;
  siteDomain: string;
  filters: FilterDocument;
  /** The cards follow the page's filters, and some are set. */
  filtered: boolean;
  /** Rows to show instead of fetching them: Realtime's live visits. */
  localData?: LocalCardData;
  /** The page's load, which keeps the cards' tabs and brings their top rows. */
  load?: DashboardLoad;
}

type Loader = (request: ReportRowsRequest) => Promise<ReportRowsPage>;

const UTM_FILTER: Record<UtmDimensionTab, DashboardFilterControlKey> = {
  source: "utmSource",
  medium: "utmMedium",
  campaign: "utmCampaign",
  term: "utmTerm",
  content: "utmContent",
};
const PAGE_FILTER: Record<PageTab, DashboardFilterControlKey> = {
  path: "path",
  entry: "entry",
  exit: "exit",
};
const DEVICE_FILTER: Record<DeviceTab, DashboardFilterControlKey> = {
  browser: "clientBrowser",
  osVersion: "clientOsVersion",
  deviceType: "clientDeviceType",
};

/** Each card tab as the dashboard load names it. */
const UTM_SOURCES_TAB: Record<UtmDimensionTab, SourcesCardTab> = {
  source: SourcesCardTab.UtmSource,
  medium: SourcesCardTab.UtmMedium,
  campaign: SourcesCardTab.UtmCampaign,
  term: SourcesCardTab.UtmTerm,
  content: SourcesCardTab.UtmContent,
};
const PAGES_TAB: Record<PageTab, PagesCardTab> = {
  path: PagesCardTab.Path,
  entry: PagesCardTab.Entry,
  exit: PagesCardTab.Exit,
};
const LOCATIONS_TAB: Record<LocationTab, LocationsCardTab> = {
  map: LocationsCardTab.Map,
  country: LocationsCardTab.Country,
  region: LocationsCardTab.Region,
  city: LocationsCardTab.City,
};
const DEVICES_TAB: Record<DeviceTab, DevicesCardTab> = {
  browser: DevicesCardTab.Browser,
  osVersion: DevicesCardTab.OsVersion,
  deviceType: DevicesCardTab.DeviceType,
};

/** The UTM parameter a campaign tab lists by; null for the other tabs. */
function utmParamOf(tab: SourcesCardTab): UtmDimensionTab | null {
  return UTM_TABS.find((param) => UTM_SOURCES_TAB[param] === tab) ?? null;
}

function sourceTabOf(tab: SourcesCardTab): SourceTab {
  if (tab === SourcesCardTab.Channel) return "channel";
  if (tab === SourcesCardTab.Domain) return "domain";
  return "campaigns";
}

/** A card's top rows, which the dashboard load can bring along. */
export function isTopRowsRequest(request: ReportRowsRequest): boolean {
  return (
    request.limit === DASHBOARD_CARD_ROW_LIMIT &&
    request.cursor === null &&
    request.search === "" &&
    request.sort.key === "visitors" &&
    request.sort.direction === "desc" &&
    request.comparison === null
  );
}

/** The list request for one of the remote reports. */
function listOptions(request: ReportRowsRequest): DashboardListRequestOptions {
  const key = request.sort.key;
  return {
    limit: request.limit,
    cursor: request.cursor,
    search: request.search,
    sort: key === "views" ? "views" : "visitors",
    direction: request.sort.direction,
    comparison: request.comparison,
    comparisonMetric: request.comparison ? "visitors" : undefined,
    comparisonSortBy:
      key === "current" || key === "reference" || key === "change"
        ? key
        : undefined,
    signal: request.signal,
  };
}

function page(
  items: ReportRow[],
  pagination: ReportRowsPage["pagination"],
): ReportRowsPage {
  return { items, pagination };
}

/** A tab's loader: the local rows when given, else the report's request. */
function loaderFor(
  local: OverviewTabRows | undefined,
  build: (rows: OverviewTabRows) => ReportRow[],
  remote: Loader,
): Loader {
  return (request) =>
    local
      ? Promise.resolve(loadLocalReportPage(local, build, request))
      : remote(request);
}

/** Filters by a card value: a row selects it, a second click clears it. */
function controlFilter(
  filters: FilterDocument,
  key: DashboardFilterControlKey,
) {
  const isSelected = (row: ReportRow) =>
    dashboardFilterValue(filters, key) === row.filterValue;
  return {
    isSelected,
    toggleFilter: (row: ReportRow) =>
      setDashboardFilterValue(
        filters,
        key,
        isSelected(row) ? null : row.filterValue,
      ),
  };
}

/** A location filter holds country, region and city together. */
function locationFilter(
  filters: FilterDocument,
  tab: Exclude<LocationTab, "map">,
) {
  const isSelected = (row: ReportRow) =>
    resolveGeoLocationHighlightValue(
      tab,
      canonicalizeGeoFilterValue(dashboardFilterValue(filters, "geo")),
    ) === row.filterValue;
  return {
    isSelected,
    toggleFilter: (row: ReportRow) =>
      setDashboardFilterValue(
        filters,
        "geo",
        isSelected(row) ? null : canonicalizeGeoFilterValue(row.filterValue),
      ),
  };
}

function openInNewTab(url: string, event: MouseEvent<HTMLElement>) {
  event.stopPropagation();
  globalThis.window.open(url, "_blank", "noopener,noreferrer");
}

function MonoLabel({ row }: { row: ReportRow }) {
  return (
    <span className={cn("break-words", row.mono && "font-mono")}>
      {row.displayLabel ?? row.label}
    </span>
  );
}

function PageLabel({
  row,
  siteDomain,
  messages,
}: {
  row: ReportRow;
  siteDomain: string;
  messages: AppMessages;
}) {
  const url = resolvePageUrl(row.label, siteDomain);
  const label = row.displayLabel ?? row.label;
  return (
    <span className="inline-flex items-center gap-2 break-words font-mono">
      <span className="break-words">{label}</span>
      {url ? (
        <Clickable
          className="inline-flex text-muted-foreground opacity-0 transition-opacity duration-150 group-hover/row:opacity-100 focus-visible:opacity-100 hover:text-foreground"
          onClick={(event) => openInNewTab(url, event)}
          aria-label={`${messages.common.open}: ${label}`}
        >
          <ArrowUpRightIcon size="1.4em" />
        </Clickable>
      ) : null}
    </span>
  );
}

function LocationLabel({ row, locale }: { row: ReportRow; locale: Locale }) {
  if (row.regionBreadcrumb) {
    return (
      <LazyGeoRegionBreadcrumbLabel locale={locale} {...row.regionBreadcrumb} />
    );
  }
  if (row.cityBreadcrumb) {
    return (
      <LazyGeoCityBreadcrumbLabel locale={locale} {...row.cityBreadcrumb} />
    );
  }
  return <LabelWithLeadingIcon label={row.label} iconName={row.iconName} />;
}

function pageDetailRows(
  items: Awaited<ReturnType<typeof fetchPagesDashboard>>["data"]["items"],
): ReportRow[] {
  return items.map((item) => ({
    key: item.pathname,
    label: item.pathname,
    displayLabel: decodeUrlDisplayValue(item.pathname),
    filterValue: item.pathname,
    views: item.metrics.views,
    sessions: item.metrics.sessions,
    visitors: item.metrics.visitors,
    bounceRate: item.metrics.bounceRate,
    avgDurationMs: item.metrics.avgDurationMs,
    scrollDepth: item.scrollDepth,
    mono: true,
  }));
}

/**
 * The dashboard's four cards, in Plausible's arrangement: Sources and Pages,
 * then Locations and Devices.
 */
export function OverviewReportCards({
  locale,
  messages,
  siteId,
  siteDomain,
  filters,
  filtered,
  localData,
  load,
}: OverviewReportCardsProps) {
  const { window } = useDashboardQuery();
  const applyFilters = useApplyDashboardFilters();
  const queryClient = useQueryClient();
  const [pickedUtmParam, setPickedUtmParam] = useState<UtmDimensionTab>(
    UTM_TABS[0],
  );
  const utmParam =
    (load && utmParamOf(load.tabs[DashboardCard.Sources])) ?? pickedUtmParam;
  const pickUtmParam = (param: UtmDimensionTab) => {
    setPickedUtmParam(param);
    load?.setTabs({
      ...load.tabs,
      [DashboardCard.Sources]: UTM_SOURCES_TAB[param],
    });
  };
  /**
   * A tab's loader that reads the card's top rows from the dashboard load
   * when it brought this tab's, and makes its own request otherwise.
   */
  const fromLoad = useCallback(
    (
      card: DashboardCard,
      tab: string,
      build: (rows: DashboardCardRowData[]) => ReportRow[],
      own: Loader,
    ): Loader =>
      async (request) => {
        if (!load || load.cards?.[card] !== tab || !isTopRowsRequest(request)) {
          return own(request);
        }
        const data = await queryClient.ensureQueryData(load.query);
        if (!data.cards) throw new Error("dashboard_cards_missing");
        return page(build(data.cards[card]), {
          hasMore: false,
          nextCursor: null,
        });
      },
    [load, queryClient],
  );
  const liveComparison = useDashboardComparisonQuery(window, filters);
  const comparison = localData ? null : liveComparison;
  const labels = messages.dashboard;
  const filtersKey = useMemo(() => filterQueryKey(filters), [filters]);
  const requestKey = [
    siteId,
    window.from,
    window.to,
    window.timeZone,
    filtersKey,
    comparison
      ? `${comparison.mode}:${comparison.window.from}:${comparison.window.to}:${filterQueryKey(comparison.filters)}`
      : "none",
    localData ? JSON.stringify(localData) : "remote",
  ].join("|");
  const cardColumns = useMemo<readonly ReportColumn[]>(
    () =>
      comparison
        ? comparisonColumns(
            dashboardComparisonLabel(messages, comparison),
            locale,
            messages,
          )
        : [visitorsColumn(locale, messages)],
    [comparison, locale, messages],
  );
  const countColumns = useMemo(
    () =>
      countDetailColumns(locale, messages, {
        sortableVisits: Boolean(localData),
      }),
    [locale, localData, messages],
  );

  const sourceTabs = useMemo((): [
    ReportTab<SourceTab>,
    ...ReportTab<SourceTab>[],
  ] => {
    const channelLabels = messages.overview.channelLabels;
    const domainTab: ReportTab<SourceTab> = {
      value: "domain",
      label: labels.tabs.sources,
      columnLabel: labels.columns.source,
      load: loaderFor(
        localData?.source.domain,
        (rows) => buildSourceRows(rows, messages.overview.direct),
        fromLoad(
          DashboardCard.Sources,
          SourcesCardTab.Domain,
          (rows) => buildSourceRows(rows, messages.overview.direct),
          async (request) => {
            const result = await fetchOverviewSourceCardTab(
              siteId,
              window,
              "domain",
              filters,
              listOptions(request),
            );
            return page(
              buildSourceRows(result.items, messages.overview.direct),
              result.pagination,
            );
          },
        ),
      ),
      renderLabel: (row) =>
        row.filterValue === DIRECT_REFERRER_FILTER_VALUE ? (
          <InlineMeta
            icon={<TrafficChannelIcon channel="direct" />}
            label={row.label}
          />
        ) : (
          <span className="font-mono">
            <LabelWithOptionalIcon
              label={row.displayLabel ?? row.label}
              showIcon
              unknownLabel={messages.overview.direct}
            />
          </span>
        ),
      ...controlFilter(filters, "sourceDomain"),
      detailColumns: countColumns,
    };
    if (localData) return [domainTab];
    const channelTab: ReportTab<SourceTab> = {
      value: "channel",
      label: labels.tabs.channels,
      columnLabel: labels.columns.channel,
      load: fromLoad(
        DashboardCard.Sources,
        SourcesCardTab.Channel,
        (rows) => buildChannelRows(rows, channelLabels),
        async (request) => {
          const result = await fetchOverviewSourceCardTab(
            siteId,
            window,
            "channel",
            filters,
            listOptions(request),
          );
          return page(
            buildChannelRows(result.items, channelLabels),
            result.pagination,
          );
        },
      ),
      renderLabel: (row) =>
        row.channelId ? (
          <InlineMeta
            icon={<TrafficChannelIcon channel={row.channelId} />}
            label={row.label}
          />
        ) : (
          row.label
        ),
      ...controlFilter(filters, "channel"),
      detailColumns: countColumns,
    };
    // One Campaigns tab lists by the UTM parameter picked beside it.
    const campaignsTab: ReportTab<SourceTab> = {
      value: "campaigns",
      label: labels.tabs.campaigns,
      columnLabel: labels.tabs.utm[utmParam],
      load: fromLoad(
        DashboardCard.Sources,
        UTM_SOURCES_TAB[utmParam],
        (rows) => buildUtmRows(utmParam, rows, labels.notSet),
        async (request) => {
          const result = await fetchUtmDimension(
            siteId,
            window,
            utmParam,
            withUtmTag(filters, utmParam),
            listOptions(request),
          );
          return page(
            buildUtmRows(utmParam, result.items, labels.notSet),
            result.pagination,
          );
        },
      ),
      renderLabel: (row) => <MonoLabel row={row} />,
      ...controlFilter(filters, UTM_FILTER[utmParam]),
      detailColumns: countColumns,
    };
    return [channelTab, domainTab, campaignsTab];
  }, [
    countColumns,
    filters,
    fromLoad,
    labels,
    localData,
    messages,
    siteId,
    utmParam,
    window,
  ]);

  const pageTabs = useMemo((): [
    ReportTab<PageTab>,
    ...ReportTab<PageTab>[],
  ] => {
    const tab = (
      value: PageTab,
      label: string,
      columnLabel: string,
    ): ReportTab<PageTab> => ({
      value,
      label,
      columnLabel,
      load: loaderFor(
        localData?.page[value],
        (rows) => buildPageRows(value, rows),
        fromLoad(
          DashboardCard.Pages,
          PAGES_TAB[value],
          (rows) => buildPageRows(value, rows),
          async (request) => {
            const result = await fetchOverviewPageCardTab(
              siteId,
              window,
              value,
              filters,
              listOptions(request),
            );
            return page(buildPageRows(value, result.items), result.pagination);
          },
        ),
      ),
      renderLabel: (row) => (
        <PageLabel row={row} siteDomain={siteDomain} messages={messages} />
      ),
      ...controlFilter(filters, PAGE_FILTER[value]),
      detailColumns: countColumns,
    });
    const topPages: ReportTab<PageTab> = {
      ...tab("path", labels.tabs.topPages, labels.columns.page),
      // The whole list carries the Pages report's per-page metrics.
      ...(localData
        ? {}
        : {
            loadDetails: async (request: ReportRowsRequest) => {
              const key = request.sort.key;
              const result = await fetchPagesDashboard(
                siteId,
                window,
                filters,
                {
                  cursor: request.cursor,
                  limit: request.limit,
                  search: request.search,
                  sort:
                    key === "views" ||
                    key === "bounceRate" ||
                    key === "avgDurationMs" ||
                    key === "scrollDepth"
                      ? key
                      : "visitors",
                  direction: request.sort.direction,
                  signal: request.signal,
                },
              );
              return page(
                pageDetailRows(result.data.items),
                result.data.pagination,
              );
            },
            detailColumns: pageDetailColumns(locale, messages),
          }),
    };
    return [
      topPages,
      tab("entry", labels.tabs.entryPages, labels.columns.entryPage),
      tab("exit", labels.tabs.exitPages, labels.columns.exitPage),
    ];
  }, [
    countColumns,
    filters,
    fromLoad,
    labels,
    localData,
    locale,
    messages,
    siteDomain,
    siteId,
    window,
  ]);

  const locationTabs = useMemo((): [
    ReportTab<LocationTab>,
    ...ReportTab<LocationTab>[],
  ] => {
    const tab = (
      value: Exclude<LocationTab, "map">,
      label: string,
      columnLabel: string,
    ): ReportTab<LocationTab> => ({
      value,
      label,
      columnLabel,
      load: loaderFor(
        localData?.geo[value],
        (rows) => buildLocationRows(value, rows, locale, messages),
        fromLoad(
          DashboardCard.Locations,
          LOCATIONS_TAB[value],
          (rows) => buildLocationRows(value, rows, locale, messages),
          async (request) => {
            const result = await fetchOverviewGeoDimensionTabPage(
              siteId,
              window,
              value,
              filters,
              listOptions(request),
            );
            return page(
              buildLocationRows(value, result.items, locale, messages),
              result.pagination,
            );
          },
        ),
      ),
      renderLabel: (row, source) =>
        source === "search" ? (
          <LabelWithLeadingIcon label={row.label} iconName={row.iconName} />
        ) : (
          <LocationLabel row={row} locale={locale} />
        ),
      ...locationFilter(filters, value),
      detailColumns: countColumns,
    });
    return [
      tab("country", labels.tabs.countries, labels.columns.country),
      tab("region", labels.tabs.regions, labels.columns.region),
      tab("city", labels.tabs.cities, labels.columns.city),
    ];
  }, [
    countColumns,
    filters,
    fromLoad,
    labels,
    localData,
    locale,
    messages,
    siteId,
    window,
  ]);

  const deviceTabs = useMemo((): [
    ReportTab<DeviceTab>,
    ...ReportTab<DeviceTab>[],
  ] => {
    const tab = (
      value: DeviceTab,
      label: string,
      columnLabel: string,
    ): ReportTab<DeviceTab> => ({
      value,
      label,
      columnLabel,
      load: loaderFor(
        localData?.client[value],
        (rows) => buildDeviceRows(value, rows, messages),
        fromLoad(
          DashboardCard.Devices,
          DEVICES_TAB[value],
          (rows) => buildDeviceRows(value, rows, messages),
          async (request) => {
            const result = await fetchOverviewClientDimensionTab(
              siteId,
              window,
              value,
              filters,
              listOptions(request),
            );
            return page(
              buildDeviceRows(value, result.items, messages),
              result.pagination,
            );
          },
        ),
      ),
      renderLabel: (row) =>
        value === "deviceType" ? (
          <DeviceMeta
            deviceType={row.filterValue}
            deviceLabels={messages.common.deviceLabels}
            unknownLabel={messages.common.unknown}
          />
        ) : (
          <LabelWithLeadingIcon label={row.label} iconName={row.iconName} />
        ),
      ...controlFilter(filters, DEVICE_FILTER[value]),
      detailColumns: countColumns,
    });
    return [
      tab("browser", labels.tabs.browsers, labels.columns.browser),
      tab(
        "osVersion",
        labels.tabs.operatingSystems,
        labels.columns.operatingSystem,
      ),
      tab("deviceType", labels.tabs.devices, labels.columns.device),
    ];
  }, [
    countColumns,
    filters,
    fromLoad,
    labels,
    localData,
    messages,
    siteId,
    window,
  ]);

  const selectedCountry = extractGeoCountryCodeFromFilterValue(
    dashboardFilterValue(filters, "geo") ?? null,
  );
  const mapCountries: MapCountries | null = load
    ? load.cards?.[DashboardCard.Locations] === LocationsCardTab.Map
      ? {
          queryKey: [...load.query.queryKey, "map"],
          load: async () => {
            const data = await queryClient.ensureQueryData(load.query);
            if (!data.cards) throw new Error("dashboard_cards_missing");
            return data.cards[DashboardCard.Locations];
          },
        }
      : {
          queryKey: [
            "dashboard",
            "overview-map-countries",
            siteId,
            window.from,
            window.to,
            window.timeZone,
            filtersKey,
          ],
          load: async (signal) =>
            (
              await fetchOverviewGeoDimensionTabPage(
                siteId,
                window,
                "country",
                filters,
                {
                  limit: MAP_COUNTRY_LIMIT,
                  sort: "visitors",
                  direction: "desc",
                  signal,
                },
              )
            ).items,
        }
    : null;
  const mapTab = mapCountries
    ? [
        {
          value: "map" as const,
          label: labels.tabs.map,
          content: (
            <LocationsMap
              locale={locale}
              messages={messages}
              countries={mapCountries}
              selectedCountryCode={selectedCountry}
              onCountrySelect={(country) =>
                applyFilters(
                  setDashboardFilterValue(
                    filters,
                    "geo",
                    country && country !== selectedCountry ? country : null,
                  ),
                )
              }
            />
          ),
        },
      ]
    : [];
  const shared = {
    messages,
    columns: cardColumns,
    comparison,
    requestKey,
    filtered,
    details: !localData,
  };

  return (
    <section className="grid items-stretch gap-6 xl:grid-cols-2">
      <div className="min-w-0">
        <ReportCard
          {...shared}
          requestKey={`${requestKey}|${utmParam}`}
          title={labels.cards.sources}
          tabs={sourceTabs}
          {...(load && {
            activeTab: sourceTabOf(load.tabs[DashboardCard.Sources]),
            onActiveTabChange: (tab: SourceTab) =>
              load.setTabs({
                ...load.tabs,
                [DashboardCard.Sources]:
                  tab === "campaigns"
                    ? UTM_SOURCES_TAB[utmParam]
                    : tab === "channel"
                      ? SourcesCardTab.Channel
                      : SourcesCardTab.Domain,
              }),
          })}
          tabControls={(tab) =>
            tab === "campaigns" ? (
              <Select
                value={utmParam}
                onValueChange={(value) =>
                  pickUtmParam(value as UtmDimensionTab)
                }
              >
                <SelectTrigger
                  size="sm"
                  className="h-7 gap-1 border-0 px-2 text-xs shadow-none"
                  aria-label={labels.tabs.campaigns}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  {UTM_TABS.map((param) => (
                    <SelectItem key={param} value={param}>
                      {labels.tabs.utm[param]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null
          }
        />
      </div>
      <div className="min-w-0">
        <ReportCard
          {...shared}
          title={labels.cards.pages}
          tabs={pageTabs}
          {...(load && {
            activeTab: load.tabs[DashboardCard.Pages],
            onActiveTabChange: (tab: PageTab) =>
              load.setTabs({
                ...load.tabs,
                [DashboardCard.Pages]: PAGES_TAB[tab],
              }),
          })}
        />
      </div>
      <div className="min-w-0">
        <ReportCard
          {...shared}
          title={labels.cards.locations}
          tabs={locationTabs}
          extraTabs={mapTab}
          {...(load && {
            activeTab: load.tabs[DashboardCard.Locations],
            onActiveTabChange: (tab: LocationTab) =>
              load.setTabs({
                ...load.tabs,
                [DashboardCard.Locations]: LOCATIONS_TAB[tab],
              }),
          })}
        />
      </div>
      <div className="min-w-0">
        <ReportCard
          {...shared}
          title={labels.cards.devices}
          tabs={deviceTabs}
          {...(load && {
            activeTab: load.tabs[DashboardCard.Devices],
            onActiveTabChange: (tab: DeviceTab) =>
              load.setTabs({
                ...load.tabs,
                [DashboardCard.Devices]: DEVICES_TAB[tab],
              }),
          })}
        />
      </div>
    </section>
  );
}
