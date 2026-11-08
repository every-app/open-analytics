import { useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { CopyrightIcon } from "lucide-react";

import { LoadFailedContent } from "@/components/dashboard/common/table-states";
import {
  type GeoPointsMapCountryCount,
  GeoPointsMapIsland,
  type GeoPointsMapPoint,
} from "@/components/dashboard/geo/geo-points-map-island";
import { fetchOverviewGeoPoints } from "@/lib/dashboard/client/data/index";
import { filterQueryKey } from "@/lib/dashboard/filter-query-key";
import type { TimeWindow } from "@/lib/dashboard/query-state";
import type { FilterDocument } from "@/lib/filter-contract/index";
import type { Locale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";

interface LocationsMapProps {
  locale: Locale;
  messages: AppMessages;
  siteId: string;
  window: TimeWindow;
  filters: FilterDocument;
  selectedCountryCode: string | null;
  onCountrySelect: (countryCode: string | null) => void;
}

/**
 * The Locations card's map: where visits came from, by country. Its code
 * and data load only once the tab is open.
 */
export function LocationsMap({
  locale,
  messages,
  siteId,
  window,
  filters,
  selectedCountryCode,
  onCountrySelect,
}: LocationsMapProps) {
  const filtersKey = useMemo(() => filterQueryKey(filters), [filters]);
  const query = useQuery({
    queryKey: [
      "dashboard",
      "overview-geo-points",
      siteId,
      window.from,
      window.to,
      window.interval,
      window.timeZone,
      filtersKey,
    ],
    queryFn: ({ signal }) =>
      fetchOverviewGeoPoints(siteId, window, filters, { signal }),
    enabled: typeof globalThis.window !== "undefined",
    placeholderData: keepPreviousData,
  });
  const points = useMemo<GeoPointsMapPoint[]>(
    () =>
      (query.data?.data ?? []).map((item) => ({
        latitude: item.latitude,
        longitude: item.longitude,
        country: item.country,
        pointCount: item.pointCount,
      })),
    [query.data?.data],
  );
  const countryCounts = useMemo<GeoPointsMapCountryCount[]>(
    () => query.data?.countryCounts ?? [],
    [query.data?.countryCounts],
  );

  if (query.isError && !query.isFetching) {
    return (
      <div className="flex h-[420px] items-center justify-center text-sm text-destructive">
        <LoadFailedContent
          messages={messages}
          onRetry={() => void query.refetch()}
        />
      </div>
    );
  }
  return (
    <div className="relative">
      <GeoPointsMapIsland
        locale={locale}
        messages={messages}
        loading={query.isPending || query.isPlaceholderData}
        points={points}
        countryCounts={countryCounts}
        selectedCountryCode={selectedCountryCode}
        onCountrySelect={onCountrySelect}
        heightClassName="h-[420px]"
        bordered={false}
      />
      <div className="pointer-events-none absolute right-2 bottom-1 flex items-center gap-1 text-[10px] text-muted-foreground">
        <CopyrightIcon aria-hidden="true" size="1em" />
        <span>OpenStreetMap contributors</span>
        <span aria-hidden="true">·</span>
        <CopyrightIcon aria-hidden="true" size="1em" />
        <span>CARTO</span>
      </div>
    </div>
  );
}
