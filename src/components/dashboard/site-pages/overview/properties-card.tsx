import { useMemo, useState } from "react";
import { Card } from "@insightflare/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@insightflare/ui/select";
import { useQuery } from "@tanstack/react-query";

import { LoadFailedContent } from "@/components/dashboard/common/table-states";
import {
  fetchPropertyKeys,
  fetchPropertyValues,
} from "@/lib/dashboard/client/data/index";
import { filterQueryKey } from "@/lib/dashboard/filter-query-key";
import {
  propertyFilterValue,
  setPropertyFilterValue,
} from "@/lib/dashboard/filter-state";
import { numberFormat } from "@/lib/dashboard/format";
import type { TimeWindow } from "@/lib/dashboard/query-state";
import type {
  PropertyValueSortKey,
  PropertyValueStat,
} from "@/lib/dashboard-api/client/edge";
import type { FilterDocument } from "@/lib/filter-contract/index";
import type { Locale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";

import { visitorsColumn } from "./overview-card-data";
import { ReportCard, type ReportColumn, type ReportTab } from "./report-card";
import type { ReportRow, ReportSortKey } from "./types";

const PROPERTIES_TAB = "properties";
type PropertiesTab = typeof PROPERTIES_TAB;

interface PropertiesCardProps {
  locale: Locale;
  messages: AppMessages;
  siteId: string;
  window: TimeWindow;
  filters: FilterDocument;
  /** The card follows the page's filters, and some are set. */
  filtered: boolean;
}

function propertySort(key: ReportSortKey): PropertyValueSortKey {
  if (
    key === "visitors" ||
    key === "sessions" ||
    key === "views" ||
    key === "events"
  ) {
    return key;
  }
  throw new Error(`property_sort_unsupported:${key}`);
}

function propertyRow(item: PropertyValueStat): ReportRow {
  return {
    key: item.value,
    label: item.value,
    filterValue: item.value,
    views: item.views,
    sessions: item.sessions,
    visitors: item.visitors,
    events: item.events,
    mono: false,
  };
}

/**
 * Custom properties, as in Plausible: the values of one key, picked from
 * the keys of the period, with their visitors. A value counts page views
 * with the property and events with it in their payload; a click filters
 * the page by it. Shown once the period has a property.
 */
export function PropertiesCard({
  locale,
  messages,
  siteId,
  window,
  filters,
  filtered,
}: PropertiesCardProps) {
  const labels = messages.dashboard;
  const filtersKey = useMemo(() => filterQueryKey(filters), [filters]);
  const keys = useQuery({
    queryKey: [
      "dashboard",
      "property-keys",
      siteId,
      window.from,
      window.to,
      window.timeZone,
      filtersKey,
    ],
    queryFn: ({ signal }) =>
      fetchPropertyKeys(siteId, window, filters, { signal }),
    enabled: typeof globalThis.window !== "undefined",
  });
  const [picked, setPicked] = useState<string | null>(null);
  const keyList = useMemo(() => keys.data?.data.items ?? [], [keys.data]);
  // The picked key, else the one the page is filtered by, else the top one.
  const key =
    keyList.find((item) => item.key === picked)?.key ??
    keyList.find((item) => propertyFilterValue(filters, item.key) !== undefined)
      ?.key ??
    keyList[0]?.key ??
    null;
  const columns = useMemo(
    () => [visitorsColumn(locale, messages)],
    [locale, messages],
  );
  const tabs = useMemo((): [ReportTab<PropertiesTab>] | null => {
    if (key === null) return null;
    const format = (value: number) => numberFormat(locale, value);
    const detailColumns: ReportColumn[] = [
      visitorsColumn(locale, messages),
      {
        key: "sessions",
        label: labels.columns.visits,
        getValue: (row) => row.sessions,
        format,
      },
      {
        key: "views",
        label: labels.columns.pageviews,
        getValue: (row) => row.views,
        format,
      },
      {
        key: "events",
        label: labels.columns.events,
        getValue: (row) => row.events ?? 0,
        format,
      },
    ];
    const selected = propertyFilterValue(filters, key);
    return [
      {
        value: PROPERTIES_TAB,
        label: labels.properties.title,
        columnLabel: key,
        load: async (request) => {
          const result = await fetchPropertyValues(
            siteId,
            window,
            key,
            filters,
            {
              limit: request.limit,
              search: request.search,
              sort: propertySort(request.sort.key),
              direction: request.sort.direction,
              signal: request.signal,
            },
          );
          return {
            items: result.data.items.map(propertyRow),
            pagination: { hasMore: false, nextCursor: null },
          };
        },
        renderLabel: (row) => <span className="break-words">{row.label}</span>,
        isSelected: (row) => selected === row.filterValue,
        toggleFilter: (row) =>
          setPropertyFilterValue(
            filters,
            key,
            selected === row.filterValue ? null : row.filterValue,
          ),
        detailColumns,
      },
    ];
  }, [filters, key, labels, locale, messages, siteId, window]);

  if (keys.isError) {
    return (
      <Card className="flex min-h-40 items-center justify-center text-sm text-destructive">
        <LoadFailedContent
          messages={messages}
          onRetry={() => void keys.refetch()}
        />
      </Card>
    );
  }
  if (key === null || tabs === null) return null;

  return (
    <ReportCard
      messages={messages}
      title={labels.properties.title}
      tabs={tabs}
      columns={columns}
      comparison={null}
      requestKey={[
        siteId,
        window.from,
        window.to,
        window.timeZone,
        filtersKey,
        key,
      ].join("|")}
      filtered={filtered}
      tabControls={() => (
        <Select value={key} onValueChange={setPicked}>
          <SelectTrigger
            size="sm"
            className="h-7 max-w-40 gap-1 border-0 px-2 text-xs shadow-none"
            aria-label={labels.properties.key}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {keyList.map((item) => (
              <SelectItem key={item.key} value={item.key}>
                {item.key}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  );
}
