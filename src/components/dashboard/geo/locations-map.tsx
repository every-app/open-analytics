import { useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { CopyrightIcon } from "lucide-react";

import { LoadFailedContent } from "@/components/dashboard/common/table-states";
import {
  type GeoPointsMapCountryCount,
  GeoPointsMapIsland,
} from "@/components/dashboard/geo/geo-points-map-island";
import type { OverviewTabRows } from "@/lib/dashboard/client/data/index";
import type { Locale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";

/** Where the map's countries come from, and what caches them. */
export interface MapCountries {
  readonly queryKey: readonly unknown[];
  readonly load: (signal: AbortSignal) => Promise<OverviewTabRows>;
}

interface LocationsMapProps {
  locale: Locale;
  messages: AppMessages;
  countries: MapCountries;
  selectedCountryCode: string | null;
  onCountrySelect: (countryCode: string | null) => void;
}

/**
 * The Locations card's map: countries shaded by their visitors, from the
 * countries list. Its code loads only once the tab is open.
 */
export function LocationsMap({
  locale,
  messages,
  countries,
  selectedCountryCode,
  onCountrySelect,
}: LocationsMapProps) {
  const query = useQuery({
    queryKey: countries.queryKey,
    queryFn: ({ signal }) => countries.load(signal),
    enabled: typeof globalThis.window !== "undefined",
    placeholderData: keepPreviousData,
  });
  const countryCounts = useMemo<GeoPointsMapCountryCount[]>(
    () =>
      (query.data ?? []).map((row) => ({
        country: row.value ?? row.label,
        views: row.views,
        sessions: row.sessions,
        visitors: row.visitors,
      })),
    [query.data],
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
        points={[]}
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
